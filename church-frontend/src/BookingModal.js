import React, { useState } from 'react';
import api from './api';

export default function BookingModal({ date, onClose, onBooked }) {
  const [service, setService] = useState('Counseling');
  const [timeSlot, setTimeSlot] = useState('09:00-10:00');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.bookingRequests.submit({ service_type: service, date, time_slot: timeSlot, notes });
      onBooked && onBooked();
    } catch (err) {
      setError(err.response?.data?.error || 'Request submission failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ position:'fixed', left:0, right:0, top:0, bottom:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
      <div style={{ background:'white', padding:'32px', width:'100%', maxWidth:'450px', borderRadius:'16px', boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}>
                <h2 style={{ margin:'0 0 8px 0', color:'#2d3748' }}>📅 Request Booking</h2>
        <p style={{ margin:'0 0 24px 0', color:'#718096', fontSize:'14px' }}>Date: <strong style={{ color:'#667eea' }}>{date}</strong></p>
        <form onSubmit={submit}>
          <div style={{ marginBottom:'16px' }}>
            <label>Service Type *</label>
            <select value={service} onChange={e=>setService(e.target.value)} style={{ width:'100%' }}>
              <option>Counseling</option>
              <option>Baptism</option>
              <option>Wedding</option>
              <option>Blessing</option>
              <option>Facility Booking</option>
            </select>
          </div>
          <div style={{ marginBottom:'16px' }}>
            <label>Time Slot *</label>
            <select value={timeSlot} onChange={e=>setTimeSlot(e.target.value)} style={{ width:'100%' }}>
              <option>09:00-10:00</option>
              <option>10:00-11:00</option>
              <option>11:00-12:00</option>
              <option>13:00-14:00</option>
              <option>14:00-15:00</option>
            </select>
          </div>
          <div style={{ marginBottom:'16px' }}>
            <label>Additional Notes</label>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Any special requests or details..." style={{ width:'100%', minHeight:'80px', padding:'10px', borderRadius:'6px', border:'1px solid #e2e8f0', fontFamily:'inherit' }} />
          </div>
          {error && <div style={{ color:'#e53e3e', background:'#fff5f5', padding:'12px', borderRadius:'6px', marginBottom:'16px', fontSize:'14px', border:'1px solid #fc8181' }}>⚠️ {error}</div>}
          <div style={{ display:'flex', gap:'12px', marginTop:'24px' }}>
            <button type="button" onClick={onClose} disabled={loading} style={{ flex:1, background:'#e2e8f0', color:'#4a5568', opacity: loading ? 0.6 : 1 }}>Cancel</button>
            <button type="submit" disabled={loading} style={{ flex:1, background:'#48bb78', opacity: loading ? 0.6 : 1 }}>{ loading ? '⏳ Submitting...' : '✉️ Submit Request'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
