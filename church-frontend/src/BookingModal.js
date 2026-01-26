import React, { useState } from 'react';
import api from './api';

export default function BookingModal({
  date,
  onClose,
  onBooked,
  mode = 'new',   // 'list' | 'view' | 'new'
  events = [],
  event = null,
  onRequestNewBooking // used in list mode to open full booking form
}) {
  const [service, setService] = useState('Counseling');
  const [timeSlot, setTimeSlot] = useState('09:00-10:00');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const submitBooking = async () => {
    setError(null);
    setLoading(true);
    try {
      await api.bookings.create({ service_type: service, date, time_slot: timeSlot, notes });
      onBooked && onBooked();
    } catch (err) {
      setError(err.response?.data?.error || 'Booking failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{
        background: '#fff', padding: '24px', borderRadius: '12px',
        maxWidth: '500px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <h2 style={{ marginBottom: '12px', fontSize: '20px', color: '#2d3748' }}>
          {mode === 'list' && '📅 Events on this date'}
          {mode === 'view' && '📖 Booking details'}
          {mode === 'new' && '📅 Book now'}
        </h2>
        <p style={{ marginBottom: '16px', color: '#4a5568' }}>
          Date: <strong style={{ color: '#667eea' }}>{date}</strong>
        </p>

        {/* LIST MODE */}
        {mode === 'list' && (
          <>
            {events.length > 0 ? (
              <ul style={{ paddingLeft: '20px', marginBottom: '16px' }}>
                {events.map(ev => (
                  <li key={ev.id}>
                    <strong>{ev.title}</strong> — {ev.start.split('T')[1]}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No events booked yet.</p>
            )}
            <button
              onClick={onRequestNewBooking}
              style={{
                background: '#3182ce', color: 'white', padding: '10px 16px',
                borderRadius: '6px', fontWeight: 600, border: 'none', cursor: 'pointer'
              }}
            >
              ➕ Book on {date}
            </button>
            <button onClick={onClose} style={{ marginTop: '12px' }}>Close</button>
          </>
        )}

        {/* VIEW MODE */}
        {mode === 'view' && event && (
          <>
            <p><strong>Service:</strong> {event.serviceType}</p>
            <p><strong>User:</strong> {event.userName}</p>
            <p><strong>Date:</strong> {event.date}</p>
            <p><strong>Time:</strong> {event.timeSlot}</p>
            {event.notes && <p><strong>Notes:</strong> {event.notes}</p>}
            <button onClick={onClose} style={{ marginTop: '12px' }}>Close</button>
          </>
        )}

        {/* NEW MODE (full booking form) */}
        {mode === 'new' && (
          <form onSubmit={(e) => { e.preventDefault(); submitBooking(); }}>
            <label>Service Type *</label>
            <select value={service} onChange={e => setService(e.target.value)} style={{ width: '100%', marginBottom: '12px' }}>
              <option>Counseling</option>
              <option>Baptism</option>
              <option>Wedding</option>
              <option>Blessing</option>
              <option>Facility Booking</option>
            </select>

            <label>Time Slot *</label>
            <select value={timeSlot} onChange={e => setTimeSlot(e.target.value)} style={{ width: '100%', marginBottom: '12px' }}>
              <option>09:00-10:00</option>
              <option>10:00-11:00</option>
              <option>11:00-12:00</option>
              <option>13:00-14:00</option>
              <option>14:00-15:00</option>
            </select>

            <label>Additional Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              style={{ width: '100%', marginBottom: '12px' }}
              placeholder="Any special requests or details..."
            />

            {error && <div style={{ color: 'red', marginBottom: '12px' }}>⚠️ {error}</div>}

            <button type="button" onClick={onClose} style={{ marginRight: '8px' }}>Cancel</button>
            <button type="submit" disabled={loading}>
              {loading ? '⏳ Submitting...' : '✉️ Submit Request'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
