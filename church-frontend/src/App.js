import React, { useState, createContext, useEffect } from 'react';
import LandingPage from './LandingPage';
import Login from './Login';
import Register from './Register';
import Dashboard from './Dashboard';
import { io } from 'socket.io-client';
import api from './api';

export const SocketContext = createContext();

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [view, setView] = useState('landing'); // landing, login, register
  const [notifications, setNotifications] = useState([]);

  const socket = io('https://church-booking-system.onrender.com', { transports: ['websocket'] });

  const addNotification = (item) => setNotifications((prev) => [item, ...prev]);

  const handleLogin = (u, t) => {
    setUser(u);
    setToken(t);
  };

  const handleRegister = (u, t) => {
    setUser(u);
    setToken(t);
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    setView('landing');
  };

  useEffect(() => {
    if (user) {
      socket.emit('join', { userId: user.id });
    }
  }, [user]);

  return (
    <SocketContext.Provider value={socket}>
      {!user && view === 'landing' && <LandingPage onChooseLogin={() => setView('login')} onChooseRegister={() => setView('register')} />}
      {!user && view === 'login' && <Login onLogin={handleLogin} />}
      {!user && view === 'register' && <Register onRegister={handleRegister} />}
      {user && <Dashboard user={user} notifications={notifications} onLogout={handleLogout} addNotification={addNotification} />}
    </SocketContext.Provider>
  );
}
