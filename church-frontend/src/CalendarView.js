import React, { useState, useEffect, useContext } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import api from './api';
import BookingModal from './BookingModal';
import { SocketContext } from './App';

export default function CalendarView({ addNotification, compact = false }) {
  const [events, setEvents] = useState([]);
  const [dateMap, setDateMap] = useState({});
  const [modalData, setModalData] = useState(null); // { type: 'new' | 'view', date?, event? }
  const socket = useContext(SocketContext);

  const fetchBookings = async () => {
    try {
      const res = await api.bookings.list();
      const ev = res.data.map(b => ({
        id: b.id,
        title: `${b.service_type} — ${b.user_name}`,
        start: `${b.date}T${b.time_slot.split('-')[0]}`,
        extendedProps: {
          serviceType: b.service_type,
          userName: b.user_name,
          date: b.date,
          timeSlot: b.time_slot,
          notes: b.notes || ''
        }
      }));
      setEvents(ev);
    } catch (e) { console.error(e); }
  };

  const fetchCalendar = async () => {
    try {
      const res = await api.calendar.get();
      setDateMap(res.data || {});
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchBookings();
    fetchCalendar();

    const handleNewBooking = () => { fetchBookings(); fetchCalendar(); };
    const handleBookingDeleted = () => { fetchBookings(); fetchCalendar(); };
    const handleConfigUpdated = () => fetchCalendar();

    socket.on('new_booking', handleNewBooking);
    socket.on('booking_deleted', handleBookingDeleted);
    socket.on('calendar_config_updated', handleConfigUpdated);

    return () => {
      socket.off('new_booking', handleNewBooking);
      socket.off('booking_deleted', handleBookingDeleted);
      socket.off('calendar_config_updated', handleConfigUpdated);
    };
  }, [socket]);

  const handleDateClick = (arg) => setModalData({ type: 'new', date: arg.dateStr });
  const handleEventClick = (clickInfo) => setModalData({ type: 'view', event: clickInfo.event.extendedProps });

  const bgEvents = Object.entries(dateMap).map(([date, info]) => {
    const full = info.booked >= info.max_slots;
    return {
      id: `bg-${date}`,
      start: date,
      display: 'background',
      allDay: true,
      backgroundColor: full ? 'rgba(245,101,101,0.25)' : 'rgba(72,187,120,0.25)',
      borderColor: full ? 'rgba(245,101,101,0.5)' : 'rgba(72,187,120,0.5)'
    };
  });

  return (
    <div style={!compact ? { background:'white', padding:'24px', borderRadius:'12px', boxShadow:'0 2px 8px rgba(0,0,0,0.05)', marginBottom:'24px' } : {}}>
      {!compact && <h2>📆 Calendar</h2>}

      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        height="auto"
        events={[...events, ...bgEvents]}
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        headerToolbar={compact ? { left: 'prev,next', center: 'title', right: '' } : undefined}
      />

      {!compact && (
        <div style={{ marginTop:'20px', padding:'16px', background:'#f7fafc', borderRadius:'8px' }}>
          <div style={{ fontWeight:600 }}>📋 Legend:</div>
          <div style={{ display:'flex', gap:'24px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <span style={{ background:'rgba(72, 187, 120, 0.2)', padding:'8px 12px', borderRadius:'4px', border:'1px solid rgba(72, 187, 120, 0.3)' }}></span>
              <span>Available slots</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <span style={{ background:'rgba(245, 101, 101, 0.2)', padding:'8px 12px', borderRadius:'4px', border:'1px solid rgba(245, 101, 101, 0.3)' }}></span>
              <span>Fully booked</span>
            </div>
          </div>
        </div>
      )}

      {modalData && modalData.type === 'new' && (
        <BookingModal
          date={modalData.date}
          onClose={() => setModalData(null)}
          onBooked={() => {
            addNotification({ type:'info', text:`✨ Successfully booked on ${modalData.date}`});
            setModalData(null);
            fetchBookings();
            fetchCalendar();
          }}
        />
      )}

      {modalData && modalData.type === 'view' && (
        <BookingModal date={modalData.event.date} onClose={() => setModalData(null)}>
          <div style={{ padding:'16px' }}>
            <strong>Service:</strong> {modalData.event.serviceType}<br/>
            <strong>User:</strong> {modalData.event.userName}<br/>
            <strong>Date:</strong> {modalData.event.date}<br/>
            <strong>Time:</strong> {modalData.event.timeSlot}<br/>
            {modalData.event.notes && (<><strong>Notes:</strong> {modalData.event.notes}</>)}
          </div>
        </BookingModal>
      )}
    </div>
  );
}
