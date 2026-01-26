import React, { useState, useEffect, useContext } from 'react';
import api from './api';
import CalendarViewNew from './CalendarViewNew';
import { SocketContext } from './App';

export default function Dashboard({ addNotification, user, onLogout }) {
  const [bookings, setBookings] = useState([]);
  const socket = useContext(SocketContext);

  const fetchUserBookings = async () => {
    try {
      const res = await api.bookings.list();
      const userBookings = res.data.filter(b => b.user_name === user.name);
      setBookings(userBookings);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchUserBookings();
    const refresh = () => fetchUserBookings();
    socket.on('new_booking', refresh);
    socket.on('booking_deleted', refresh);
    return () => {
      socket.off('new_booking', refresh);
      socket.off('booking_deleted', refresh);
    };
  }, [socket]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f7fafc' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(to right, #667eea, #764ba2)',
        color: 'white',
        padding: '24px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700 }}>
          👋 Welcome back, {user.name}
        </h1>
        <button onClick={onLogout} style={styles.headerBtn}>Logout</button>
      </div>

      {/* Main content */}
      <div style={{ display: 'flex', flex: 1, gap: '16px', padding: '16px', overflow: 'hidden' }}>
        {/* Left Panel: Bookings */}
        <div style={styles.sidebar}>
          <h2 style={styles.cardTitle}>📋 Your Bookings</h2>
          {bookings.length === 0 ? (
            <p style={{ color: '#718096', fontSize: '12px' }}>No bookings yet.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {bookings.map(b => (
                <li key={b.id} style={styles.bookingItem}>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>{b.service_type}</div>
                  <div style={{ fontSize: '12px', color: '#4a5568' }}>{b.date} • {b.time_slot}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Right Panel: Calendar */}
        <div style={styles.calendarContainer}>
          <CalendarViewNew addNotification={addNotification} compact={false} />
        </div>
      </div>
    </div>
  );
}

const styles = {
  headerBtn: {
    background: 'white',
    color: '#4a5568',
    border: 'none',
    padding: '8px 14px',
    borderRadius: '6px',
    fontWeight: 600,
    cursor: 'pointer'
  },
  sidebar: {
    width: '360px',
    background: '#fff',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    padding: '24px',
    overflowY: 'auto',
    flexShrink: 0,
    maxHeight: '100%'
  },
  cardTitle: { fontSize: '18px', fontWeight: 700, color: '#2d3748', marginBottom: '16px' },
  bookingItem: { padding: '12px 0', borderBottom: '1px solid #e2e8f0' },
  calendarContainer: {
    flex: 1,
    background: '#fff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    minWidth: 0,
    overflowY: 'auto'
  }
};
