import React, { useState, useEffect, useContext } from 'react';
import api from './api';
import BookingModal from './BookingModal';
import { SocketContext } from './App';

const STATUS_COLORS = {
  green:   { bg: 'rgba(72,196,17,0.25)', border: '#11c411' },
  yellow:  { bg: 'rgba(255,255,0,0.25)', border: '#ffc800' },
  orange:  { bg: 'rgba(255,165,0,0.25)', border: '#ff8c00' },
  red:     { bg: 'rgba(236,30,30,0.35)', border: '#dc1414' },
};

const DEFAULT_MAX_SLOTS = 5;

export default function CalendarViewNew({ addNotification, compact = false }) {
  const [events, setEvents] = useState([]);
  const [dateMap, setDateMap] = useState({});
  const [modalData, setModalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const socket = useContext(SocketContext);

  const fetchAllEvents = async () => {
    const [bookingsRes, eventsRes] = await Promise.all([
      api.bookings.list(),
      api.events.list()
    ]);

    const bookingEvents = (bookingsRes.data || []).map(b => ({
      id: b.id,
      date: b.date,
      title: `${b.service_type} — ${b.user_name}`,
      extendedProps: b
    }));

    const adminEvents = (eventsRes.data || []).map(e => ({
      id: `event-${e.id}`,
      date: e.date,
      title: e.title,
      extendedProps: e
    }));

    setEvents([...bookingEvents, ...adminEvents]);
  };

  const fetchCalendar = async () => {
    const res = await api.calendar.get();
    setDateMap(res.data || {});
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchAllEvents(), fetchCalendar()]);
      setLoading(false);
    };

    load();

    const refresh = () => {
      fetchAllEvents();
      fetchCalendar();
    };

    socket.on('new_booking', refresh);
    socket.on('booking_deleted', refresh);
    socket.on('calendar_config_updated', refresh);
    socket.on('event_added', refresh);
    socket.on('event_deleted', refresh);

    return () => {
      socket.off('new_booking', refresh);
      socket.off('booking_deleted', refresh);
      socket.off('calendar_config_updated', refresh);
      socket.off('event_added', refresh);
      socket.off('event_deleted', refresh);
    };
  }, [socket]);

  const formatDate = (y, m, d) =>
    `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const calendarDays = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1)
  ];

  const getStatus = (date) => {
    const max = dateMap[date]?.max_slots || DEFAULT_MAX_SLOTS;
    const booked = dateMap[date]?.booked || 0;
    const remaining = max - booked;

    if (remaining <= 0) return 'red';
    if (remaining <= 1) return 'orange';
    if (remaining <= Math.ceil(max * 0.6)) return 'yellow';
    return 'green';
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 40 }}>Loading calendar…</div>;
  }

  return (
    <div>
      {!compact && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <button onClick={() => setCurrentDate(new Date(year, month - 1))}>◀</button>
          <strong>
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </strong>
          <button onClick={() => setCurrentDate(new Date(year, month + 1))}>▶</button>
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 6
      }}>
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
          <div key={d} style={{ fontWeight: 700, textAlign: 'center' }}>{d}</div>
        ))}

        {calendarDays.map((day, i) => {
          if (!day) return <div key={i} />;

          const dateStr = formatDate(year, month, day);
          const status = getStatus(dateStr);

          return (
            <div
              key={dateStr}
              onClick={() => !compact && setModalData({
                date: dateStr,
                events: events.filter(e => e.date === dateStr)
              })}
              style={{
                padding: 10,
                minHeight: 70,
                cursor: compact ? 'default' : 'pointer',
                background: STATUS_COLORS[status].bg,
                border: `2px solid ${STATUS_COLORS[status].border}`,
                borderRadius: 8
              }}
            >
              <div style={{ fontWeight: 700 }}>{day}</div>
            </div>
          );
        })}
      </div>

      {modalData && (
        <BookingModal
          data={modalData}
          onClose={() => setModalData(null)}
          addNotification={addNotification}
        />
      )}
    </div>
  );
}
