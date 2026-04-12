import React, { useState, useEffect, createContext, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import LandingPage from './LandingPage';
import Login from './Login';
import Register from './Register';
import Dashboard from './Dashboard';
import AdminDashboard from './AdminDashboard';
import NotificationCenter from './NotificationCenter';
import { ToastProvider } from './ToastNotification';
import api from './api';
import ErrorBoundary from './ErrorBoundary';
import { SessionSecurityManager, APIErrorLogger } from './FrontendSecurity';

export const SocketContext = createContext();
const DEFAULT_SOCKET_URL = 'http://localhost:5000';
const rawApiBase = process.env.REACT_APP_API_BASE_URL || process.env.REACT_APP_API_URL;
const socketBaseFromApi = rawApiBase
  ? rawApiBase.replace(/\/api\/?$/, '')
  : null;
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL ||
  socketBaseFromApi ||
  (process.env.NODE_ENV === 'production' ? window.location.origin : DEFAULT_SOCKET_URL);
const socket = io(SOCKET_URL, {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 10000,
  forceNew: true,
});
const MAX_NOTIFICATIONS = 30;
const NOTIFICATION_PAGE_SIZE = 10;
const NOTIFICATION_DEDUPE_WINDOW_MS = 15000;

export default function App() {
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('landing');
  const [notifications, setNotifications] = useState([]);
  const [notificationsHasMore, setNotificationsHasMore] = useState(false);
  const [eventsForNotify, setEventsForNotify] = useState([]);
  const notifiedEventIdsRef = useRef(new Set());
  const userRef = useRef(null);
  const recentNotificationMapRef = useRef(new Map());
  const eventRefreshTimerRef = useRef(null);
  const sessionManagerRef = useRef(null);
  const [sessionWarning, setSessionWarning] = useState(null);

  const initSessionManager = useCallback(() => {
    if (sessionManagerRef.current) sessionManagerRef.current.destroy();
    const manager = new SessionSecurityManager();
    manager.onSessionExpired = () => handleLogout();
    manager.onSessionWarning = (secondsRemaining) => {
      setSessionWarning(Math.round(secondsRemaining / 60));
      setTimeout(() => setSessionWarning(null), 5000);
    };
    sessionManagerRef.current = manager;
  }, []);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const getNotificationsKey = (u) => (u?.id ? `church_notifications_${u.id}` : null);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setNotificationsHasMore(false);
      return;
    }
    (async () => {
      try {
        const res = await api.notifications.list({ limit: NOTIFICATION_PAGE_SIZE, offset: 0 });
        const rows = res.data || [];
        setNotifications(rows.map(n => ({
          id: n.id,
          type: n.type,
          text: n.text,
          createdAt: n.created_at,
          read: !!n.read
        })));
        setNotificationsHasMore(rows.length === NOTIFICATION_PAGE_SIZE);
      } catch {
        setNotifications([]);
        setNotificationsHasMore(false);
      }
    })();
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

    api.notifications.create({ type, text }).then((res) => {
      const row = res?.data;
      if (!row?.id) return;
      setNotifications(prev => [
        {
          id: row.id,
          type: row.type,
          text: row.text,
          createdAt: row.created_at,
          read: !!row.read
        },
        ...prev
      ].slice(0, MAX_NOTIFICATIONS));
    }).catch(() => {});
  }, []);

  const refreshNotifications = useCallback(async () => {
    if (!userRef.current) return;
    try {
      const res = await api.notifications.list({ limit: NOTIFICATION_PAGE_SIZE, offset: 0 });
      const rows = res.data || [];
      setNotifications(rows.map(n => ({
        id: n.id,
        type: n.type,
        text: n.text,
        createdAt: n.created_at,
        read: !!n.read
      })));
      setNotificationsHasMore(rows.length === NOTIFICATION_PAGE_SIZE);
    } catch {
      // ignore
    }
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

      // Restore session security manager on page refresh
      initSessionManager();
    }

    socket.on('connect', () => console.log('[Socket] Connected'));
    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      if (reason === 'io server disconnect') {
        // Server forced disconnect – reconnect manually
        socket.connect();
      }
      // Other reasons (transport close, ping timeout) are auto-reconnected by socket.io
    });
    socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
    });
    // In socket.io v4, reconnect events are on the Manager (socket.io)
    socket.io.on('reconnect', (attempt) => {
      console.log('[Socket] Reconnected after', attempt, 'attempt(s)');
    });
    socket.io.on('reconnect_error', (err) => {
      console.warn('[Socket] Reconnect error:', err.message);
    });
    socket.io.on('reconnect_failed', () => {
      console.error('[Socket] Reconnect failed – retrying manually');
      setTimeout(() => socket.connect(), 3000);
    });

    // Ensure the socket reconnects when the browser tab becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !socket.connected) {
        console.log('[Socket] Tab visible – reconnecting');
        socket.connect();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanly disconnect the socket before page unload so the server
    // doesn't hold a stale connection while the new page is loading
    const handleBeforeUnload = () => {
      socket.disconnect();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    const onNewBooking = () => refreshNotifications();
    const onBookingRequestCreated = () => refreshNotifications();
    const onBookingDeleted = () => refreshNotifications();
    const onCalendarConfigUpdated = () => refreshNotifications();
    const onEventChanged = () => scheduleEventRefresh();
    const onConcernCreated = () => refreshNotifications();
    const onConcernUpdated = () => refreshNotifications();

    socket.on('new_booking', onNewBooking);
    socket.on('booking_request_created', onBookingRequestCreated);
    socket.on('booking_deleted', onBookingDeleted);
    socket.on('calendar_config_updated', onCalendarConfigUpdated);
    socket.on('event_created', onEventChanged);
    socket.on('event_updated', onEventChanged);
    socket.on('event_deleted', onEventChanged);
    socket.on('concern_created', onConcernCreated);
    socket.on('concern_updated', onConcernUpdated);

    return () => {
      socket.off('new_booking', onNewBooking);
      socket.off('booking_request_created', onBookingRequestCreated);
      socket.off('booking_deleted', onBookingDeleted);
      socket.off('calendar_config_updated', onCalendarConfigUpdated);
      socket.off('event_created', onEventChanged);
      socket.off('event_updated', onEventChanged);
      socket.off('event_deleted', onEventChanged);
      socket.off('concern_created', onConcernCreated);
      socket.off('concern_updated', onConcernUpdated);
      socket.off('connect_error');
      socket.io.off('reconnect');
      socket.io.off('reconnect_error');
      socket.io.off('reconnect_failed');
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (eventRefreshTimerRef.current) {
        clearTimeout(eventRefreshTimerRef.current);
        eventRefreshTimerRef.current = null;
      }
    };
  }, [addNotification, scheduleEventRefresh, refreshNotifications]);

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
    api.notifications.markRead([id]).catch(() => {});
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications(prev => {
      const ids = prev.filter(n => !n.read).map(n => n.id);
      if (ids.length) api.notifications.markRead(ids).catch(() => {});
      return prev.map(n => (n.read ? n : { ...n, read: true }));
    });
  }, []);

  const deleteNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    api.notifications.delete(id).catch(() => {});
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    api.notifications.clear().catch(() => {});
  }, []);

  const loadMoreNotifications = useCallback(async () => {
    try {
      const res = await api.notifications.list({
        limit: NOTIFICATION_PAGE_SIZE,
        offset: notifications.length
      });
      const rows = res.data || [];
      if (!rows.length) {
        setNotificationsHasMore(false);
        return;
      }
      setNotifications(prev => [
        ...prev,
        ...rows.map(n => ({
          id: n.id,
          type: n.type,
          text: n.text,
          createdAt: n.created_at,
          read: !!n.read
        }))
      ].slice(0, MAX_NOTIFICATIONS));
      setNotificationsHasMore(rows.length === NOTIFICATION_PAGE_SIZE);
    } catch {
      setNotificationsHasMore(false);
    }
  }, [notifications.length]);

  const handleLogin = ({ token, user }) => {
    const u = { ...user, token };
    localStorage.setItem('church_user', JSON.stringify(u));
    api.setToken(token);
    notifiedEventIdsRef.current = new Set();
    
    // Initialize session security manager
    initSessionManager();
    
    setUser(u);
    setCurrentPage('dashboard');
  };

  const handleUserUpdate = ({ token, user }) => {
    const u = { ...user, token };
    localStorage.setItem('church_user', JSON.stringify(u));
    api.setToken(token);
    setUser(u);
  };

  const handleLogout = () => {
    if (sessionManagerRef.current) {
      sessionManagerRef.current.destroy();
      sessionManagerRef.current = null;
    }
    localStorage.removeItem('church_user');
    api.setToken(null);
    setUser(null);
    setEventsForNotify([]);
    notifiedEventIdsRef.current = new Set();
    setCurrentPage('landing');
    setSessionWarning(null);
  };

  // Session warning notification
  useEffect(() => {
    if (sessionWarning && user) {
      addNotification({
        type: 'warning',
        text: `Your session will expire in ${sessionWarning} minutes due to inactivity. Click anywhere to stay logged in.`,
        dedupeKey: 'session_warning'
      });
    }
  }, [sessionWarning, user, addNotification]);

  // Reset session activity on any interaction
  useEffect(() => {
    if (!user || !sessionManagerRef.current) return;
    
    const handleActivity = () => {
      sessionManagerRef.current.resetSession();
    };
    
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, handleActivity, { passive: true }));
    
    return () => {
      events.forEach(e => window.removeEventListener(e, handleActivity));
    };
  }, [user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionManagerRef.current) {
        sessionManagerRef.current.destroy();
      }
    };
  }, []);

  return (
    <ErrorBoundary>
      <ToastProvider>
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
            <AdminDashboard user={user} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />
          ) : (
            <Dashboard user={user} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />
          )}
          <NotificationCenter
            items={notifications}
            onMarkRead={markNotificationRead}
            onMarkAllRead={markAllNotificationsRead}
            onClearAll={clearNotifications}
            onDelete={deleteNotification}
            onLoadMore={loadMoreNotifications}
            hasMore={notificationsHasMore}
          />
        </>
      )}
      </SocketContext.Provider>
    </ToastProvider>
    </ErrorBoundary>
  );
}
