import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import LandingPage from './LandingPage';
import Login from './Login';
import Register from './Register';
import Dashboard from './Dashboard';
import AdminDashboard from './AdminDashboard';
import api from './api';

const socket = io('http://localhost:4000');
console.log('[App] Socket initialized');
export const SocketContext = React.createContext();

function App() {
  const [notifications, setNotifications] = useState([]);
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('landing'); // 'landing', 'login', 'register', 'dashboard'

  // Load user from localStorage on mount
  useEffect(() => {
    const raw = localStorage.getItem('church_user');
    if (raw) {
      const userData = JSON.parse(raw);
      setUser(userData);
      setCurrentPage('dashboard');
      api.setToken(userData.token);
    }

    // Socket listeners
    socket.on('connect', () => console.log('[App] Socket connected!'));
    socket.on('disconnect', () => console.log('[App] Socket disconnected!'));
    socket.on('new_booking', (booking) => {
      console.log('[App] new_booking event received:', booking);
      addNotification({ type: 'new_booking', text: `New booking: ${booking.service_type} on ${booking.date} (${booking.time_slot})` });
    });
    socket.on('booking_deleted', (info) => addNotification({ type: 'deleted', text: `Booking cancelled for ${info.date}` }));
    socket.on('calendar_config_updated', (info) => addNotification({ type: 'config', text: `Calendar updated: ${info.date} max slots ${info.max_slots}` }));

    return () => {
      socket.off('new_booking');
      socket.off('booking_deleted');
      socket.off('calendar_config_updated');
    };
  }, []);

  const addNotification = (n) => setNotifications(prev => [n, ...prev].slice(0, 20));

  const handleLogin = (userInfo, token) => {
    const u = { ...userInfo, token };
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

  const handleChooseAuth = (type) => {
    setCurrentPage(type); // 'login' or 'register'
  };

  return (
    <SocketContext.Provider value={socket}>
      {currentPage === 'landing' && (
        <LandingPage
          onChooseLogin={() => handleChooseAuth('login')}
          onChooseRegister={() => handleChooseAuth('register')}
        />
      )}

      {currentPage === 'login' && (
        <div className="auth-page">
          <div style={{ width: '100%', maxWidth: '450px', position: 'relative', zIndex: 1 }}>
            <button onClick={() => setCurrentPage('landing')} className="auth-back-btn">← Back</button>
            <Login onLogin={handleLogin} />
            <p style={{ textAlign: 'center', color: '#4a5568', marginTop: '16px', fontSize: '14px' }}>
              Don't have an account? <button onClick={() => handleChooseAuth('register')} style={styles.linkBtn}>Create one</button>
            </p>
          </div>
        </div>
      )}

      {currentPage === 'register' && (
        <div className="auth-page">
          <div style={{ width: '100%', maxWidth: '450px', position: 'relative', zIndex: 1 }}>
            <button onClick={() => setCurrentPage('landing')} className="auth-back-btn">← Back</button>
            <Register onRegister={handleLogin} />
            <p style={{ textAlign: 'center', color: '#4a5568', marginTop: '16px', fontSize: '14px' }}>
              Already have an account? <button onClick={() => handleChooseAuth('login')} style={styles.linkBtn}>Sign in</button>
            </p>
          </div>
        </div>
      )}

      {currentPage === 'dashboard' && user && (
        <>
          {user.role === 'admin' ? (
            <AdminDashboard
              user={user}
              addNotification={addNotification}
              onLogout={handleLogout}
            />
          ) : (
            <Dashboard
              user={user}
              addNotification={addNotification}
              onLogout={handleLogout}
            />
          )}
        </>
      )}
    </SocketContext.Provider>
  );
}

const styles = {
  linkBtn: { background: 'none', border: 'none', color: '#667eea', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }
};

export default App;
