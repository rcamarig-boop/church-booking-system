import React, { useState, useEffect, useContext } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import api from './api';
import { SocketContext } from './App';
import BookingModal from './BookingModal';

export default function CalendarView({ addNotification, compact = false }) {
  const [events, setEvents] = useState([]);
  const [modalData, setModalData] = useState(null);
  const socket = useContext(SocketContext);

  const fetchBookings = async () => {
    try {
      const res = await api.bookings.list();
      const ev = res.data.map(b => ({
        id: b.id,
        title: `${b.service_type} — ${b.user_name}`,
        start: `${b.date}T${b.time_slot.split('-')[0]}`,
        extendedProps: b
      }));
      setEvents(ev);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchBookings();
    const handleNewBooking = () => fetchBookings();
    socket.on('new_booking', handleNewBooking);
    return () => socket.off('new_booking', handleNewBooking);
  }, [socket]);

  const handleDateClick = (arg) => setModalData({ type: 'new', date: arg.dateStr });
  const handleEventClick = (clickInfo) => setModalData({ type: 'view', event: clickInfo.event.extendedProps });

  return (
    <div style={!compact ? { background: 'white', padding: 24, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: 24 } : {}}>
      {!compact && <h2 style={{ marginTop: 0, marginBottom: 16 }}>📆 Calendar</h2>}
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        events={events}
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        height="auto"
        headerToolbar={compact ? { left: 'prev,next', center: 'title', right: '' } : undefined}
      />

      {modalData && modalData.type === 'new' && (
        <BookingModal date={modalData.date} onClose={() => setModalData(null)} onBooked={() => {
          addNotification({ type: 'info', text: `✨ Booked on ${modalData.date}` });
          setModalData(null);
          fetchBookings();
        }} />
      )}

      {modalData && modalData.type === 'view' && (
        <BookingModal date={modalData.event.date} onClose={() => setModalData(null)}>
          <div style={{ padding: 16, fontSize: 14, lineHeight: 1.5 }}>
            <strong>Service:</strong> {modalData.event.service_type}<br />
            <strong>User:</strong> {modalData.event.user_name}<br />
            <strong>Date:</strong> {modalData.event.date}<br />
            <strong>Time:</strong> {modalData.event.time_slot}<br />
            {modalData.event.notes && (<><strong>Notes:</strong> {modalData.event.notes}</>)}
          </div>
        </BookingModal>
      )}
    </div>
  );
}
