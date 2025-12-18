// Dashboard.jsx
import React, { useEffect, useState, useContext } from 'react';
import api from './api';
import { SocketContext } from './App';

function Dashboard({ user, notifications, onLogout }) {
  const [bookings, setBookings] = useState([]);
  const socket = useContext(SocketContext);

  const loadBookings = () => {
    api.bookings.list().then(res => setBookings(res.data)).catch(console.error);
  };

  const cancelBooking = (id) => {
    if (!window.confirm('Cancel this booking?')) return;
    api.bookings.cancel(id).then(() => loadBookings()).catch(console.error);
  };

  useEffect(() => {
    loadBookings();
    socket.on('new_booking', loadBookings);
    socket.on('booking_deleted', loadBookings);
    return () => {
      socket.off('new_booking', loadBookings);
      socket.off('booking_deleted', loadBookings);
    };
  }, [socket]);

  return (
    <div>
      <h2>Welcome, {user.name}</h2>
      <button onClick={onLogout}>Logout</button>

      <h3>Your Bookings</h3>
      <ul>
        {bookings.map(b => (
          <li key={b.id}>
            {b.service_type} on {b.date} ({b.time_slot})
            <button onClick={() => cancelBooking(b.id)} style={{ marginLeft: '10px' }}>Cancel</button>
          </li>
        ))}
      </ul>

      <h3>Notifications</h3>
      <ul>
        {notifications.map((n, i) => <li key={i}>{n.text}</li>)}
      </ul>
    </div>
  );
}

export default Dashboard;
