import React, { useEffect, useState, useContext, useCallback, useMemo } from 'react';
import api from './api';
import CalendarViewNew from './CalendarViewNew';
import { SocketContext } from './App';

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

export default function Dashboard({ user, onLogout, onUserUpdate }) {
  const socket = useContext(SocketContext);

  const [bookings, setBookings] = useState([]);
  const [bookingRequests, setBookingRequests] = useState([]);
  const [events, setEvents] = useState([]);
  const [calendarBookings, setCalendarBookings] = useState([]);
  const [calendarConfig, setCalendarConfig] = useState({});
  const [myConcerns, setMyConcerns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('events'); // events | bookings | requests | calendar | concerns | tracking
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [concernOpen, setConcernOpen] = useState(false);
  const [concernSubject, setConcernSubject] = useState('');
  const [concernMessage, setConcernMessage] = useState('');
  const [concernSaving, setConcernSaving] = useState(false);
  const [concernError, setConcernError] = useState('');
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');
  const [profilePassword, setProfilePassword] = useState('');
  const [profileConfirm, setProfileConfirm] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [timeTrigger, setTimeTrigger] = useState(0);

  useEffect(() => {
    if (!user) return;
    setProfileName(user.name || '');
    setProfileEmail(user.email || '');
  }, [user]);

  const loadData = useCallback(async () => {
    try {
      const [b, br, e, c, s, myc] = await Promise.all([
        api.bookings.list(),
        api.bookingRequests.my(),
        api.events.list(),
        api.calendar.get(),
        api.bookings.slots(),
        api.concerns.my()
      ]);

      setBookings(b.data || []);
      setBookingRequests(br.data || []);
      setEvents(e.data || []);
      setCalendarConfig(c.data || {});
      setCalendarBookings(s.data || []);
      setMyConcerns(myc.data || []);
    } catch (err) {
      console.error('Dashboard load failed', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    if (!socket) return;
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
  }, [socket, loadData]);

  // Update every second to refresh time-based calculations
  useEffect(() => {
    const intervalId = setInterval(() => {
      setTimeTrigger(t => t + 1);
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (activeTab !== 'events' && activeTab !== 'bookings' && activeTab !== 'requests' && activeTab !== 'calendar' && activeTab !== 'concerns' && activeTab !== 'tracking') return;
    const intervalId = setInterval(() => {
      loadData();
    }, 1000);
    return () => clearInterval(intervalId);
  }, [activeTab, loadData]);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const todayEventsCount = useMemo(
    () => events.filter(e => e.date === todayStr).length,
    [events, todayStr]
  );
  const todayBookingsCount = useMemo(
    () => bookings.filter(b => b.date === todayStr).length,
    [bookings, todayStr]
  );

  const normalizeSlotToTime = (slot) => {
    const raw = String(slot || '').trim();
    if (!raw) return null;
    
    const upper = raw.toUpperCase();
    if (upper === 'AM') return '09:00';
    if (upper === 'PM') return '15:00';
    
    // Try HH:MM format
    let m = raw.match(/^(\d{1,2}):(\d{2})$/);
    if (m) {
      const hh = String(Math.min(23, Math.max(0, Number(m[1])))).padStart(2, '0');
      const mm = String(Math.min(59, Math.max(0, Number(m[2])))).padStart(2, '0');
      return `${hh}:${mm}`;
    }
    
    // Try HH:MM:SS format
    m = raw.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
    if (m) {
      const hh = String(Math.min(23, Math.max(0, Number(m[1])))).padStart(2, '0');
      const mm = String(Math.min(59, Math.max(0, Number(m[2])))).padStart(2, '0');
      return `${hh}:${mm}`;
    }
    
    // Try just hours (like "14" = 2 PM)
    m = raw.match(/^(\d{1,2})$/);
    if (m) {
      const hh = String(Math.min(23, Math.max(0, Number(m[1])))).padStart(2, '0');
      return `${hh}:00`;
    }
    
    // Try time with AM/PM suffix (like "2:30 PM")
    m = raw.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
    if (m) {
      let hh = Number(m[1]);
      const mm = String(Math.min(59, Math.max(0, Number(m[2])))).padStart(2, '0');
      const isPM = m[3].toUpperCase() === 'PM';
      
      if (isPM && hh !== 12) hh += 12;
      if (!isPM && hh === 12) hh = 0;
      
      hh = Math.min(23, Math.max(0, hh));
      return `${String(hh).padStart(2, '0')}:${mm}`;
    }
    
    return null;
  };

  const upcomingWithinHour = useMemo(() => {
    const now = new Date();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const windowMs = endOfDay.getTime() - Date.now();
    const nowMs = Date.now();
    const upcoming = [];

    events.forEach(e => {
      if (!e.date || !e.time) return;
      const dt = new Date(`${e.date}T${e.time}`);
      const diff = dt.getTime() - nowMs;
      if (Number.isNaN(dt.getTime()) || diff < 0 || diff > windowMs) return;
      upcoming.push({
        type: 'event',
        id: `event-${e.id}`,
        title: e.title,
        date: e.date,
        time: e.time
      });
    });

    bookings.forEach(b => {
      if (!b.date) return;
      const time = normalizeSlotToTime(b.slot);
      if (!time) return;
      const dt = new Date(`${b.date}T${time}`);
      const diff = dt.getTime() - nowMs;
      if (Number.isNaN(dt.getTime()) || diff < 0 || diff > windowMs) return;
      upcoming.push({
        type: 'booking',
        id: `booking-${b.id || `${b.date}-${b.slot}`}`,
        title: b.service || 'Booking',
        date: b.date,
        time
      });
    });

    return upcoming.sort((a, b) => {
      const at = new Date(`${a.date}T${a.time}`).getTime();
      const bt = new Date(`${b.date}T${b.time}`).getTime();
      return at - bt;
    });
  }, [events, bookings, timeTrigger]);

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;

  const activeTabLabel = {
    events: 'Events',
    bookings: 'My Bookings',
    requests: 'My Requests',
    calendar: 'Calendar',
    concerns: 'My Concerns',
    tracking: 'Tracking Actions'
  }[activeTab] || 'Events';

  return (
    <div
      className="dashboard-page"
      style={{
        background:
          "linear-gradient(135deg, rgba(248, 244, 236, 0.9), rgba(255,255,255,0.82)), url('/login-bg.jpg') center/cover no-repeat fixed"
      }}
    >
      <div className="dashboard-brand" style={{ paddingTop: 12, paddingBottom: 8 }}>
        <div className="dashboard-brand-title" style={{ color: ink, textShadow: '0 4px 20px rgba(0,0,0,0.12)' }}>Parish Member</div>
        <div className="dashboard-brand-subtitle" style={{ color: ink }}>
          Your bookings, requests, and upcoming parish events
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

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 12,
        margin: '8px 0 14px'
      }}>
        <div style={{
          background: '#fff',
          borderRadius: 16,
          padding: '12px 14px',
          border: `1px solid ${mist}`,
          boxShadow: '0 8px 20px rgba(0,0,0,0.08)'
        }}>
          <div style={{ color: '#718096', fontSize: 12 }}>Events Today</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: ink }}>{todayEventsCount}</div>
          <div style={{ color: '#718096', fontSize: 12 }}>{todayStr}</div>
        </div>
        <div style={{
          background: '#fff',
          borderRadius: 16,
          padding: '12px 14px',
          border: `1px solid ${mist}`,
          boxShadow: '0 8px 20px rgba(0,0,0,0.08)'
        }}>
          <div style={{ color: '#718096', fontSize: 12 }}>Bookings Today</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: ink }}>{todayBookingsCount}</div>
          <div style={{ color: '#718096', fontSize: 12 }}>{todayStr}</div>
        </div>
        <div style={{
          background: '#fff',
          borderRadius: 16,
          padding: '12px 14px',
          border: `1px solid ${mist}`,
          boxShadow: '0 8px 20px rgba(0,0,0,0.08)'
        }}>
          <div style={{ color: '#718096', fontSize: 12 }}>Upcoming Today</div>
          {upcomingWithinHour.length === 0 ? (
            <div style={{ color: '#718096', fontSize: 14, marginTop: 6 }}>No upcoming events or bookings.</div>
          ) : (
            <div style={{ display: 'grid', gap: 6, marginTop: 6 }}>
              {upcomingWithinHour.map(item => (
                <div key={item.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  fontSize: 13,
                  color: ink
                }}>
                  <div style={{ fontWeight: 700 }}>
                    {item.type === 'event' ? 'Event' : 'Booking'}: {item.title}
                  </div>
                  <div style={{ color: '#4a5568' }}>{item.date} {item.time}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {profileEditorOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.45)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 20,
            padding: 16
          }}
          onClick={() => {
            if (!profileSaving) {
              setProfileEditorOpen(false);
              setProfileError('');
              setProfilePassword('');
              setProfileConfirm('');
            }
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 520,
              background: '#fff',
              borderRadius: 16,
              padding: 20,
              border: `1px solid ${mist}`,
              boxShadow: '0 20px 50px rgba(0,0,0,0.18)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, color: ink }}>Edit Profile</h3>
              <button
                onClick={() => {
                  if (profileSaving) return;
                  setProfileEditorOpen(false);
                  setProfileError('');
                  setProfilePassword('');
                  setProfileConfirm('');
                }}
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  color: '#64748b',
                  fontWeight: 700,
                  padding: '4px 8px'
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6 }}>Name</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  style={{ width: '100%', padding: 10, borderRadius: 8, border: `1px solid ${mist}` }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6 }}>Email</label>
                <input
                  type="email"
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  style={{ width: '100%', padding: 10, borderRadius: 8, border: `1px solid ${mist}` }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6 }}>New Password (optional)</label>
                <input
                  type="password"
                  value={profilePassword}
                  onChange={(e) => setProfilePassword(e.target.value)}
                  style={{ width: '100%', padding: 10, borderRadius: 8, border: `1px solid ${mist}` }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6 }}>Confirm New Password</label>
                <input
                  type="password"
                  value={profileConfirm}
                  onChange={(e) => setProfileConfirm(e.target.value)}
                  style={{ width: '100%', padding: 10, borderRadius: 8, border: `1px solid ${mist}` }}
                />
              </div>
              {profileError && (
                <div style={{ color: '#b0413e', fontWeight: 600 }}>{profileError}</div>
              )}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    if (profileSaving) return;
                    setProfileEditorOpen(false);
                    setProfileError('');
                    setProfilePassword('');
                    setProfileConfirm('');
                  }}
                  style={{
                    background: '#e2e8f0',
                    color: '#1f2937',
                    borderRadius: 10,
                    padding: '8px 12px'
                  }}
                >
                  Cancel
                </button>
                <button
                  disabled={profileSaving}
                  onClick={async () => {
                    setProfileError('');
                    if (profilePassword && profilePassword !== profileConfirm) {
                      setProfileError('Passwords do not match.');
                      return;
                    }
                    if (!profileName.trim() || !profileEmail.trim()) {
                      setProfileError('Name and email are required.');
                      return;
                    }
                    try {
                      setProfileSaving(true);
                      const res = await api.users.updateMe({
                        name: profileName.trim(),
                        email: profileEmail.trim(),
                        password: profilePassword ? profilePassword : undefined
                      });
                      onUserUpdate?.(res.data);
                      setProfileEditorOpen(false);
                      setProfilePassword('');
                      setProfileConfirm('');
                    } catch (err) {
                      setProfileError(err.response?.data?.error || 'Failed to update profile.');
                    } finally {
                      setProfileSaving(false);
                    }
                  }}
                  style={{
                    background: '#1f2a44',
                    color: '#fff',
                    borderRadius: 10,
                    padding: '8px 12px'
                  }}
                >
                  {profileSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {concernOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.45)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 20,
            padding: 16
          }}
          onClick={() => {
            if (!concernSaving) {
              setConcernOpen(false);
              setConcernError('');
            }
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 560,
              background: '#fff',
              borderRadius: 16,
              padding: 20,
              border: `1px solid ${mist}`,
              boxShadow: '0 20px 50px rgba(0,0,0,0.18)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, color: ink }}>Raise a Concern</h3>
              <button
                onClick={() => {
                  if (concernSaving) return;
                  setConcernOpen(false);
                  setConcernError('');
                }}
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  color: '#64748b',
                  fontWeight: 700,
                  padding: '4px 8px'
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6 }}>Subject</label>
                <input
                  type="text"
                  value={concernSubject}
                  onChange={(e) => setConcernSubject(e.target.value)}
                  style={{ width: '100%', padding: 10, borderRadius: 8, border: `1px solid ${mist}` }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6 }}>Message</label>
                <textarea
                  rows={5}
                  value={concernMessage}
                  onChange={(e) => setConcernMessage(e.target.value)}
                  style={{ width: '100%', padding: 10, borderRadius: 8, border: `1px solid ${mist}` }}
                />
              </div>
              {concernError && (
                <div style={{ color: '#b0413e', fontWeight: 600 }}>{concernError}</div>
              )}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    if (concernSaving) return;
                    setConcernOpen(false);
                    setConcernError('');
                  }}
                  style={{
                    background: '#e2e8f0',
                    color: '#1f2937',
                    borderRadius: 10,
                    padding: '8px 12px'
                  }}
                >
                  Cancel
                </button>
                <button
                  disabled={concernSaving}
                  onClick={async () => {
                    const subject = concernSubject.trim();
                    const message = concernMessage.trim();
                    if (!subject || !message) {
                      setConcernError('Subject and message are required.');
                      return;
                    }
                    try {
                      setConcernSaving(true);
                      setConcernError('');
                      await api.concerns.create({ subject, message });
                      setConcernSubject('');
                      setConcernMessage('');
                      setConcernOpen(false);
                    } catch (err) {
                      setConcernError(err.response?.data?.error || 'Failed to send concern.');
                    } finally {
                      setConcernSaving(false);
                    }
                  }}
                  style={{
                    background: accentBlue,
                    color: '#fff',
                    borderRadius: 10,
                    padding: '8px 12px'
                  }}
                >
                  {concernSaving ? 'Sending...' : 'Send Concern'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`dashboard-layout dashboard-two-col ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <button
          className="sidebar-toggle-btn"
          aria-label={sidebarOpen ? 'Hide navigation panel' : 'Show navigation panel'}
          onClick={() => setSidebarOpen(v => !v)}
        >
          {sidebarOpen ? '≡' : '≡'}
        </button>
        <div className="dashboard-left-column">
          <aside className="dashboard-sidebar dashboard-left-panel" style={{ background: '#fff', borderRadius: 14, boxShadow: '0 10px 26px rgba(0,0,0,0.1)', border: `1px solid ${mist}` }}>
            <div className="dashboard-sidebar-header" style={{ paddingBottom: 12, borderBottom: `2px solid ${gold}`, position: 'relative' }}>
              <h3 style={{ margin: '8px 0 0 0', color: ink, textAlign: 'center', fontSize: 17, fontWeight: 800 }}>✦ Member Panel ✦</h3>
              <div style={{ fontSize: 12, textAlign: 'center', color: gold, marginTop: 4 }}>Parish Community</div>
            </div>
            <div style={{ background: '#f9fafb', borderRadius: 16, padding: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{
                background: '#fff',
                borderRadius: 18,
                padding: '12px 14px',
                boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                border: `2px solid ${gold}`,
                position: 'relative',
                borderLeft: `4px solid ${gold}`
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
                    {user?.name || 'Member'}
                  </div>
                  <div style={{ color: '#6b7280', fontSize: 13 }}>
                    {user?.email || 'member@parish.local'}
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
                  Member
                </div>
                <button
                  onClick={() => setProfileMenuOpen(v => !v)}
                  aria-label="Open profile menu"
                  style={{
                    marginLeft: 'auto',
                    background: '#f1f5f9',
                    border: `1px solid ${mist}`,
                    borderRadius: 10,
                    padding: '6px 10px',
                    fontWeight: 700,
                    color: ink,
                    cursor: 'pointer'
                  }}
                >
                  ⋮
                </button>
                {profileMenuOpen && (
                  <div style={{
                    position: 'absolute',
                    right: 12,
                    top: '100%',
                    marginTop: 8,
                    background: '#fff',
                    border: `1px solid ${mist}`,
                    borderRadius: 12,
                    boxShadow: '0 12px 26px rgba(0,0,0,0.12)',
                    overflow: 'hidden',
                    zIndex: 5,
                    minWidth: 180
                  }}>
                    <button
                      onClick={() => {
                        setProfileMenuOpen(false);
                        setProfileEditorOpen(true);
                      }}
                      style={{
                        all: 'unset',
                        display: 'block',
                        width: '100%',
                        padding: '10px 12px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        color: ink
                      }}
                    >
                      Edit Profile
                    </button>
                    <div style={{ height: 1, background: mist }} />
                    <button
                      onClick={() => {
                        setProfileMenuOpen(false);
                        onLogout();
                      }}
                      style={{
                        all: 'unset',
                        display: 'block',
                        width: '100%',
                        padding: '10px 12px',
                        cursor: 'pointer',
                        fontWeight: 700,
                        color: '#b0413e'
                      }}
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: 12
              }}>
                {[
                  { key: 'calendar', label: 'Calendar', icon: '📅' },
                  { key: 'events', label: 'Events', icon: '🕯' },
                  { key: 'bookings', label: 'My Bookings', icon: '✅' },
                  { key: 'requests', label: 'My Requests', icon: '📜' },
                  { key: 'concerns', label: 'My Concerns', icon: '📣' },
                  { key: 'tracking', label: 'Actions', icon: '📊' },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    style={{
                      all: 'unset',
                      cursor: 'pointer',
                      background: activeTab === tab.key ? `linear-gradient(135deg, ${accentBlue}, ${accentBlue}dd)` : '#fff',
                      borderRadius: 16,
                      border: `2px solid ${activeTab === tab.key ? gold : mist}`,
                      padding: '12px 10px',
                      textAlign: 'center',
                      transition: 'all 0.2s ease',
                      boxShadow: activeTab === tab.key ? `0 6px 16px ${accentBlue}40` : '0 2px 8px rgba(0,0,0,0.05)'
                    }}
                  >
                    <div style={{ fontSize: 20, marginBottom: 4 }}>{tab.icon}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: activeTab === tab.key ? '#fff' : ink }}>{tab.label}</div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  setConcernError('');
                  setConcernOpen(true);
                }}
                style={{
                  marginTop: 12,
                  width: '100%',
                  padding: '12px 12px',
                  borderRadius: 12,
                  background: `linear-gradient(135deg, ${gold}, ${gold}dd)`,
                  color: ink,
                  border: `2px solid ${gold}`,
                  fontWeight: 700,
                  boxShadow: `0 8px 18px ${gold}40`,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
              >
                Raise Concern
              </button>

              {/* Church-themed footer decoration with expandable space */}
              <div style={{
                marginTop: 'auto',
                paddingTop: 24,
                display: 'flex',
                flexDirection: 'column',
                gap: 16
              }}>
                <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${gold}, transparent)` }} />
                
                <div style={{
                  padding: '24px 16px',
                  background: `linear-gradient(135deg, ${stone}80, ${mist}60)`,
                  borderRadius: 14,
                  borderTop: `4px solid ${gold}`,
                  borderLeft: `4px solid ${gold}`,
                  textAlign: 'center',
                  color: ink,
                  fontSize: 13,
                  fontWeight: 600,
                  lineHeight: 1.8,
                  boxShadow: `inset 0 0 20px ${gold}15`
                }}>
                  <div style={{ fontSize: 28, marginBottom: 12, letterSpacing: 4 }}>✦</div>
                  <div style={{ color: '#4a5568', fontSize: 13, fontStyle: 'italic', marginBottom: 12, fontWeight: 500 }}>
                    "In God, we trust"
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', borderTop: `2px solid ${gold}40`, paddingTop: 12, lineHeight: 1.7 }}>
                    May this parish be a beacon of love, faith, and community
                  </div>
                  <div style={{ fontSize: 11, color: '#4a5568', marginTop: 12, paddingTop: 12, borderTop: `1px solid ${gold}40`, fontWeight: 600 }}>
                    📞 Contact: +1 (234) 567-8900
                  </div>
                </div>

                <div style={{
                  padding: '12px 16px',
                  background: `${mist}40`,
                  borderRadius: 10,
                  borderLeft: `4px solid ${gold}`,
                  fontSize: 11,
                  color: '#6b7280',
                  textAlign: 'center',
                  fontStyle: 'italic'
                }}>
                  "Let us gather in fellowship and serve with compassion"
                </div>

                <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${gold}, transparent)` }} />
              </div>
            </div>
          </aside>
        </div>

        <section className="dashboard-right-column" style={{ background: 'rgba(255,255,255,0.86)', borderRadius: 18, border: `2px solid ${gold}`, boxShadow: '0 18px 36px rgba(0,0,0,0.1)', padding: 10, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ marginBottom: 10, padding: '12px 14px', background: `linear-gradient(90deg, ${gold}15, ${accentBlue}15)`, borderRadius: 12, color: ink, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, borderLeft: `4px solid ${gold}`, fontSize: 16 }}>
            <span>✦ 🗓 Parish Calendar</span>
            <span style={{ fontSize: 12, color: '#4a5568', fontWeight: 500, marginLeft: 'auto' }}>Tap a date to view availability</span>
          </div>
          <CalendarViewNew
            bookings={bookings}
            calendarBookings={calendarBookings}
            events={events}
            calendarConfig={calendarConfig}
            user={user}
          />

          <div className="dashboard-main dashboard-left-content" style={{ background: '#fff', borderRadius: 16, boxShadow: '0 18px 40px rgba(0,0,0,0.1)', border: `2px solid ${gold}`, padding: 16, borderTop: `4px solid ${gold}` }}>
            {activeTab === 'events' && (
              <div>
                <h2 style={{ color: ink, borderBottom: `3px solid ${gold}`, paddingBottom: 8, marginBottom: 16, fontWeight: 800, fontSize: 22 }}>✦ Events</h2>
                <div style={{ display: 'grid', gap: 10 }}>
                  {events.map((event) => (
                    <div key={event.id} style={{
                      padding: 12,
                      border: `2px solid ${mist}`,
                      borderLeft: `4px solid ${gold}`,
                      borderRadius: 10,
                      background: '#fff',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                      transition: 'all 0.2s ease'
                    }}>
                      <div style={{ fontWeight: 700 }}>{event.title}</div>
                      <div style={{ color: '#4a5568', fontSize: 14 }}>
                        {event.date} {event.time ? `• ${event.time}` : ''}
                      </div>
                      {event.description && (
                        <div style={{ color: '#718096', marginTop: 6 }}>{event.description}</div>
                      )}
                    </div>
                  ))}
                  {events.length === 0 && <div style={{ color: '#718096' }}>No events yet.</div>}
                </div>
              </div>
            )}

            {activeTab === 'bookings' && (
              <div>
                <h2 style={{ color: ink, borderBottom: `3px solid ${gold}`, paddingBottom: 8, marginBottom: 16, fontWeight: 800, fontSize: 22 }}>✦ My Bookings</h2>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={th}>Service</th>
                      <th style={th}>Date</th>
                      <th style={th}>Time</th>
                      <th style={th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map(b => (
                      <tr key={b.id}>
                        <td style={td}>{b.service}</td>
                        <td style={td}>{b.date}</td>
                        <td style={td}>{b.slot}</td>
                        <td style={td}>
                          <button
                            style={{
                              padding: '6px 10px',
                              background: '#b0413e',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 6,
                              cursor: 'pointer',
                              boxShadow: '0 3px 10px rgba(0,0,0,0.12)'
                            }}
                            onClick={async () => {
                              if (!b.id) {
                                window.alert('Cannot cancel: missing booking id.');
                                return;
                              }
                              if (window.confirm('Cancel this booking?')) {
                                try {
                                  await api.bookings.remove(b.id);
                                  loadData();
                                } catch (err) {
                                  if (err.response?.status === 404) {
                                    loadData();
                                    return;
                                  }
                                  window.alert(
                                    err.response?.data?.error || 'Cancel failed. Please refresh and try again.'
                                  );
                                }
                              }
                            }}
                          >
                            Cancel
                          </button>
                        </td>
                      </tr>
                    ))}
                    {bookings.length === 0 && (
                      <tr>
                        <td colSpan={4} style={td}>
                          No bookings yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'requests' && (
              <div>
                <h2 style={{ color: ink, borderBottom: `3px solid ${gold}`, paddingBottom: 8, marginBottom: 16, fontWeight: 800, fontSize: 22 }}>✦ My Requests</h2>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={th}>Service</th>
                      <th style={th}>Date</th>
                      <th style={th}>Slot</th>
                      <th style={th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookingRequests.map(r => (
                      <tr key={r.id}>
                        <td style={td}>{r.service}</td>
                        <td style={td}>{r.date}</td>
                        <td style={td}>{r.slot}</td>
                        <td style={{ ...td, textTransform: 'capitalize' }}>
                          {r.status || 'pending'}
                        </td>
                      </tr>
                    ))}
                    {bookingRequests.length === 0 && (
                      <tr>
                        <td colSpan={4} style={td}>
                          No booking requests yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'calendar' && (
              <div>
                <h2 style={{ color: ink, borderBottom: `3px solid ${gold}`, paddingBottom: 8, marginBottom: 16, fontWeight: 800, fontSize: 22 }}>✦ Calendar</h2>
                <div style={{ color: '#4a5568' }}>Use the calendar above to explore available dates.</div>
              </div>
            )}

            {activeTab === 'concerns' && (
              <div>
                <h2 style={{ color: ink, borderBottom: `3px solid ${gold}`, paddingBottom: 8, marginBottom: 16, fontWeight: 800, fontSize: 22 }}>✦ My Concerns</h2>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={th}>Subject</th>
                      <th style={th}>Message</th>
                      <th style={th}>Status</th>
                      <th style={th}>Admin Reply</th>
                      <th style={th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myConcerns.map(c => {
                      const statusLower = String(c.status || '').toLowerCase();
                      const isResolved = statusLower === 'resolved';
                      const isPending = statusLower === 'pending';
                      const isUpdating = statusLower === 'updating';
                      
                      let statusColor = '#b0413e';
                      let statusBg = '#fff5f5';
                      let statusIcon = '⏳';
                      
                      if (isResolved) {
                        statusColor = '#2f855a';
                        statusBg = '#f0fdf4';
                        statusIcon = '✓';
                      } else if (isPending) {
                        statusColor = '#d97706';
                        statusBg = '#fffbeb';
                        statusIcon = '⏱';
                      } else if (isUpdating) {
                        statusColor = '#0284c7';
                        statusBg = '#f0f9ff';
                        statusIcon = '⟳';
                      }
                      
                      return (
                        <tr key={c.id}>
                          <td style={td}>{c.subject || '-'}</td>
                          <td style={td}>{c.message || '-'}</td>
                          <td style={{ ...td, fontWeight: 600 }}>
                            <div style={{
                              display: 'inline-block',
                              padding: '4px 10px',
                              borderRadius: 12,
                              background: statusBg,
                              color: statusColor,
                              fontSize: 12,
                              fontWeight: 700,
                              textTransform: 'capitalize',
                              border: `1px solid ${statusColor}30`
                            }}>
                              {statusIcon} {c.status || 'open'}
                            </div>
                          </td>
                          <td style={td}>{c.reply_message || '-'}</td>
                          <td style={td}>
                            <div style={{ display: 'flex', gap: 6 }}>
                              {!isResolved && (
                                <button
                                  onClick={async () => {
                                    if (!c.id) return;
                                    if (!window.confirm('Close this concern?')) return;
                                    try {
                                      await api.concerns.close(c.id);
                                      await loadData();
                                    } catch (err) {
                                      window.alert(err.response?.data?.error || 'Failed to close concern.');
                                    }
                                  }}
                                  style={{
                                    padding: '6px 10px',
                                    background: '#2f855a',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 6,
                                    cursor: 'pointer',
                                    fontSize: 12,
                                    fontWeight: 600,
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                    transition: 'all 0.2s ease'
                                  }}
                                  onMouseEnter={(e) => e.target.style.background = '#22663a'}
                                  onMouseLeave={(e) => e.target.style.background = '#2f855a'}
                                >
                                  ✓ Close
                                </button>
                              )}
                              <button
                                onClick={async () => {
                                  if (!c.id) return;
                                  if (!window.confirm('Delete this concern?')) return;
                                  try {
                                    await api.concerns.delete(c.id);
                                    await loadData();
                                  } catch (err) {
                                    window.alert(err.response?.data?.error || 'Failed to delete concern.');
                                  }
                                }}
                                style={{
                                  padding: '6px 10px',
                                  background: '#b0413e',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: 6,
                                  cursor: 'pointer',
                                  fontSize: 12,
                                  fontWeight: 600,
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                  transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => e.target.style.background = '#8b2e2a'}
                                onMouseLeave={(e) => e.target.style.background = '#b0413e'}
                              >
                                ✕ Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {myConcerns.length === 0 && (
                      <tr>
                        <td style={td} colSpan={5}>No concerns submitted yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'tracking' && (
              <div>
                <h2 style={{ color: ink, borderBottom: `3px solid ${gold}`, paddingBottom: 8, marginBottom: 16, fontWeight: 800, fontSize: 22 }}>✦ Action Tracking</h2>
                <div style={{
                  display: 'grid',
                  gap: 12
                }}>
                  <div style={{
                    padding: '16px',
                    background: `linear-gradient(135deg, ${stone}40, ${mist}40)`,
                    borderRadius: 12,
                    border: `2px solid ${gold}`,
                    color: ink
                  }}>
                    <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 16 }}>📊 Your Activity Timeline</div>
                    
                    <div style={{ display: 'grid', gap: 16 }}>
                      {myConcerns.length > 0 || bookings.length > 0 || bookingRequests.length > 0 ? (
                        <>
                          {myConcerns.map((c, idx) => (
                            <div key={`concern-${c.id}`} style={{
                              display: 'flex',
                              gap: 12,
                              padding: '12px',
                              background: '#fff',
                              borderRadius: 10,
                              border: `1px solid ${mist}`,
                              borderLeft: `4px solid ${gold}`
                            }}>
                              <div style={{ fontSize: 20, minWidth: 30 }}>📣</div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, color: ink }}>Concern Submitted</div>
                                <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{c.subject}</div>
                                <div style={{
                                  fontSize: 11,
                                  color: '#9ca3af',
                                  marginTop: 6,
                                  padding: '4px 8px',
                                  background: '#f3f4f6',
                                  borderRadius: 6,
                                  display: 'inline-block'
                                }}>
                                  Status: {c.status || 'open'}
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          {bookingRequests.map((br) => (
                            <div key={`request-${br.id}`} style={{
                              display: 'flex',
                              gap: 12,
                              padding: '12px',
                              background: '#fff',
                              borderRadius: 10,
                              border: `1px solid ${mist}`,
                              borderLeft: `4px solid ${accentBlue}`
                            }}>
                              <div style={{ fontSize: 20, minWidth: 30 }}>📜</div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, color: ink }}>Booking Request</div>
                                <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{br.service} - {br.date}</div>
                                <div style={{
                                  fontSize: 11,
                                  color: '#9ca3af',
                                  marginTop: 6,
                                  padding: '4px 8px',
                                  background: '#f3f4f6',
                                  borderRadius: 6,
                                  display: 'inline-block',
                                  textTransform: 'capitalize'
                                }}>
                                  Status: {br.status || 'pending'}
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          {bookings.map((b) => (
                            <div key={`booking-${b.id}`} style={{
                              display: 'flex',
                              gap: 12,
                              padding: '12px',
                              background: '#fff',
                              borderRadius: 10,
                              border: `1px solid ${mist}`,
                              borderLeft: `4px solid #2f855a`
                            }}>
                              <div style={{ fontSize: 20, minWidth: 30 }}>✅</div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, color: ink }}>Booking Confirmed</div>
                                <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{b.service} - {b.date} {b.slot}</div>
                                <div style={{
                                  fontSize: 11,
                                  color: '#9ca3af',
                                  marginTop: 6,
                                  padding: '4px 8px',
                                  background: '#f3f4f6',
                                  borderRadius: 6,
                                  display: 'inline-block'
                                }}>
                                  Confirmed
                                </div>
                              </div>
                            </div>
                          ))}
                        </>
                      ) : (
                        <div style={{
                          padding: '24px',
                          textAlign: 'center',
                          color: '#6b7280'
                        }}>
                          <div style={{ fontSize: 14, marginBottom: 8 }}>No actions tracked yet.</div>
                          <div style={{ fontSize: 12, color: '#9ca3af' }}>Your bookings, requests, and concerns will appear here.</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div style={{ marginTop: 10, textAlign: 'center', color: '#4a5568', fontWeight: 600 }}>
              Viewing tab: {activeTabLabel}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
