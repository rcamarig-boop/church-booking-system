import React, { useState, useEffect, createContext, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import LandingPage from './LandingPage';
import Login from './Login';
import Register from './Register';
import Dashboard from './Dashboard';
import AdminDashboard from './AdminDashboard';
import NotificationCenter from './NotificationCenter';
import api from './api';

export const SocketContext = createContext();
const DEFAULT_SOCKET_URL = 'http://localhost:4000';
const socketBaseFromApi = process.env.REACT_APP_API_BASE_URL
  ? process.env.REACT_APP_API_BASE_URL.replace(/\/api\/?$/, '')
  : null;
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL ||
  socketBaseFromApi ||
  (process.env.NODE_ENV === 'production' ? window.location.origin : DEFAULT_SOCKET_URL);
const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
const MAX_NOTIFICATIONS = 50;
const NOTIFICATION_DEDUPE_WINDOW_MS = 15000;

export default function App() {
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('landing');
  const [notifications, setNotifications] = useState([]);
  const [eventsForNotify, setEventsForNotify] = useState([]);
  const notifiedEventIdsRef = useRef(new Set());
  const userRef = useRef(null);
  const recentNotificationMapRef = useRef(new Map());
  const eventRefreshTimerRef = useRef(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const addNotification = useCallback((incoming) => {
    const now = Date.now();
    const type = incoming?.type || 'info';
    const text = String(incoming?.text || '').trim();
    if (!text) return;

    const dedupeKey = incoming?.dedupeKey || `${type}:${text}`;
    const previousTs = recentNotificationMapRef.current.get(dedupeKey);
    if (previousTs && now - previousTs < NOTIFICATION_DEDUPE_WINDOW_MS) return;
    recentNotificationMapRef.current.set(dedupeKey, now);

    for (const [key, ts] of recentNotificationMapRef.current.entries()) {
      if (now - ts > NOTIFICATION_DEDUPE_WINDOW_MS * 4) {
        recentNotificationMapRef.current.delete(key);
      }
    }

    setNotifications(prev => [
      {
        id: incoming?.id || `${now}-${Math.random().toString(36).slice(2, 8)}`,
        type,
        text,
        createdAt: incoming?.createdAt || new Date(now).toISOString(),
        read: false
      },
      ...prev
    ].slice(0, MAX_NOTIFICATIONS));
  }, []);

  const scheduleEventRefresh = useCallback(() => {
    if (eventRefreshTimerRef.current) return;
    eventRefreshTimerRef.current = setTimeout(async () => {
      eventRefreshTimerRef.current = null;
      if (!userRef.current) return;
      try {
        const res = await api.events.list();
        setEventsForNotify(res.data || []);
      } catch {
        // ignore
      }
    }, 400);
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem('church_user');
    if (raw) {
      const u = JSON.parse(raw);
      setUser(u);
      api.setToken(u.token);
      setCurrentPage('dashboard');
    }

    socket.on('connect', () => console.log('[Socket] Connected'));
    socket.on('disconnect', () => console.log('[Socket] Disconnected'));

    const onNewBooking = (b) => {
      if (userRef.current && b.userId === userRef.current.id) {
        addNotification({
          type: 'new_booking',
          text: `Booking confirmed: ${b.service} on ${b.date} (${b.slot})`,
          dedupeKey: `new_booking:${b.id || `${b.date}:${b.slot}:${b.service}`}`
        });
      }
    };
    const onBookingDeleted = (b) => {
      addNotification({
        type: 'deleted',
        text: `Booking cancelled for ${b.date}`,
        dedupeKey: `deleted:${b.id || b.date}`
      });
    };
    const onCalendarConfigUpdated = (b) => {
      addNotification({
        type: 'config',
        text: `Calendar updated for ${b.date}`,
        dedupeKey: `config:${b.date}`
      });
    };
    const onEventChanged = () => scheduleEventRefresh();

    socket.on('new_booking', onNewBooking);
    socket.on('booking_deleted', onBookingDeleted);
    socket.on('calendar_config_updated', onCalendarConfigUpdated);
    socket.on('event_created', onEventChanged);
    socket.on('event_updated', onEventChanged);
    socket.on('event_deleted', onEventChanged);

    return () => {
      socket.off('new_booking', onNewBooking);
      socket.off('booking_deleted', onBookingDeleted);
      socket.off('calendar_config_updated', onCalendarConfigUpdated);
      socket.off('event_created', onEventChanged);
      socket.off('event_updated', onEventChanged);
      socket.off('event_deleted', onEventChanged);
      if (eventRefreshTimerRef.current) {
        clearTimeout(eventRefreshTimerRef.current);
        eventRefreshTimerRef.current = null;
      }
    };
  }, [addNotification, scheduleEventRefresh]);

  useEffect(() => {
    if (!user) return;

    const loadEvents = async () => {
      try {
        const res = await api.events.list();
        setEventsForNotify(res.data || []);
      } catch {
        // ignore
      }
    };

    loadEvents();
    const interval = setInterval(loadEvents, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (!user || !eventsForNotify.length) return;

    const now = new Date();
    eventsForNotify.forEach(e => {
      if (!e.time || !e.date) return;
      if (notifiedEventIdsRef.current.has(e.id)) return;

      const eventTime = new Date(`${e.date}T${e.time}`);
      if (isNaN(eventTime.getTime())) return;

      const msUntil = eventTime.getTime() - now.getTime();
      if (msUntil <= 0) return;
      if (msUntil > 60 * 60 * 1000) return;

      notifiedEventIdsRef.current.add(e.id);
      addNotification({
        type: 'event_soon',
        text: `Event in 1 hour: ${e.title} (${e.date} ${e.time})`,
        dedupeKey: `event_soon:${e.id}`
      });
    });
  }, [eventsForNotify, user, addNotification]);

  const markNotificationRead = useCallback((id) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => (n.read ? n : { ...n, read: true })));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const handleLogin = ({ token, user }) => {
    const u = { ...user, token };
    localStorage.setItem('church_user', JSON.stringify(u));
    api.setToken(token);
    notifiedEventIdsRef.current = new Set();
    setUser(u);
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('church_user');
    api.setToken(null);
    setUser(null);
    setEventsForNotify([]);
    notifiedEventIdsRef.current = new Set();
    setCurrentPage('landing');
  };

  return (
    <SocketContext.Provider value={socket}>
      {currentPage === 'landing' && (
        <LandingPage
          onChooseLogin={() => setCurrentPage('login')}
          onChooseRegister={() => setCurrentPage('register')}
        />
      )}

      {currentPage === 'login' && (
        <Login onLogin={handleLogin} onBack={() => setCurrentPage('landing')} />
      )}

      {currentPage === 'register' && (
        <Register onLogin={handleLogin} onBack={() => setCurrentPage('landing')} />
      )}

      {currentPage === 'dashboard' && user && (
        <>
          {user.role === 'admin' ? (
            <AdminDashboard user={user} onLogout={handleLogout} />
          ) : (
            <Dashboard user={user} onLogout={handleLogout} />
          )}
          <NotificationCenter
            items={notifications}
            onMarkRead={markNotificationRead}
            onMarkAllRead={markAllNotificationsRead}
            onClearAll={clearNotifications}
          />
        </>
      )}
    </SocketContext.Provider>
  );
}
