// App.jsx
import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import LandingPage from './LandingPage';
import Login from './Login';
import Register from './Register';
import Dashboard from './Dashboard';
import api from './api';

// Keep socket as requested
const socket = io('https://church-booking-system.onrender.com', { transports: ['websocket'] });

export const SocketContext = React.createContext(socket);

function App() {
  const [notifications, setNotifications] = useState([]);
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('landing');

  useEffect(() => {
    const raw = localStorage.getItem('church_user');
    if (raw) {
      const userData = JSON.parse(raw);
      setUser(userData);
      setCurrentPage('dashboard');
      api.setToken(userData.token);
    }

    const addNotification = (n) => setNotifications(prev => [n, ...prev].slice(0, 20));

    socket.on('new_booking', (booking) =>
      addNotification({ type: 'new_booking', text: `New booking: ${booking.service_type} on ${booking.date} (${booking.time_slot})` })
    );

    socket.on('booking_deleted', (info) =>
      addNotification({ type: 'deleted', text: `Booking cancelled for ${info.date}` })
    );

    return () => {
      socket.off('new_booking');
      socket.off('booking_deleted');
    };
  }, []);

  const handleLogin = (user, token) => {
    const u = { ...user, token };
    localStorage.setItem('church_user', JSON.stringify(u));
    api.setToken(token);
    setUser(u);
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('church_user');
    api.setToken(null);
    setUser(null);
    setCurrentPage('landing');
  };

  const handleChooseAuth = (type) => setCurrentPage(type);

  return (
    <SocketContext.Provider value={socket}>
      {currentPage === 'landing' && (
        <LandingPage
          onChooseLogin={() => handleChooseAuth('login')}
          onChooseRegister={() => handleChooseAuth('register')}
        />
      )}

      {currentPage === 'login' && (
        <Login onLogin={handleLogin} onBack={() => setCurrentPage('landing')} onRegister={() => handleChooseAuth('register')} />
      )}

      {currentPage === 'register' && (
        <Register onRegister={handleLogin} onBack={() => setCurrentPage('landing')} onLogin={() => handleChooseAuth('login')} />
      )}

      {currentPage === 'dashboard' && user && (
        <Dashboard
          user={user}
          notifications={notifications}
          onLogout={handleLogout}
        />
      )}
    </SocketContext.Provider>
  );
}

export default App;
