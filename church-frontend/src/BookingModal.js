import React, { useState } from 'react';
import api from './api';

export default function BookingModal({ date, onClose, onBooked, children }) {
  const [service, setService] = useState('Counseling');
  const [timeSlot, setTimeSlot] = useState('09:00-10:00');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!onBooked) return; // read-only view
    setError(null);
    setLoading(true);
    try {
      await api.bookingRequests.submit({ service_type: service, date, time_slot: timeSlot, notes });
      onBooked();
    } catch (err) {
      setError(err.response?.data?.error || 'Request submission failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        {!children && (
          <>
            <h2>📅 Request Booking</h2>
            <p>Date: <strong>{date}</strong></p>
            <form onSubmit={submit}>
              <label>Service Type *</label>
              <select value={service} onChange={e => setService(e.target.value)}>
                <option>Counseling</option><option>Baptism</option><option>Wedding</option><option>Blessing</option><option>Facility Booking</option>
              </select>

              <label>Time Slot *</label>
              <select value={timeSlot} onChange={e => setTimeSlot(e.target.value)}>
                <option>09:00-10:00</option><option>10:00-11:00</option><option>11:00-12:00</option><option>13:00-14:00</option><option>14:00-15:00</option>
              </select>

              <label>Additional Notes</label>
              <textarea placeholder="Any special requests..." value={notes} onChange={e=>setNotes(e.target.value)} />

              {error && <div className="error-msg">⚠️ {error}</div>}

              <div className="modal-actions">
                <button type="button" onClick={onClose} disabled={loading}>Cancel</button>
                <button type="submit" disabled={loading}>{loading ? '⏳ Submitting...' : '✉️ Submit Request'}</button>
              </div>
            </form>
          </>
        )}
        {children && children}
      </div>
    </div>
  );
}
