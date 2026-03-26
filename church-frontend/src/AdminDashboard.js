import React, { useEffect, useState, useContext, useMemo } from 'react';
import api from './api';
import { useCallback } from 'react';
import CalendarViewNew from './CalendarViewNew';
import { SocketContext } from './App';
import AdminRequestPanel from './AdminRequestPanel';

/* ---------- shared styles (parish palette) ---------- */
const stone = '#f8f4ec';
const ink = '#1f2a44';
const gold = '#d6ad60';
const mist = '#e7dfcf';
const accentBlue = '#3b5b8a';

const th = {
  padding: 10,
  border: `1px solid ${mist}`,
  textAlign: 'left',
  background: mist,
  color: ink,
};

const td = {
  padding: 10,
  border: `1px solid ${mist}`,
  color: ink,
  background: '#fff',
};

const dangerBtn = {
  padding: '8px 12px',
  background: '#b0413e',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  boxShadow: '0 3px 10px rgba(0,0,0,0.12)',
  fontWeight: 600,
};

export default function AdminDashboard({ user, onLogout }) {
  const socket = useContext(SocketContext);

  const [activeTab, setActiveTab] = useState('calendar');
  const [bookings, setBookings] = useState([]);
  const [records, setRecords] = useState([]);
  const [events, setEvents] = useState([]);
  const [calendarConfig, setCalendarConfig] = useState({});
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventError, setEventError] = useState(null);
  const [eventSaving, setEventSaving] = useState(false);
  const [bookingControlDate, setBookingControlDate] = useState('');
  const [bookingMaxSlots, setBookingMaxSlots] = useState('5');
  const [bookingControlMsg, setBookingControlMsg] = useState('');
  const [bookingControlBusy, setBookingControlBusy] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [eventSearch, setEventSearch] = useState('');
  const [bookingSearch, setBookingSearch] = useState('');
  const [recordSearch, setRecordSearch] = useState('');
  const [eventFilter, setEventFilter] = useState('upcoming'); // 'upcoming' | 'past'
  const [bookingFilter, setBookingFilter] = useState('upcoming'); // 'upcoming' | 'past'
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const editEvent = async (event) => {
    const title = window.prompt('Title', event.title || '');
    if (title === null) return;
    const date = window.prompt('Date (YYYY-MM-DD)', event.date || '');
    if (date === null) return;
    const time = window.prompt('Time (optional, HH:MM)', event.time || '');
    if (time === null) return;
    const description = window.prompt('Description (optional)', event.description || '');
    if (description === null) return;

    try {
      await api.events.update(event.id, { title, date, time, description });
      await loadData();
    } catch (err) {
      window.alert(err.response?.data?.error || 'Failed to edit event.');
    }
  };

  const editAcceptedBooking = async (booking) => {
    const service = window.prompt('Service', booking.service || '');
    if (service === null) return;
    const date = window.prompt('Date (YYYY-MM-DD)', booking.date || '');
    if (date === null) return;
    const slot = window.prompt('Time slot (HH:MM, AM, or PM)', booking.slot || '');
    if (slot === null) return;
    const detailsText = window.prompt(
      'Details Information',
      JSON.stringify(booking.details || {}, null, 2)
    );
    if (detailsText === null) return;

    let details = {};
    try {
      details = detailsText.trim() ? JSON.parse(detailsText) : {};
    } catch {
      window.alert('Invalid details JSON.');
      return;
    }

    try {
      await api.bookings.update(booking.id, { service, date, slot, details });
      await loadData();
    } catch (err) {
      window.alert(err.response?.data?.error || 'Failed to edit booking.');
    }
  };

  /* ---------- load all admin data ---------- */
  const loadData = async () => {
    try {
      const [b, r, e, c, u] = await Promise.all([
        api.bookings.list(),
        api.bookingRecords.list(),
        api.events.list(),
        api.calendar.get(),
        api.users.list(),
      ]);

      setBookings(b.data || []);
      setRecords(r.data || []);
      setEvents(e.data || []);
      setCalendarConfig(c.data || {});
      setUsers(u.data || []);
    } catch (err) {
      console.error('Admin load failed', err);
    } finally {
      setLoading(false);
    }
  };

  /* ---------- socket refresh ---------- */
  useEffect(() => {
    loadData();

    const refresh = () => loadData();

    socket.on('new_booking', refresh);
    socket.on('booking_updated', refresh);
    socket.on('booking_deleted', refresh);
    socket.on('booking_request_created', refresh);
    socket.on('booking_request_updated', refresh);
    socket.on('event_created', refresh);
    socket.on('event_updated', refresh);
    socket.on('event_deleted', refresh);
    socket.on('calendar_config_updated', refresh);

    return () => {
      socket.off('new_booking', refresh);
      socket.off('booking_updated', refresh);
      socket.off('booking_deleted', refresh);
      socket.off('booking_request_created', refresh);
      socket.off('booking_request_updated', refresh);
      socket.off('event_created', refresh);
      socket.off('event_updated', refresh);
      socket.off('event_deleted', refresh);
      socket.off('calendar_config_updated', refresh);
    };
  }, [socket]);

  useEffect(() => {
    if (!bookingControlDate) return;
    const configured = calendarConfig?.[bookingControlDate]?.max_slots;
    if (configured === undefined || configured === null) {
      setBookingMaxSlots('5');
    } else {
      setBookingMaxSlots(String(configured));
    }
  }, [bookingControlDate, calendarConfig]);

  const userSearchTerm = userSearch.trim().toLowerCase();
  const eventSearchTerm = eventSearch.trim().toLowerCase();
  const bookingSearchTerm = bookingSearch.trim().toLowerCase();
  const recordSearchTerm = recordSearch.trim().toLowerCase();

  const filteredUsers = useMemo(
    () => users.filter(u => {
      if (!userSearchTerm) return true;
      return [u.id, u.name, u.email, u.role]
        .map(v => String(v || '').toLowerCase())
        .some(v => v.includes(userSearchTerm));
    }),
    [users, userSearchTerm]
  );

  const filteredEvents = useMemo(
    () => events.filter(e => {
      if (!eventSearchTerm) return true;
      return [e.id, e.title, e.date, e.time]
        .map(v => String(v || '').toLowerCase())
        .some(v => v.includes(eventSearchTerm));
    }),
    [events, eventSearchTerm]
  );

  const now = useMemo(() => new Date(), []);
  const isPastEvent = (evt) => {
    if (!evt?.date) return false;
    const base = evt.time ? `${evt.date}T${evt.time}` : `${evt.date}T23:59`;
    const dt = new Date(base);
    if (Number.isNaN(dt.getTime())) {
      const dayOnly = new Date(`${evt.date}T23:59`);
      return dayOnly < now;
    }
    return dt < now;
  };

  const filteredEventsByStatus = useMemo(() => {
    return filteredEvents.filter(e =>
      eventFilter === 'past' ? isPastEvent(e) : !isPastEvent(e)
    );
  }, [filteredEvents, eventFilter]);

  const eventCounts = useMemo(() => {
    const upcoming = filteredEvents.filter(e => !isPastEvent(e)).length;
    const past = filteredEvents.length - upcoming;
    return { upcoming, past };
  }, [filteredEvents]);

  const filteredBookings = useMemo(
    () => bookings.filter(b => {
      if (!bookingSearchTerm) return true;
      return [b.id, b.name, b.email, b.service, b.date, b.slot]
        .map(v => String(v || '').toLowerCase())
        .some(v => v.includes(bookingSearchTerm));
    }),
    [bookings, bookingSearchTerm]
  );

  const isPastDateTime = (date, time) => {
    if (!date) return false;
    const base = time ? `${date}T${time}` : `${date}T23:59`;
    const dt = new Date(base);
    if (Number.isNaN(dt.getTime())) {
      const dayOnly = new Date(`${date}T23:59`);
      return dayOnly < now;
    }
    return dt < now;
  };

  const filteredBookingsByStatus = useMemo(() => {
    return filteredBookings.filter(b =>
      bookingFilter === 'past'
        ? isPastDateTime(b.date, b.slot)
        : !isPastDateTime(b.date, b.slot)
    );
  }, [filteredBookings, bookingFilter]);

  const bookingCounts = useMemo(() => {
    const upcoming = filteredBookings.filter(b => !isPastDateTime(b.date, b.slot)).length;
    const past = filteredBookings.length - upcoming;
    return { upcoming, past };
  }, [filteredBookings]);

  const filteredRecords = useMemo(
    () => records.filter(r => {
      if (!recordSearchTerm) return true;
      const detailsText = r.details && typeof r.details === 'object'
        ? JSON.stringify(r.details)
        : String(r.details || '');
      return [r.id, r.name, r.email, r.service, r.date, r.slot, r.action, r.actionAt, detailsText]
        .map(v => String(v || '').toLowerCase())
        .some(v => v.includes(recordSearchTerm));
    }),
    [records, recordSearchTerm]
  );

  const reportData = useMemo(() => {
    const serviceCounts = bookings.reduce((acc, b) => {
      const key = String(b.service || 'unknown');
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const actionCounts = records.reduce((acc, r) => {
      const key = String(r.action || 'unknown');
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const roleCounts = users.reduce((acc, u) => {
      const key = String(u.role || 'member');
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return {
      totalUsers: users.length,
      totalEvents: events.length,
      totalBookings: bookings.length,
      totalRecords: records.length,
      serviceCounts,
      actionCounts,
      roleCounts
    };
  }, [bookings, records, users, events]);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const todayEvents = useMemo(
    () => events.filter(e => e.date === todayStr).length,
    [events, todayStr]
  );
  const todayBookings = useMemo(
    () => bookings.filter(b => b.date === todayStr).length,
    [bookings, todayStr]
  );

  const activeTabLabel = useMemo(() => {
    const map = {
      calendar: 'Parish Calendar',
      users: 'Parishioners',
      events: 'Events',
      bookings: 'Bookings',
      requests: 'Request Panel',
      records: 'Records',
      reports: 'Reports',
      add_event: 'Add Event'
    };
    return map[activeTab] || '';
  }, [activeTab]);

  const activeTabIcon = useMemo(() => {
    const map = {
      calendar: '⛪',
      users: '👥',
      events: '🕯',
      bookings: '📅',
      requests: '📜',
      records: '📖',
      reports: '🕊',
      add_event: '✚'
    };
    return map[activeTab] || '';
  }, [activeTab]);

  const buildPie = useCallback((dataObj) => {
    const entries = Object.entries(dataObj || {}).sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((sum, [, v]) => sum + v, 0) || 1;
    let acc = 0;
    const colors = ['#667eea', '#38a169', '#ed8936', '#b0413e', '#3182ce', '#d6ad60'];
    const segments = entries.map(([label, count], idx) => {
      const start = (acc / total) * 360;
      acc += count;
      const end = (acc / total) * 360;
      return `${colors[idx % colors.length]} ${start}deg ${end}deg`;
    });
    return {
      gradient: `conic-gradient(${segments.join(', ')})`,
      entries,
      colors
    };
  }, []);

  const servicePie = useMemo(() => buildPie(reportData.serviceCounts), [reportData.serviceCounts, buildPie]);
  const actionPie = useMemo(() => buildPie(reportData.actionCounts), [reportData.actionCounts, buildPie]);
  const rolePie = useMemo(() => buildPie(reportData.roleCounts), [reportData.roleCounts, buildPie]);
  const nextEvent = useMemo(() => {
    const upcoming = events
      .map(e => ({
        ...e,
        _ts: new Date(e.time ? `${e.date}T${e.time}` : `${e.date}T00:00`).getTime()
      }))
      .filter(e => !Number.isNaN(e._ts) && e._ts >= Date.now())
      .sort((a, b) => a._ts - b._ts);
    return upcoming[0] || null;
  }, [events]);

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div
      className="dashboard-page"
      style={{
        background:
          "linear-gradient(135deg, rgba(248, 244, 236, 0.9), rgba(255,255,255,0.82)), url('/login-bg.jpg') center/cover no-repeat fixed"
      }}
    >
      <div className="dashboard-brand" style={{ paddingTop: 12, paddingBottom: 8 }}>
        <div className="dashboard-brand-title" style={{ color: ink, textShadow: '0 4px 20px rgba(0,0,0,0.12)' }}>Parish Admin</div>
        <div className="dashboard-brand-subtitle" style={{ color: ink }}>
          Serving schedules, sacraments, and community care
        </div>
        <div style={{
          marginTop: 10,
          background: 'linear-gradient(90deg, rgba(59,91,138,0.12), rgba(214,173,96,0.25), rgba(176,65,62,0.18))',
          borderRadius: 10,
          padding: '10px 16px',
          color: ink,
          fontSize: 13,
          boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
          display: 'inline-block'
        }}>
          “Let all that you do be done in love.” — 1 Corinthians 16:14
        </div>
      </div>
    <div className={`dashboard-layout dashboard-two-col ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      <button
        className="sidebar-toggle-btn"
        aria-label={sidebarOpen ? 'Hide navigation panel' : 'Show navigation panel'}
        onClick={() => setSidebarOpen(v => !v)}
      >
        {sidebarOpen ? '\u2715' : '\u2630'}
      </button>
      <div className="dashboard-left-column">
      <aside className="dashboard-sidebar dashboard-left-panel" style={{ background: '#fff', borderRadius: 14, boxShadow: '0 10px 26px rgba(0,0,0,0.1)', border: `1px solid ${mist}` }}>
        <div className="dashboard-sidebar-header" style={{ paddingBottom: 6 }}>
          <h3 style={{ margin: 0, color: ink }}>Admin Panel</h3>
        </div>
        {/* Tab buttons on expandable sidebar */}
        <div style={{ background: '#f9fafb', borderRadius: 16, padding: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{
            background: '#fff',
            borderRadius: 18,
            padding: '12px 14px',
            boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            border: `1px solid ${mist}`
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: '#cbd5e0',
              overflow: 'hidden',
              display: 'grid', placeItems: 'center',
              fontWeight: 800, color: ink
            }}>
              {(user?.name || 'U')[0]}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 17, color: ink }}>
                {user?.name || 'Admin User'}
              </div>
              <div style={{ color: '#6b7280', fontSize: 13 }}>
                {user?.email || 'admin@parish.local'}
              </div>
            </div>
            <div style={{
              background: '#fff5f5',
              color: '#b0413e',
              borderRadius: 14,
              padding: '6px 10px',
              fontWeight: 700,
              border: '1px solid #ffd7d7'
            }}>
              Admin
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 12
          }}>
            {[
              { key: 'calendar', label: 'Calendar', icon: '📅' },
              { key: 'requests', label: 'Requests', icon: '📜' },
              { key: 'bookings', label: 'Bookings', icon: '✅' },
              { key: 'events', label: 'Events', icon: '🕯' },
              { key: 'users', label: 'Parishioners', icon: '👥' },
              { key: 'records', label: 'Records', icon: '📖' },
              { key: 'reports', label: 'Reports', icon: '🕊' },
              { key: 'add_event', label: 'Add Event', icon: '✚' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  background: '#fff',
                  borderRadius: 16,
                  border: `1px solid ${activeTab === tab.key ? accentBlue : mist}`,
                  padding: '12px 10px',
                  textAlign: 'center',
                  transition: 'all 0.2s ease',
                  boxShadow: activeTab === tab.key ? `0 4px 12px ${accentBlue}30` : 'none'
                }}
              >
                <div style={{ fontSize: 20, marginBottom: 4 }}>{tab.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: ink }}>{tab.label}</div>
              </button>
            ))}
          </div>
        </div>
      </aside>
      </div>

      {/* ---------- MAIN CONTENT ---------- */}
      <section className="dashboard-right-column" style={{ background: 'rgba(255,255,255,0.86)', borderRadius: 18, border: `1px solid ${mist}`, boxShadow: '0 18px 36px rgba(0,0,0,0.1)', padding: 10, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ marginBottom: 10, padding: '6px 10px', background: 'linear-gradient(90deg, rgba(59,91,138,0.12), rgba(214,173,96,0.12))', borderRadius: 10, color: ink, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>🗓 Parish Calendar</span>
          <span style={{ fontSize: 12, color: '#4a5568' }}>Tap a date to view or add bookings</span>
        </div>
        <CalendarViewNew
          bookings={bookings}
          calendarBookings={bookings}
          events={events}
          calendarConfig={calendarConfig}
          user={user}
          isAdmin
        />

      <div className="dashboard-main dashboard-left-content" style={{ background: '#fff', borderRadius: 16, boxShadow: '0 18px 40px rgba(0,0,0,0.1)', border: `1px solid ${mist}`, padding: 16 }}>
        {/* TAB CONTENT */}
        {activeTab === 'calendar' && (
          <div>
            <div
              style={{
                marginBottom: 16,
                background: '#fff',
                padding: 12,
                borderRadius: 8,
                border: `1px solid ${mist}`,
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                flexWrap: 'wrap'
              }}
            >
              <strong>Booking Date Controls</strong>
              <input
                type="date"
                value={bookingControlDate}
                onChange={e => setBookingControlDate(e.target.value)}
                style={{ padding: 8, borderRadius: 6, border: `1px solid ${mist}` }}
              />
              <input
                type="number"
                min="0"
                value={bookingMaxSlots}
                onChange={e => setBookingMaxSlots(e.target.value)}
                placeholder="Max bookings"
                style={{ width: 140, padding: 8, borderRadius: 6, border: `1px solid ${mist}` }}
              />
              <button
                disabled={!bookingControlDate || bookingControlBusy}
                onClick={async () => {
                  const maxSlots = Number(bookingMaxSlots);
                  if (!Number.isFinite(maxSlots) || maxSlots < 0) {
                    setBookingControlMsg('Max bookings must be 0 or more.');
                    return;
                  }
                  try {
                    setBookingControlBusy(true);
                    setBookingControlMsg('');
                    await api.calendar.update({ date: bookingControlDate, max_slots: maxSlots });
                    setBookingControlMsg(`Set ${bookingControlDate} max bookings to ${maxSlots}.`);
                    await loadData();
                  } catch (err) {
                    setBookingControlMsg(err.response?.data?.error || 'Failed to set max bookings.');
                  } finally {
                    setBookingControlBusy(false);
                  }
                }}
                style={{
                  padding: '8px 12px',
                  border: 'none',
                  borderRadius: 6,
                  background: accentBlue,
                  color: '#fdfbf5',
                  cursor: 'pointer'
                }}
              >
                Set Max Bookings
              </button>
              <button
                disabled={!bookingControlDate || bookingControlBusy}
                onClick={async () => {
                  try {
                    setBookingControlBusy(true);
                    setBookingControlMsg('');
                    await api.calendar.update({ date: bookingControlDate, max_slots: 0 });
                    setBookingControlMsg(`Closed ${bookingControlDate} for bookings.`);
                    await loadData();
                  } catch (err) {
                    setBookingControlMsg(err.response?.data?.error || 'Failed to close date.');
                  } finally {
                    setBookingControlBusy(false);
                  }
                }}
                style={{
                  padding: '8px 12px',
                  border: 'none',
                  borderRadius: 6,
                  background: '#b0413e',
                  color: '#fff',
                  cursor: 'pointer'
                }}
              >
                Close Date
              </button>
              <button
                disabled={!bookingControlDate || bookingControlBusy}
                onClick={async () => {
                  const value = window.prompt('Set max slots to reopen this date', '5');
                  if (value === null) return;
                  const maxSlots = Number(value);
                  if (!Number.isFinite(maxSlots) || maxSlots <= 0) {
                    setBookingControlMsg('Max slots must be a positive number.');
                    return;
                  }
                  try {
                    setBookingControlBusy(true);
                    setBookingControlMsg('');
                    await api.calendar.update({ date: bookingControlDate, max_slots: maxSlots });
                    setBookingControlMsg(`Opened ${bookingControlDate} with ${maxSlots} slot(s).`);
                    await loadData();
                  } catch (err) {
                    setBookingControlMsg(err.response?.data?.error || 'Failed to open date.');
                  } finally {
                    setBookingControlBusy(false);
                  }
                }}
                style={{
                  padding: '8px 12px',
                  border: 'none',
                  borderRadius: 6,
                  background: gold,
                  color: '#1f1a12',
                  cursor: 'pointer'
                }}
              >
                Open Date
              </button>
              {bookingControlMsg && (
                <span style={{ fontSize: 13, color: '#2d3748' }}>{bookingControlMsg}</span>
              )}
            </div>

          </div>
        )}

        {/* USERS */}
        {activeTab === 'users' && (
          <div>
            <h2>Users</h2>
            <input
              type="text"
              placeholder="Search users by id, name, email, role"
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              style={{ width: '100%', maxWidth: 420, marginBottom: 12, padding: 10, border: `1px solid ${mist}`, borderRadius: 6, background: '#fff' }}
            />
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>ID</th>
                  <th style={th}>Name</th>
                  <th style={th}>Email</th>
                  <th style={th}>Role</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id}>
                    <td style={td}>{u.id}</td>
                    <td style={td}>{u.name}</td>
                    <td style={td}>{u.email}</td>
                    <td style={td}>{u.role}</td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td style={td} colSpan={4}>No users match your search.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* EVENTS */}
        {activeTab === 'events' && (
          <div>
            <h2>Events</h2>
            <input
            type="text"
            placeholder="Search events by id, title, date, time"
            value={eventSearch}
            onChange={e => setEventSearch(e.target.value)}
            style={{ width: '100%', maxWidth: 420, marginBottom: 12, padding: 10, border: `1px solid ${mist}`, borderRadius: 6, background: '#fff' }}
          />
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <button
              onClick={() => setEventFilter('upcoming')}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: eventFilter === 'upcoming' ? `2px solid ${accentBlue}` : `1px solid ${mist}`,
                background: eventFilter === 'upcoming' ? '#eef3fb' : '#fff',
                color: accentBlue,
                cursor: 'pointer'
              }}
            >
              Upcoming ({eventCounts.upcoming})
            </button>
            <button
              onClick={() => setEventFilter('past')}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: eventFilter === 'past' ? `2px solid ${gold}` : `1px solid ${mist}`,
                background: eventFilter === 'past' ? '#faf4e6' : '#fff',
                color: '#7c6230',
                cursor: 'pointer'
              }}
            >
              History ({eventCounts.past})
            </button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 40 }}>
            <thead>
              <tr>
                <th style={th}>ID</th>
                <th style={th}>Title</th>
                <th style={th}>Date</th>
                <th style={th}>Time</th>
                <th style={th}>Status</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEventsByStatus.map(e => {
                const past = isPastEvent(e);
                return (
                  <tr key={e.id}>
                    <td style={td}>{e.id}</td>
                    <td style={td}>{e.title}</td>
                    <td style={td}>{e.date}</td>
                    <td style={td}>{e.time || '-'}</td>
                    <td style={{ ...td, color: past ? '#b0413e' : '#2f855a', fontWeight: 600 }}>
                      {past ? 'Passed' : 'Upcoming'}
                    </td>
                    <td style={td}>
                      <button
                        style={{ ...dangerBtn, background: accentBlue, marginRight: 8 }}
                        onClick={() => editEvent(e)}
                      >
                        Edit
                      </button>
                      <button
                        style={dangerBtn}
                        onClick={async () => {
                          if (window.confirm('Delete this event?')) {
                            await api.events.remove(e.id);
                            loadData();
                          }
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredEventsByStatus.length === 0 && (
                <tr>
                  <td style={td} colSpan={6}>No events match your search.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* BOOKINGS */}
      {activeTab === 'bookings' && (
        <div>
          <h2>Bookings</h2>
          <input
            type="text"
            placeholder="Search bookings by id, user, service, date, time"
            value={bookingSearch}
            onChange={e => setBookingSearch(e.target.value)}
            style={{ width: '100%', maxWidth: 460, marginBottom: 12, padding: 10, border: `1px solid ${mist}`, borderRadius: 6, background: '#fff' }}
          />
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <button
              onClick={() => setBookingFilter('upcoming')}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: bookingFilter === 'upcoming' ? `2px solid ${accentBlue}` : `1px solid ${mist}`,
                background: bookingFilter === 'upcoming' ? '#eef3fb' : '#fff',
                color: accentBlue,
                cursor: 'pointer'
              }}
            >
              Upcoming ({bookingCounts.upcoming})
            </button>
            <button
              onClick={() => setBookingFilter('past')}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: bookingFilter === 'past' ? `2px solid ${gold}` : `1px solid ${mist}`,
                background: bookingFilter === 'past' ? '#faf4e6' : '#fff',
                color: '#7c6230',
                cursor: 'pointer'
              }}
            >
              History ({bookingCounts.past})
            </button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>ID</th>
                <th style={th}>User</th>
                <th style={th}>Service</th>
                <th style={th}>Date</th>
                <th style={th}>Time</th>
                <th style={th}>Status</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookingsByStatus.map(b => {
                const past = isPastDateTime(b.date, b.slot);
                return (
                  <tr key={b.id}>
                    <td style={td}>{b.id}</td>
                    <td style={td}>{b.name || b.email}</td>
                    <td style={td}>{b.service}</td>
                    <td style={td}>{b.date}</td>
                    <td style={td}>{b.slot}</td>
                    <td style={{ ...td, color: past ? '#b0413e' : '#2f855a', fontWeight: 600 }}>
                      {past ? 'Passed' : 'Upcoming'}
                    </td>
                    <td style={td}>
                      <button
                        style={{ ...dangerBtn, background: accentBlue, marginRight: 8 }}
                        onClick={() => editAcceptedBooking(b)}
                      >
                        Edit
                      </button>
                      <button
                        style={dangerBtn}
                        onClick={async () => {
                          if (window.confirm('Cancel this booking?')) {
                            await api.bookings.remove(b.id);
                            loadData();
                          }
                        }}
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredBookingsByStatus.length === 0 && (
                <tr>
                  <td style={td} colSpan={7}>No bookings match your search.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

        {activeTab === 'requests' && (
          <AdminRequestPanel onDecision={loadData} />
        )}

        {activeTab === 'records' && (
          <div>
            <h2>Booking Records</h2>
            <input
              type="text"
              placeholder="Search records by user, service, action, date, details"
              value={recordSearch}
              onChange={e => setRecordSearch(e.target.value)}
              style={{ width: '100%', maxWidth: 500, marginBottom: 12, padding: 10, border: `1px solid ${mist}`, borderRadius: 6, background: '#fff' }}
            />
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>ID</th>
                  <th style={th}>User</th>
                  <th style={th}>Service</th>
                  <th style={th}>Date</th>
                  <th style={th}>Slot</th>
                  <th style={th}>Action</th>
                  <th style={th}>Details</th>
                  <th style={th}>At</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map(r => (
                  <tr key={r.id}>
                    <td style={td}>{r.id}</td>
                    <td style={td}>{r.name || r.email || '-'}</td>
                    <td style={td}>{r.service || '-'}</td>
                    <td style={td}>{r.date || '-'}</td>
                    <td style={td}>{r.slot || '-'}</td>
                    <td style={{ ...td, textTransform: 'capitalize' }}>{r.action || '-'}</td>
                    <td style={td}>
                      {r.details && typeof r.details === 'object'
                        ? Object.entries(r.details)
                            .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== '')
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(' | ')
                        : '-'}
                    </td>
                    <td style={td}>{r.actionAt || '-'}</td>
                  </tr>
                ))}
                {filteredRecords.length === 0 && (
                  <tr>
                    <td style={td} colSpan={8}>No booking records match your search.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'reports' && (
          <div>
            <h2>Reporting</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginBottom: 16 }}>
              <div style={{ background: '#fff', border: `1px solid ${mist}`, borderRadius: 8, padding: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
                <div style={{ color: '#6b7280', fontSize: 12 }}>Total Parishioners</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: ink }}>{reportData.totalUsers}</div>
              </div>
              <div style={{ background: '#fff', border: `1px solid ${mist}`, borderRadius: 8, padding: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
                <div style={{ color: '#6b7280', fontSize: 12 }}>Total Liturgies & Events</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: ink }}>{reportData.totalEvents}</div>
              </div>
              <div style={{ background: '#fff', border: `1px solid ${mist}`, borderRadius: 8, padding: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
                <div style={{ color: '#6b7280', fontSize: 12 }}>Sacrament Bookings</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: ink }}>{reportData.totalBookings}</div>
              </div>
              <div style={{ background: '#fff', border: `1px solid ${mist}`, borderRadius: 8, padding: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
                <div style={{ color: '#6b7280', fontSize: 12 }}>History Logged</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: ink }}>{reportData.totalRecords}</div>
              </div>
            </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 12 }}>
                <div style={{ background: '#fff', border: `1px solid ${mist}`, borderRadius: 8, padding: 12, display: 'grid', gridTemplateColumns: '120px 1fr', gap: 10, alignItems: 'center' }}>
                  <div style={{
                    width: 120,
                    height: 120,
                    borderRadius: '50%',
                    background: servicePie.gradient,
                    border: `2px solid ${mist}`,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                  }} aria-label="Bookings by service distribution" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <h4 style={{ margin: 0 }}>Bookings by Service</h4>
                    {servicePie.entries.length === 0 ? (
                      <div style={{ color: '#666' }}>No booking data.</div>
                    ) : servicePie.entries.map(([label, value], idx) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 999, background: servicePie.colors[idx % servicePie.colors.length] }} />
                        <span style={{ flex: 1 }}>{label}</span>
                        <span style={{ fontWeight: 700 }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ background: '#fff', border: `1px solid ${mist}`, borderRadius: 8, padding: 12, display: 'grid', gridTemplateColumns: '120px 1fr', gap: 10, alignItems: 'center' }}>
                  <div style={{
                    width: 120,
                    height: 120,
                    borderRadius: '50%',
                    background: actionPie.gradient,
                    border: `2px solid ${mist}`,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                  }} aria-label="Records by action distribution" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <h4 style={{ margin: 0 }}>Records by Action</h4>
                    {actionPie.entries.length === 0 ? (
                      <div style={{ color: '#666' }}>No record data.</div>
                    ) : actionPie.entries.map(([label, value], idx) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 999, background: actionPie.colors[idx % actionPie.colors.length] }} />
                        <span style={{ flex: 1 }}>{label}</span>
                        <span style={{ fontWeight: 700 }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ background: '#fff', border: `1px solid ${mist}`, borderRadius: 8, padding: 12, display: 'grid', gridTemplateColumns: '120px 1fr', gap: 10, alignItems: 'center' }}>
                  <div style={{
                    width: 120,
                    height: 120,
                    borderRadius: '50%',
                    background: rolePie.gradient,
                    border: `2px solid ${mist}`,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                  }} aria-label="Users by role distribution" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <h4 style={{ margin: 0 }}>Users by Role</h4>
                    {rolePie.entries.length === 0 ? (
                      <div style={{ color: '#666' }}>No user data.</div>
                    ) : rolePie.entries.map(([label, value], idx) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 999, background: rolePie.colors[idx % rolePie.colors.length] }} />
                        <span style={{ flex: 1 }}>{label}</span>
                        <span style={{ fontWeight: 700 }}>{value}</span>
                      </div>
                    ))}
                </div>
                </div>
              </div>
            </div>
          )}

        {/* ADD EVENT */}
        {activeTab === 'add_event' && (
          <div style={{ maxWidth: 520 }}>
            <h2>Add Church Event</h2>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 6 }}>Title</label>
              <input
                type="text"
                value={eventTitle}
                onChange={e => setEventTitle(e.target.value)}
                placeholder="Event title"
                style={{ width: '100%', padding: 10, borderRadius: 6, border: `1px solid ${mist}`, background: '#fff' }}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 6 }}>Date</label>
              <input
                type="date"
                value={eventDate}
                onChange={e => setEventDate(e.target.value)}
                style={{ width: '100%', padding: 10, borderRadius: 6, border: `1px solid ${mist}`, background: '#fff' }}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 6 }}>Time (optional)</label>
              <input
                type="time"
                value={eventTime}
                onChange={e => setEventTime(e.target.value)}
                step="60"
                style={{ width: '100%', padding: 10, borderRadius: 6, border: `1px solid ${mist}`, background: '#fff' }}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 6 }}>Description (optional)</label>
              <textarea
                value={eventDescription}
                onChange={e => setEventDescription(e.target.value)}
                placeholder="Notes about the event"
                rows={4}
                style={{ width: '100%', padding: 10, borderRadius: 6, border: `1px solid ${mist}`, background: '#fff' }}
              />
            </div>
            {eventError && (
              <div style={{ color: 'red', marginBottom: 12 }}>{eventError}</div>
            )}
            <button
              disabled={eventSaving}
              onClick={async () => {
                if (!eventTitle.trim() || !eventDate) {
                  setEventError('Title and date are required.');
                  return;
                }
                try {
                  setEventSaving(true);
                  setEventError(null);
                  await api.events.create({
                    title: eventTitle.trim(),
                    date: eventDate,
                    time: eventTime.trim(),
                    description: eventDescription.trim()
                  });
                  setEventTitle('');
                  setEventDate('');
                  setEventTime('');
                  setEventDescription('');
                  loadData();
                  setActiveTab('events');
                } catch (err) {
                  setEventError(err.response?.data?.error || 'Failed to create event.');
                } finally {
                  setEventSaving(false);
                }
              }}
              style={{
                padding: '10px 14px',
                background: gold,
                color: ink,
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer'
              }}
            >
              {eventSaving ? 'Saving...' : 'Create Event'}
            </button>
          </div>
        )}
      </div>
    </section>
  </div>
</div>
  );
}
