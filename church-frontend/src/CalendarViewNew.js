import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import api from './api';
import BookingModal from './BookingModal';
import { SocketContext } from './App';

const STATUS_COLORS = {
  green:  { bg: 'rgba(72,196,17,0.15)', border: '#11c411' },
  yellow: { bg: 'rgba(255,255,0,0.15)', border: '#eeff00' },
  orange: { bg: 'rgba(255,165,0,0.15)', border: '#ff8c00' },
  red:    { bg: 'rgba(236,30,30,0.2)', border: '#dc1414' },
  gray:   { bg: 'rgba(160,174,192,0.35)', border: '#718096' },
};

const DEFAULT_MAX_SLOTS = 5;

export default function CalendarViewNew({
  bookings = [],
  calendarBookings = null,
  events = [],
  calendarConfig = {},
  user,
  isAdmin = false,
  addNotification,
  compact = false
}) {
  const socket = useContext(SocketContext);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [modalDate, setModalDate] = useState(null);
  const [modalEvents, setModalEvents] = useState([]);
  const [modalMode, setModalMode] = useState('list');
  const [dateMap, setDateMap] = useState({});
  const [allSlots, setAllSlots] = useState([]);

  /* ---------------------------
     SYNC CONFIG ONLY (max slots)
  --------------------------- */
  useEffect(() => {
    setDateMap(calendarConfig || {});
  }, [calendarConfig]);

  useEffect(() => {
    if (calendarBookings) {
      setAllSlots(calendarBookings);
    }
  }, [calendarBookings]);
 
  useEffect(() => {
    const intervalId = setInterval(() => {
      refreshCalendar();
      refreshSlots();
    }, 1000);
 
    return () => clearInterval(intervalId);
  }, []);

  /* ---------------------------
     SOCKET REFRESH
  --------------------------- */
  const refreshCalendar = useCallback(async () => {
    try {
      const res = await api.calendar.get();
      setDateMap(res.data || {});
    } catch (err) {
      console.error('Calendar refresh failed', err);
    }
  }, []);

  const refreshSlots = useCallback(async () => {
    try {
      const res = await api.bookings.slots();
      setAllSlots(res.data || []);
    } catch (err) {
      // ignore slot refresh errors
    }
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('new_booking', refreshCalendar);
    socket.on('booking_updated', refreshCalendar);
    socket.on('booking_deleted', refreshCalendar);
    socket.on('calendar_config_updated', refreshCalendar);
    socket.on('new_booking', refreshSlots);
    socket.on('booking_updated', refreshSlots);
    socket.on('booking_deleted', refreshSlots);
    return () => {
      socket.off('new_booking', refreshCalendar);
      socket.off('booking_updated', refreshCalendar);
      socket.off('booking_deleted', refreshCalendar);
      socket.off('calendar_config_updated', refreshCalendar);
      socket.off('new_booking', refreshSlots);
      socket.off('booking_updated', refreshSlots);
      socket.off('booking_deleted', refreshSlots);
    };
  }, [socket, refreshCalendar, refreshSlots]);

  useEffect(() => {
    if (!calendarBookings) {
      refreshSlots();
    }
  }, [calendarBookings, refreshSlots]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      refreshCalendar();
      refreshSlots();
    }, 10000);

    return () => clearInterval(intervalId);
  }, [refreshCalendar, refreshSlots]);

  /* ---------------------------
     DATE HELPERS
  --------------------------- */
  const formatDate = (y, m, d) =>
    `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const calendarDays = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const bookingSource = allSlots || calendarBookings || bookings;

  const bookingsByDate = useMemo(() => {
    const map = {};
    bookingSource.forEach(b => {
      if (!b?.date) return;
      map[b.date] = (map[b.date] || 0) + 1;
    });
    return map;
  }, [bookingSource]);

  /* ---------------------------
     STATUS LOGIC
     bookings are computed LIVE
  --------------------------- */
  const getLoadStatus = (date) => {
    const max = dateMap[date]?.max_slots ?? DEFAULT_MAX_SLOTS;
    const booked = bookingsByDate[date] || 0;
    if (booked >= max) return 'red';
    if (booked <= 0) return 'green';
    if (booked <= max / 4) return 'yellow';
    return 'orange';
  };

  /* ---------------------------
     MODAL
  --------------------------- */
  const openModal = (date) => {
    const ownBookings = bookings
      .filter(b => b.date === date)
      .map(b => ({ ...b, _type: 'booking', _isOwner: true }));

    const eventItems = events
      .filter(e => e.date === date)
      .map(e => ({ ...e, _type: 'event' }));

    const modalItems = isAdmin
      ? [
          ...eventItems,
          ...bookings.filter(b => b.date === date).map(b => ({ ...b, _type: 'booking' }))
        ]
      : [...eventItems, ...ownBookings];

    setModalDate(date);
    setModalEvents(modalItems);
    setModalMode('list');
  };

  const handleBooked = async () => {
    await refreshCalendar();
    addNotification?.({
      type: 'success',
      text: `Booking request submitted for ${modalDate}`,
    });
    setModalMode('list');
  };

  const handleCancelled = async () => {
    await refreshCalendar();
    addNotification?.({
      type: 'info',
      text: `Booking cancelled on ${modalDate}`,
    });
    setModalMode('list');
  };

  /* ---------------------------
     RENDER
  --------------------------- */
  return (
    <div style={{
      background: 'rgba(255,255,255,0.6)',
      padding: 20,
      borderRadius: 14,
    }}>
      {!compact && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <button onClick={() => setCurrentDate(new Date(year, month - 1))}>◀</button>
          <strong>{currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</strong>
          <button onClick={() => setCurrentDate(new Date(year, month + 1))}>▶</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
          <div key={d} style={{ fontWeight: 700, textAlign: 'center' }}>{d}</div>
        ))}

        {calendarDays.map((day, i) => {
          if (!day) return <div key={i} />;
          const dateStr = formatDate(year, month, day);
          const status = getLoadStatus(dateStr);
          const isFuture = new Date(dateStr) >= new Date().setHours(0,0,0,0);
          const max = dateMap[dateStr]?.max_slots ?? DEFAULT_MAX_SLOTS;
          const booked = bookingsByDate[dateStr] || 0;
          const isClosed = max <= 0;
          const isSelectable = isFuture && !isClosed;
          const palette = isSelectable ? STATUS_COLORS[status] : STATUS_COLORS.gray;

          return (
            <div
              key={dateStr}
              onClick={() => isSelectable && !compact && openModal(dateStr)}
              style={{
                padding: 10,
                minHeight: 80,
                cursor: isSelectable ? 'pointer' : 'not-allowed',
                background: palette.bg,
                border: `2px solid ${palette.border}`,
                borderRadius: 10,
                opacity: isSelectable ? 1 : 0.4,
              }}
            >
              <div style={{ fontWeight: 700 }}>{day}</div>
              {!compact && (
                <div style={{ fontSize: 12, marginTop: 6 }}>
                  {booked}/{max} booked
                </div>
              )}
            </div>
          );
        })}
      </div>

      {modalDate && (
        <BookingModal
          date={modalDate}
          events={modalEvents}
          mode={modalMode}
          onClose={() => setModalDate(null)}
          onBooked={handleBooked}
          onCancelled={handleCancelled}
          canCancel={!isAdmin}
        />
      )}
    </div>
  );
}
