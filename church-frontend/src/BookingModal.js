import React from 'react';

export default function BookingModal({ date, onClose, onBooked, children }) {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: '12px', zIndex: 1000
    }}>
      <div style={{
        background: 'white', padding: '24px', width: '100%',
        maxWidth: '450px', borderRadius: '16px', maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0 }}>{children ? 'Booking Details' : `Book on ${date}`}</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '18px' }}>✕</button>
        </div>
        {children || (
          <form onSubmit={(e) => { e.preventDefault(); onBooked && onBooked(); }} style={{ display: 'grid', gap: '12px' }}>
            <label>
              Service Type
              <input placeholder="Service" required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
            </label>
            <label>
              Notes
              <textarea placeholder="Optional notes" style={{ width: '100%', minHeight: '60px', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontFamily: 'inherit' }} />
            </label>
            <button type="submit" style={{ padding: '12px', borderRadius: '8px', border: 'none', background: '#667eea', color: 'white', cursor: 'pointer' }}>✨ Confirm Booking</button>
          </form>
        )}
      </div>
    </div>
  );
}
