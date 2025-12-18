import React, { useEffect, useState } from 'react';

export default function Dashboard({ user, bookings, notifications, onLogout, addNotification, onCancelBooking }) {
  return (
    <div className="dashboard">
      <header>
        <h2>Welcome, {user.name}</h2>
        <button onClick={onLogout}>Logout</button>
      </header>

      <section className="notifications">
        <h3>Notifications</h3>
        <ul>
          {notifications.map((n, i) => (
            <li key={i}>{n.text}</li>
          ))}
        </ul>
      </section>

      <section className="bookings">
        <h3>Your Bookings</h3>
        {bookings.length === 0 && <p>No bookings yet.</p>}
        <ul>
          {bookings.map((b) => (
            <li key={b.id}>
              {b.service_type} on {b.date} ({b.time_slot})
              <button onClick={() => onCancelBooking(b.id)} style={{ marginLeft: '10px', color: 'red' }}>
                Cancel
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
