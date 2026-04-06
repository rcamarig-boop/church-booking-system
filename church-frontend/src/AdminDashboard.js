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

const PAGE_SIZE = 10;

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

const SERVICE_FIELDS = {
  counseling: ['fullName', 'phone', 'concern'],
  baptism: ['childName', 'birthDate', 'parentNames'],
  wedding: ['groomName', 'brideName', 'contactNumber'],
  blessing: ['personName', 'blessingType'],
  funeral: ['deceasedName', 'deceasedBirthDate', 'dateOfDeath', 'familyContact'],
  christening: ['childName', 'guardianName', 'contactNumber']
};

const NUMERIC_ONLY_FIELDS = new Set(['phone', 'contactNumber', 'familyContact']);

export default function AdminDashboard({ user, onLogout }) {
  const socket = useContext(SocketContext);

  const [activeTab, setActiveTab] = useState('calendar');
  const [bookings, setBookings] = useState([]);
  const [records, setRecords] = useState([]);
  const [events, setEvents] = useState([]);
  const [calendarConfig, setCalendarConfig] = useState({});
  const [users, setUsers] = useState([]);
  const [concerns, setConcerns] = useState([]);
  const [concernReplyOpen, setConcernReplyOpen] = useState(false);
  const [replyConcern, setReplyConcern] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [replyStatus, setReplyStatus] = useState('open');
  const [replyResolutionNote, setReplyResolutionNote] = useState('');
  const [replySaving, setReplySaving] = useState(false);
  const [replyError, setReplyError] = useState('');
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
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [openConcernsCount, setOpenConcernsCount] = useState(0);
  const [bookingPage, setBookingPage] = useState(1);
  const [eventPage, setEventPage] = useState(1);
  const [userPage, setUserPage] = useState(1);
  const [recordPage, setRecordPage] = useState(1);
  const [concernPage, setConcernPage] = useState(1);
  const [bookingHasMore, setBookingHasMore] = useState(false);
  const [eventHasMore, setEventHasMore] = useState(false);
  const [userHasMore, setUserHasMore] = useState(false);
  const [recordHasMore, setRecordHasMore] = useState(false);
  const [concernHasMore, setConcernHasMore] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);
  const [calendarMinimized, setCalendarMinimized] = useState(false);
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');
  const [profilePassword, setProfilePassword] = useState('');
  const [profileConfirm, setProfileConfirm] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [bookingEditorOpen, setBookingEditorOpen] = useState(false);
  const [bookingSaving, setBookingSaving] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [editingBooking, setEditingBooking] = useState(null);
  const [bookingForm, setBookingForm] = useState({
    service: '',
    date: '',
    slot: '',
    details: ''
  });
  const [bookingDetailsFields, setBookingDetailsFields] = useState({});
  const [bookingDetailsExtra, setBookingDetailsExtra] = useState('');
  const [timeTrigger, setTimeTrigger] = useState(0);

  const buildDetailsState = (service, detailsObj) => {
    const key = String(service || '').trim().toLowerCase();
    const fields = SERVICE_FIELDS[key] || [];
    const fieldValues = {};
    fields.forEach(f => {
      fieldValues[f] = detailsObj?.[f] ?? '';
    });
    const extras = {};
    if (detailsObj && typeof detailsObj === 'object') {
      Object.keys(detailsObj).forEach(k => {
        if (!fields.includes(k)) extras[k] = detailsObj[k];
      });
    }
    return { fieldValues, extrasText: Object.keys(extras).length ? JSON.stringify(extras, null, 2) : '' };
  };

  useEffect(() => {
    if (!user) return;
    setProfileName(user.name || '');
    setProfileEmail(user.email || '');
  }, [user]);

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

  const editAcceptedBooking = (booking) => {
    const detailsObj = booking.details && typeof booking.details === 'object' ? booking.details : {};
    const { fieldValues, extrasText } = buildDetailsState(booking.service, detailsObj);
    setEditingBooking(booking);
    setBookingForm({
      service: booking.service || '',
      date: booking.date || '',
      slot: booking.slot || '',
      details: JSON.stringify(booking.details || {}, null, 2)
    });
    setBookingDetailsFields(fieldValues);
    setBookingDetailsExtra(extrasText);
    setBookingError('');
    setBookingEditorOpen(true);
  };

  /* ---------- load all admin data ---------- */
  const loadData = async () => {
    try {
      const [c, reqCount, conCount] = await Promise.all([
        api.calendar.get(),
        api.bookingRequests.count({ status: 'pending' }),
        api.concerns.count({ status: 'open' })
      ]);
      setCalendarConfig(c.data || {});
      setPendingRequestsCount(reqCount.data?.count || 0);
      setOpenConcernsCount(conCount.data?.count || 0);
      setRefreshKey(k => k + 1);
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
    socket.on('concern_created', refresh);
    socket.on('concern_updated', refresh);
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
    socket.off('concern_created', refresh);
    socket.off('concern_updated', refresh);
      socket.off('event_created', refresh);
      socket.off('event_updated', refresh);
      socket.off('event_deleted', refresh);
      socket.off('calendar_config_updated', refresh);
    };
  }, [socket]);

  // Update every second to refresh time-based calculations
  useEffect(() => {
    const intervalId = setInterval(() => {
      setTimeTrigger(t => t + 1);
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);

  // Define search terms before useEffects that depend on them
  const userSearchTerm = userSearch.trim().toLowerCase();
  const eventSearchTerm = eventSearch.trim().toLowerCase();
  const bookingSearchTerm = bookingSearch.trim().toLowerCase();
  const recordSearchTerm = recordSearch.trim().toLowerCase();

  useEffect(() => {
    (async () => {
      try {
        const res = await api.bookings.list({
          limit: PAGE_SIZE,
          offset: (bookingPage - 1) * PAGE_SIZE,
          q: bookingSearchTerm,
          filter: bookingFilter
        });
        const rows = res.data || [];
        setBookings(rows);
        setBookingHasMore(rows.length === PAGE_SIZE);
      } catch {
        setBookings([]);
        setBookingHasMore(false);
      }
    })();
  }, [bookingPage, refreshKey, bookingSearchTerm, bookingFilter]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.events.list({
          limit: PAGE_SIZE,
          offset: (eventPage - 1) * PAGE_SIZE,
          q: eventSearchTerm,
          filter: eventFilter
        });
        const rows = res.data || [];
        setEvents(rows);
        setEventHasMore(rows.length === PAGE_SIZE);
      } catch {
        setEvents([]);
        setEventHasMore(false);
      }
    })();
  }, [eventPage, refreshKey, eventSearchTerm, eventFilter]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.users.list({
          limit: PAGE_SIZE,
          offset: (userPage - 1) * PAGE_SIZE,
          q: userSearchTerm
        });
        const rows = res.data || [];
        setUsers(rows);
        setUserHasMore(rows.length === PAGE_SIZE);
      } catch {
        setUsers([]);
        setUserHasMore(false);
      }
    })();
  }, [userPage, refreshKey, userSearchTerm]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.bookingRecords.list({
          limit: PAGE_SIZE,
          offset: (recordPage - 1) * PAGE_SIZE,
          q: recordSearchTerm
        });
        const rows = res.data || [];
        setRecords(rows);
        setRecordHasMore(rows.length === PAGE_SIZE);
      } catch {
        setRecords([]);
        setRecordHasMore(false);
      }
    })();
  }, [recordPage, refreshKey, recordSearchTerm]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.concerns.list({
          limit: PAGE_SIZE,
          offset: (concernPage - 1) * PAGE_SIZE,
          q: ''
        });
        const rows = res.data || [];
        setConcerns(rows);
        setConcernHasMore(rows.length === PAGE_SIZE);
      } catch {
        setConcerns([]);
        setConcernHasMore(false);
      }
    })();
  }, [concernPage, refreshKey]);

  useEffect(() => { setBookingPage(1); }, [bookingSearchTerm, bookingFilter]);
  useEffect(() => { setEventPage(1); }, [eventSearchTerm, eventFilter]);
  useEffect(() => { setUserPage(1); }, [userSearchTerm]);
  useEffect(() => { setRecordPage(1); }, [recordSearchTerm]);

  useEffect(() => {
    if (!bookingControlDate) return;
    const configured = calendarConfig?.[bookingControlDate]?.max_slots;
    if (configured === undefined || configured === null) {
      setBookingMaxSlots('5');
    } else {
      setBookingMaxSlots(String(configured));
    }
  }, [bookingControlDate, calendarConfig]);

  const filteredUsers = useMemo(() => users, [users]);
  const filteredEvents = useMemo(() => events, [events]);

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

  const filteredEventsByStatus = useMemo(() => events, [events]);

  const eventCounts = useMemo(() => {
    const upcoming = filteredEvents.filter(e => !isPastEvent(e)).length;
    const past = filteredEvents.length - upcoming;
    return { upcoming, past };
  }, [filteredEvents]);

  const filteredBookings = useMemo(() => bookings, [bookings]);

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

  const filteredBookingsByStatus = useMemo(() => bookings, [bookings]);

  const bookingCounts = useMemo(() => {
    const upcoming = filteredBookings.filter(b => !isPastDateTime(b.date, b.slot)).length;
    const past = filteredBookings.length - upcoming;
    return { upcoming, past };
  }, [filteredBookings]);


  const filteredRecords = useMemo(() => records, [records]);

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

  const activeTabLabel = useMemo(() => {
      const map = {
        calendar: 'Parish Calendar',
        users: 'Parishioners',
        events: 'Events',
        bookings: 'Bookings',
        requests: 'Request Panel',
        concerns: 'Concerns',
        records: 'Records',
        reports: 'Reports',
        tracking: 'Action Tracking',
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
        concerns: '📣',
        records: '📖',
        reports: '🕊',
        tracking: '📊',
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, marginBottom: 16, flexWrap: 'wrap-reverse' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('analytics')}
            style={{
              all: 'unset',
              cursor: 'pointer',
              padding: '8px 14px',
              borderRadius: 8,
              background: activeTab === 'analytics' ? gold : 'transparent',
              color: ink,
              fontWeight: 600,
              fontSize: 13,
              transition: 'all 0.2s ease',
              border: `1px solid ${activeTab === 'analytics' ? gold : 'transparent'}`
            }}
          >
            📊 Analytics
          </button>
          <button
            onClick={() => setActiveTab('records')}
            style={{
              all: 'unset',
              cursor: 'pointer',
              padding: '8px 14px',
              borderRadius: 8,
              background: activeTab === 'records' ? gold : 'transparent',
              color: ink,
              fontWeight: 600,
              fontSize: 13,
              transition: 'all 0.2s ease',
              border: `1px solid ${activeTab === 'records' ? gold : 'transparent'}`
            }}
          >
            📖 Records
          </button>
          <button
            onClick={() => setActiveTab('bookings')}
            style={{
              all: 'unset',
              cursor: 'pointer',
              padding: '8px 14px',
              borderRadius: 8,
              background: activeTab === 'bookings' ? gold : 'transparent',
              color: ink,
              fontWeight: 600,
              fontSize: 13,
              transition: 'all 0.2s ease',
              border: `1px solid ${activeTab === 'bookings' ? gold : 'transparent'}`
            }}
          >
            ✅ Bookings
          </button>
          <button
            onClick={() => setActiveTab('concerns')}
            style={{
              all: 'unset',
              cursor: 'pointer',
              padding: '8px 14px',
              borderRadius: 8,
              background: activeTab === 'concerns' ? gold : 'transparent',
              color: ink,
              fontWeight: 600,
              fontSize: 13,
              transition: 'all 0.2s ease',
              border: `1px solid ${activeTab === 'concerns' ? gold : 'transparent'}`
            }}
          >
            📣 Concerns
          </button>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setProfileMenuOpen(v => !v)}
              style={{
                all: 'unset',
                cursor: 'pointer',
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${accentBlue}, ${gold}aa)`,
                color: '#fff',
                fontWeight: 700,
                fontSize: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                border: `2px solid ${gold}`
              }}
              title={user?.name || 'Profile'}
            >
              {user?.name?.charAt(0).toUpperCase() || '👤'}
            </button>
            {profileMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 8,
                  background: '#fff',
                  borderRadius: 12,
                  border: `1px solid ${mist}`,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  minWidth: 200,
                  zIndex: 100
                }}
              >
                <div style={{ padding: '12px 16px', borderBottom: `1px solid ${mist}` }}>
                  <div style={{ fontWeight: 600, color: ink }}>{user?.name || 'User'}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{user?.email || 'No email'}</div>
                </div>
                <button
                  onClick={() => {
                    setProfileEditorOpen(true);
                    setProfileMenuOpen(false);
                  }}
                  style={{
                    all: 'unset',
                    width: '100%',
                    cursor: 'pointer',
                    padding: '10px 16px',
                    borderBottom: `1px solid ${mist}`,
                    textAlign: 'left',
                    fontSize: 14,
                    color: ink,
                    transition: 'all 0.2s ease',
                    boxSizing: 'border-box'
                  }}
                  onMouseEnter={(e) => e.target.style.background = mist}
                  onMouseLeave={(e) => e.target.style.background = 'transparent'}
                >
                  ✏️ Edit Profile
                </button>
                <button
                  onClick={onLogout}
                  style={{
                    all: 'unset',
                    width: '100%',
                    cursor: 'pointer',
                    padding: '10px 16px',
                    textAlign: 'left',
                    fontSize: 14,
                    color: '#b0413e',
                    transition: 'all 0.2s ease',
                    boxSizing: 'border-box'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#fee2e2'}
                  onMouseLeave={(e) => e.target.style.background = 'transparent'}
                >
                  🚪 Logout
                </button>
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            className="sidebar-toggle-btn"
            aria-label="Show navigation panel"
            onClick={() => setSidebarOpen(v => !v)}
            style={{
              all: 'unset',
              cursor: 'pointer',
              fontSize: 28,
              color: ink,
              fontWeight: 800,
              padding: '6px 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ☰
          </button>
          <div className="dashboard-brand" style={{ paddingTop: 0, paddingBottom: 0 }}>
            <div className="dashboard-brand-title" style={{ color: ink, textShadow: '0 4px 20px rgba(0,0,0,0.12)', margin: 0 }}>Parish Admin</div>
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
      {bookingEditorOpen && (
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
            if (!bookingSaving) {
              setBookingEditorOpen(false);
              setEditingBooking(null);
              setBookingError('');
            }
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 620,
              background: '#fff',
              borderRadius: 16,
              padding: 20,
              border: `1px solid ${mist}`,
              boxShadow: '0 20px 50px rgba(0,0,0,0.18)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, color: ink }}>Edit Booking</h3>
              <button
                onClick={() => {
                  if (bookingSaving) return;
                  setBookingEditorOpen(false);
                  setEditingBooking(null);
                  setBookingError('');
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
                <label style={{ display: 'block', marginBottom: 6 }}>Service</label>
                <input
                  type="text"
                  value={bookingForm.service}
                  onChange={(e) => setBookingForm(f => ({ ...f, service: e.target.value }))}
                  style={{ width: '100%', padding: 10, borderRadius: 8, border: `1px solid ${mist}` }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 6 }}>Date</label>
                  <input
                    type="date"
                    value={bookingForm.date}
                    onChange={(e) => setBookingForm(f => ({ ...f, date: e.target.value }))}
                    style={{ width: '100%', padding: 10, borderRadius: 8, border: `1px solid ${mist}` }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 6 }}>Preferred Time</label>
                  <input
                    type="time"
                    value={bookingForm.slot}
                    onChange={(e) => setBookingForm(f => ({ ...f, slot: e.target.value }))}
                    step="1800"
                    style={{ width: '100%', padding: 10, borderRadius: 8, border: `1px solid ${mist}` }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6 }}>Service Details</label>
                {(() => {
                  const key = String(bookingForm.service || '').trim().toLowerCase();
                  const fields = SERVICE_FIELDS[key] || [];
                  if (!fields.length) {
                    return <div style={{ color: '#718096' }}>No structured fields for this service.</div>;
                  }
                  return (
                    <div style={{ display: 'grid', gap: 10 }}>
                      {fields.map(field => (
                        <div key={field}>
                          <label style={{ display: 'block', marginBottom: 6, fontSize: 12 }}>
                            {field}
                          </label>
                          <input
                            type="text"
                            value={bookingDetailsFields[field] || ''}
                            onChange={(e) => setBookingDetailsFields(prev => ({ ...prev, [field]: e.target.value }))}
                            style={{ width: '100%', padding: 10, borderRadius: 8, border: `1px solid ${mist}` }}
                          />
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6 }}>Additional Details (optional JSON)</label>
                <textarea
                  rows={4}
                  value={bookingDetailsExtra}
                  onChange={(e) => setBookingDetailsExtra(e.target.value)}
                  style={{ width: '100%', padding: 10, borderRadius: 8, border: `1px solid ${mist}` }}
                />
              </div>
              {bookingError && (
                <div style={{ color: '#b0413e', fontWeight: 600 }}>{bookingError}</div>
              )}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    if (bookingSaving) return;
                    setBookingEditorOpen(false);
                    setEditingBooking(null);
                    setBookingError('');
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
                  disabled={bookingSaving}
                  onClick={async () => {
                    if (!editingBooking?.id) {
                      setBookingError('Missing booking id.');
                      return;
                    }
                    const key = String(bookingForm.service || '').trim().toLowerCase();
                    const fields = SERVICE_FIELDS[key] || [];
                    for (const f of fields) {
                      const val = String(bookingDetailsFields[f] || '').trim();
                      if (!val) {
                        setBookingError(`Missing required field: ${f}`);
                        return;
                      }
                      if (NUMERIC_ONLY_FIELDS.has(f) && !/^\d+$/.test(val)) {
                        setBookingError(`${f} must contain numbers only.`);
                        return;
                      }
                    }
                    let extra = {};
                    try {
                      extra = bookingDetailsExtra.trim() ? JSON.parse(bookingDetailsExtra) : {};
                    } catch {
                      setBookingError('Additional details must be valid JSON.');
                      return;
                    }
                    const details = { ...extra, ...bookingDetailsFields };
                    try {
                      setBookingSaving(true);
                      setBookingError('');
                      await api.bookings.update(editingBooking.id, {
                        service: bookingForm.service,
                        date: bookingForm.date,
                        slot: bookingForm.slot,
                        details
                      });
                      setBookingEditorOpen(false);
                      setEditingBooking(null);
                      setBookingDetailsExtra('');
                      setBookingDetailsFields({});
                      await loadData();
                    } catch (err) {
                      setBookingError(err.response?.data?.error || 'Failed to edit booking.');
                    } finally {
                      setBookingSaving(false);
                    }
                  }}
                  style={{
                    background: accentBlue,
                    color: '#fff',
                    borderRadius: 10,
                    padding: '8px 12px'
                  }}
                >
                  {bookingSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {concernReplyOpen && (
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
            if (!replySaving) {
              setConcernReplyOpen(false);
              setReplyConcern(null);
              setReplyMessage('');
              setReplyError('');
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
              <h3 style={{ margin: 0, color: ink }}>Reply to Concern</h3>
              <button
                onClick={() => {
                  if (replySaving) return;
                  setConcernReplyOpen(false);
                  setReplyConcern(null);
                  setReplyMessage('');
                  setReplyError('');
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
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ color: '#4a5568', fontSize: 13 }}>
                {replyConcern?.subject || 'Concern'}
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6 }}>Status</label>
                <select
                  value={replyStatus}
                  onChange={(e) => setReplyStatus(e.target.value)}
                  style={{ width: '100%', padding: 10, borderRadius: 8, border: `1px solid ${mist}` }}
                >
                  <option value="open">Open</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
              {replyStatus === 'resolved' && (
                <div>
                  <label style={{ display: 'block', marginBottom: 6 }}>Resolution Note (optional)</label>
                  <input
                    type="text"
                    value={replyResolutionNote}
                    onChange={(e) => setReplyResolutionNote(e.target.value)}
                    style={{ width: '100%', padding: 10, borderRadius: 8, border: `1px solid ${mist}` }}
                  />
                </div>
              )}
              <textarea
                rows={5}
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                placeholder="Type your reply..."
                style={{ width: '100%', padding: 10, borderRadius: 8, border: `1px solid ${mist}` }}
              />
              {replyError && (
                <div style={{ color: '#b0413e', fontWeight: 600 }}>{replyError}</div>
              )}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    if (replySaving) return;
                    setConcernReplyOpen(false);
                    setReplyConcern(null);
                    setReplyMessage('');
                    setReplyError('');
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
                  disabled={replySaving}
                  onClick={async () => {
                    if (!replyConcern?.id) {
                      setReplyError('Missing concern id.');
                      return;
                    }
                    const msg = replyMessage.trim();
                    if (!msg) {
                      setReplyError('Reply message is required.');
                      return;
                    }
                    try {
                      setReplySaving(true);
                      setReplyError('');
                      await api.concerns.update(replyConcern.id, {
                        reply_message: msg,
                        status: replyStatus,
                        resolution_note: replyStatus === 'resolved' ? replyResolutionNote : ''
                      });
                      setConcernReplyOpen(false);
                      setReplyConcern(null);
                      setReplyMessage('');
                      setReplyResolutionNote('');
                      setReplyStatus('open');
                      await loadData();
                    } catch (err) {
                      setReplyError(err.response?.data?.error || 'Failed to send reply.');
                    } finally {
                      setReplySaving(false);
                    }
                  }}
                  style={{
                    background: accentBlue,
                    color: '#fff',
                    borderRadius: 10,
                    padding: '8px 12px'
                  }}
                >
                  {replySaving ? 'Sending...' : 'Send Reply'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    <div className={`dashboard-layout dashboard-two-col ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      <div className="dashboard-left-column">
      <aside className="dashboard-sidebar dashboard-left-panel" style={{ background: '#fff', borderRadius: 14, boxShadow: '0 10px 26px rgba(0,0,0,0.1)', border: `1px solid ${mist}` }}>
        <div className="dashboard-sidebar-header" style={{ paddingBottom: 12, borderBottom: `2px solid ${gold}`, position: 'relative' }}>
          <h3 style={{ margin: '8px 0 0 0', color: ink, textAlign: 'center', fontSize: 17, fontWeight: 800 }}>✦ Admin Panel ✦</h3>
          <div style={{ fontSize: 12, textAlign: 'center', color: gold, marginTop: 4 }}>Parish Management</div>
        </div>
        {/* Tab buttons on expandable sidebar */}
        <div style={{ background: '#f9fafb', borderRadius: 16, padding: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 12
          }}>
            {[
              { key: 'calendar', label: 'Calendar', icon: '📅' },
              { key: 'analytics', label: 'Analytics', icon: '📊' },
              { key: 'requests', label: 'Requests', icon: '📜', count: pendingRequestsCount },
              { key: 'bookings', label: 'Bookings', icon: '✅' },
              { key: 'events', label: 'Events', icon: '🕯' },
              { key: 'users', label: 'Parishioners', icon: '👥' },
              { key: 'concerns', label: 'Concerns', icon: '📣', count: openConcernsCount },
              { key: 'records', label: 'Records', icon: '📖' },
              { key: 'reports', label: 'Reports', icon: '🕊' },
              { key: 'tracking', label: 'Actions', icon: '📊' },
              { key: 'add_event', label: 'Add Event', icon: '✚' },
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: activeTab === tab.key ? '#fff' : ink }}>{tab.label}</div>
                  {tab.count > 0 && (
                    <span style={{
                      background: '#b0413e',
                      color: '#fff',
                      borderRadius: 999,
                      padding: '2px 7px',
                      fontSize: 11,
                      fontWeight: 700,
                      lineHeight: 1
                    }}>
                      {tab.count}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

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
                ☎️ Contact: +639##-###-#### |
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

      {/* ---------- MAIN CONTENT ---------- */}
      <section className="dashboard-right-column" style={{ background: 'rgba(255,255,255,0.86)', borderRadius: 18, border: `1px solid ${mist}`, boxShadow: '0 18px 36px rgba(0,0,0,0.1)', padding: 10, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {!calendarMinimized && activeTab === 'calendar' && (
          <div>
            <div style={{ marginBottom: 10, padding: '10px', background: 'linear-gradient(90deg, rgba(59,91,138,0.12), rgba(214,173,96,0.12))', borderRadius: 10, color: ink, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>🗓 Parish Calendar</span>
                <span style={{ fontSize: 12, color: '#4a5568' }}>Tap a date to view or add bookings</span>
              </span>
              <button
                onClick={() => setCalendarMinimized(true)}
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  fontSize: 16,
                  color: ink,
                  fontWeight: 700,
                  padding: '4px 8px'
                }}
              >
                −
              </button>
            </div>
            <CalendarViewNew
              bookings={bookings}
              calendarBookings={bookings}
              events={events}
              calendarConfig={calendarConfig}
              user={user}
              isAdmin
            />
          </div>
        )}
        {calendarMinimized && activeTab === 'calendar' && (
          <div style={{ marginBottom: 10, padding: '10px', background: 'linear-gradient(90deg, rgba(59,91,138,0.12), rgba(214,173,96,0.12))', borderRadius: 10, color: ink, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
            <span>🗓 Calendar Minimized</span>
            <button
              onClick={() => setCalendarMinimized(false)}
              style={{
                all: 'unset',
                cursor: 'pointer',
                fontSize: 16,
                color: ink,
                fontWeight: 700,
                padding: '4px 8px'
              }}
            >
              +
            </button>
          </div>
        )}

      <div className="dashboard-main dashboard-left-content" style={{ background: '#fff', borderRadius: 16, boxShadow: '0 18px 40px rgba(0,0,0,0.1)', border: `2px solid ${gold}`, padding: 16, borderTop: `4px solid ${gold}` }}>
        {/* TAB CONTENT */}
        {activeTab === 'analytics' && (
          <div>
            <h2 style={{ color: ink, borderBottom: `3px solid ${gold}`, paddingBottom: 8, marginBottom: 16, fontWeight: 800, fontSize: 22 }}>📊 Dashboard Analytics</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
              <div style={{ background: '#fff', borderRadius: 16, padding: '16px', border: `1px solid ${mist}`, boxShadow: '0 8px 20px rgba(0,0,0,0.08)' }}>
                <div style={{ color: '#718096', fontSize: 12, marginBottom: 8 }}>Events Today</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: ink, marginBottom: 8 }}>{todayEvents}</div>
                <div style={{ color: '#718096', fontSize: 12 }}>{todayStr}</div>
              </div>
              <div style={{ background: '#fff', borderRadius: 16, padding: '16px', border: `1px solid ${mist}`, boxShadow: '0 8px 20px rgba(0,0,0,0.08)' }}>
                <div style={{ color: '#718096', fontSize: 12, marginBottom: 8 }}>Bookings Today</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: ink, marginBottom: 8 }}>{todayBookings}</div>
                <div style={{ color: '#718096', fontSize: 12 }}>{todayStr}</div>
              </div>
              <div style={{ background: '#fff', borderRadius: 16, padding: '16px', border: `1px solid ${mist}`, boxShadow: '0 8px 20px rgba(0,0,0,0.08)' }}>
                <div style={{ color: '#718096', fontSize: 12, marginBottom: 8 }}>Upcoming Today</div>
                {upcomingWithinHour.length === 0 ? (
                  <div style={{ color: '#718096', fontSize: 14 }}>No upcoming events or bookings.</div>
                ) : (
                  <div style={{ color: ink, fontWeight: 600, fontSize: 14 }}>{upcomingWithinHour.length} item(s)</div>
                )}
                <div style={{ color: '#718096', fontSize: 12, marginTop: 4 }}>{todayStr}</div>
              </div>
            </div>
            <div style={{
              padding: '24px',
              background: `linear-gradient(135deg, ${stone}40, ${mist}40)`,
              borderRadius: 12,
              border: `2px solid ${gold}`
            }}>
              <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 16, color: ink }}>📈 System Overview</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                <div style={{
                  background: '#fff',
                  padding: '16px',
                  borderRadius: 10,
                  border: `1px solid ${mist}`,
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>👥</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Total Parishioners</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: ink }}>{reportData.totalUsers}</div>
                </div>
                <div style={{
                  background: '#fff',
                  padding: '16px',
                  borderRadius: 10,
                  border: `1px solid ${mist}`,
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>🕯</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Total Events</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: ink }}>{reportData.totalEvents}</div>
                </div>
                <div style={{
                  background: '#fff',
                  padding: '16px',
                  borderRadius: 10,
                  border: `1px solid ${mist}`,
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>✅</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Total Bookings</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: ink }}>{reportData.totalBookings}</div>
                </div>
                <div style={{
                  background: '#fff',
                  padding: '16px',
                  borderRadius: 10,
                  border: `1px solid ${mist}`,
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>📖</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Records</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: ink }}>{reportData.totalRecords}</div>
                </div>
              </div>
            </div>
          </div>
        )}
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
            <h2 style={{ color: ink, borderBottom: `3px solid ${gold}`, paddingBottom: 8, marginBottom: 16, fontWeight: 800, fontSize: 22 }}>✦ Parishioners</h2>
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
                {users.map(u => (
                  <tr key={u.id}>
                    <td style={td}>{u.id}</td>
                    <td style={td}>{u.name}</td>
                    <td style={td}>{u.email}</td>
                    <td style={td}>{u.role}</td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td style={td} colSpan={4}>No users match your search.</td>
                  </tr>
                )}
              </tbody>
            </table>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, alignItems: 'center' }}>
              <button
                onClick={() => setUserPage(p => Math.max(1, p - 1))}
                disabled={userPage <= 1}
                style={{ ...dangerBtn, background: '#94a3b8' }}
              >
                Prev
              </button>
              <div style={{ color: '#4a5568', fontWeight: 600 }}>
                Page {userPage}
              </div>
              <button
                onClick={() => setUserPage(p => p + 1)}
                disabled={!userHasMore}
                style={{ ...dangerBtn, background: accentBlue }}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* EVENTS */}
        {activeTab === 'events' && (
          <div>
            <h2 style={{ color: ink, borderBottom: `3px solid ${gold}`, paddingBottom: 8, marginBottom: 16, fontWeight: 800, fontSize: 22 }}>✦ Events</h2>
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
              {events.map(e => {
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
              {events.length === 0 && (
                <tr>
                  <td style={td} colSpan={6}>No events match your search.</td>
                </tr>
              )}
            </tbody>
          </table>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, alignItems: 'center' }}>
            <button
              onClick={() => setEventPage(p => Math.max(1, p - 1))}
              disabled={eventPage <= 1}
              style={{ ...dangerBtn, background: '#94a3b8' }}
            >
              Prev
            </button>
            <div style={{ color: '#4a5568', fontWeight: 600 }}>
              Page {eventPage}
            </div>
            <button
              onClick={() => setEventPage(p => p + 1)}
              disabled={!eventHasMore}
              style={{ ...dangerBtn, background: accentBlue }}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* BOOKINGS */}
      {activeTab === 'bookings' && (
        <div>
          <h2 style={{ color: ink, borderBottom: `3px solid ${gold}`, paddingBottom: 8, marginBottom: 16, fontWeight: 800, fontSize: 22 }}>✦ Bookings</h2>
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
              {bookings.map(b => {
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
              {bookings.length === 0 && (
                <tr>
                  <td style={td} colSpan={7}>No bookings match your search.</td>
                </tr>
              )}
            </tbody>
          </table>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, alignItems: 'center' }}>
            <button
              onClick={() => setBookingPage(p => Math.max(1, p - 1))}
              disabled={bookingPage <= 1}
              style={{ ...dangerBtn, background: '#94a3b8' }}
            >
              Prev
            </button>
            <div style={{ color: '#4a5568', fontWeight: 600 }}>
              Page {bookingPage}
            </div>
            <button
              onClick={() => setBookingPage(p => p + 1)}
              disabled={!bookingHasMore}
              style={{ ...dangerBtn, background: accentBlue }}
            >
              Next
            </button>
          </div>
        </div>
      )}

        {activeTab === 'requests' && (
          <AdminRequestPanel onDecision={loadData} />
        )}

        {activeTab === 'concerns' && (
          <div>
            <h2 style={{ color: ink, borderBottom: `3px solid ${gold}`, paddingBottom: 8, marginBottom: 16, fontWeight: 800, fontSize: 22 }}>✦ Concerns</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>ID</th>
                  <th style={th}>User</th>
                  <th style={th}>Email</th>
                  <th style={th}>Subject</th>
                  <th style={th}>Message</th>
                  <th style={th}>Status</th>
                  <th style={th}>Reply</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {concerns.map(c => {
                  const statusLower = String(c.status || 'open').toLowerCase();
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
                    statusIcon = '↻';
                  }
                  
                  return (
                    <tr key={c.id}>
                      <td style={td}>{c.id}</td>
                      <td style={td}>{c.name || '-'}</td>
                      <td style={td}>{c.email || '-'}</td>
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
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button
                            onClick={() => {
                              setReplyConcern(c);
                              setReplyMessage(c.reply_message || '');
                              setReplyStatus(String(c.status || 'open').toLowerCase() === 'resolved' ? 'resolved' : 'open');
                              setReplyResolutionNote(c.resolution_note || '');
                              setReplyError('');
                              setConcernReplyOpen(true);
                            }}
                            style={{
                              padding: '6px 10px',
                              background: accentBlue,
                              color: '#fff',
                              border: 'none',
                              borderRadius: 6,
                              cursor: 'pointer',
                              fontSize: 12,
                              fontWeight: 600,
                              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => e.target.style.background = '#2d4a6f'}
                            onMouseLeave={(e) => e.target.style.background = accentBlue}
                          >
                            ✉️ Reply
                          </button>
                          <button
                            disabled={isResolved}
                            onClick={async () => {
                              const note = window.prompt('Resolution note (optional):', '');
                              try {
                                await api.concerns.update(c.id, { status: 'resolved', resolution_note: note || '' });
                                loadData();
                              } catch (err) {
                                window.alert(err.response?.data?.error || 'Failed to resolve concern.');
                              }
                            }}
                            style={{
                              padding: '6px 10px',
                              background: isResolved ? '#cbd5e0' : '#2f855a',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 6,
                              cursor: isResolved ? 'not-allowed' : 'pointer',
                              fontSize: 12,
                              fontWeight: 600,
                              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => !isResolved && (e.target.style.background = '#1e5c3a')}
                            onMouseLeave={(e) => !isResolved && (e.target.style.background = '#2f855a')}
                          >
                            {isResolved ? '✓ Resolved' : '✓ Resolve'}
                          </button>
                          <button
                            onClick={async () => {
                              if (!window.confirm('Delete this concern?')) return;
                              try {
                                await api.concerns.delete(c.id);
                                loadData();
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
                            🗑️ Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {concerns.length === 0 && (
                  <tr>
                    <td style={td} colSpan={8}>No concerns submitted yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, alignItems: 'center' }}>
              <button
                onClick={() => setConcernPage(p => Math.max(1, p - 1))}
                disabled={concernPage <= 1}
                style={{ ...dangerBtn, background: '#94a3b8' }}
              >
                Prev
              </button>
              <div style={{ color: '#4a5568', fontWeight: 600 }}>
                Page {concernPage}
              </div>
              <button
                onClick={() => setConcernPage(p => p + 1)}
                disabled={!concernHasMore}
                style={{ ...dangerBtn, background: accentBlue }}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {activeTab === 'records' && (
          <div>
            <h2 style={{ color: ink, borderBottom: `3px solid ${gold}`, paddingBottom: 8, marginBottom: 16, fontWeight: 800, fontSize: 22 }}>✦ Booking Records</h2>
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
                {records.map(r => (
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
                {records.length === 0 && (
                  <tr>
                    <td style={td} colSpan={8}>No booking records match your search.</td>
                  </tr>
                )}
              </tbody>
            </table>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, alignItems: 'center' }}>
              <button
                onClick={() => setRecordPage(p => Math.max(1, p - 1))}
                disabled={recordPage <= 1}
                style={{ ...dangerBtn, background: '#94a3b8' }}
              >
                Prev
              </button>
              <div style={{ color: '#4a5568', fontWeight: 600 }}>
                Page {recordPage}
              </div>
              <button
                onClick={() => setRecordPage(p => p + 1)}
                disabled={!recordHasMore}
                style={{ ...dangerBtn, background: accentBlue }}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div>
            <h2 style={{ color: ink, borderBottom: `3px solid ${gold}`, paddingBottom: 8, marginBottom: 16, fontWeight: 800, fontSize: 22 }}>✦ Reporting</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginBottom: 16 }}>
              <div style={{ background: '#fff', border: `2px solid ${gold}`, borderTop: `4px solid ${gold}`, borderRadius: 8, padding: 12, boxShadow: '0 6px 16px rgba(0,0,0,0.08)' }}>
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

        {activeTab === 'tracking' && (
          <div>
            <h2 style={{ color: ink, borderBottom: `3px solid ${gold}`, paddingBottom: 8, marginBottom: 16, fontWeight: 800, fontSize: 22 }}>📊 Admin Action Log</h2>
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
                <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 16 }}>📈 System Activity Overview</div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
                  <div style={{
                    background: '#fff',
                    padding: '12px',
                    borderRadius: 10,
                    border: `1px solid ${mist}`,
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: 24, marginBottom: 4 }}>📣</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>Open Concerns</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: ink }}>{openConcernsCount}</div>
                  </div>
                  <div style={{
                    background: '#fff',
                    padding: '12px',
                    borderRadius: 10,
                    border: `1px solid ${mist}`,
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: 24, marginBottom: 4 }}>📜</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>Pending Requests</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: ink }}>{pendingRequestsCount}</div>
                  </div>
                  <div style={{
                    background: '#fff',
                    padding: '12px',
                    borderRadius: 10,
                    border: `1px solid ${mist}`,
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: 24, marginBottom: 4 }}>📅</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>Total Bookings</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: ink }}>{bookings.length}</div>
                  </div>
                  <div style={{
                    background: '#fff',
                    padding: '12px',
                    borderRadius: 10,
                    border: `1px solid ${mist}`,
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: 24, marginBottom: 4 }}>🕯</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>Total Events</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: ink }}>{events.length}</div>
                  </div>
                </div>

                <div style={{
                  borderTop: `2px solid ${mist}`,
                  paddingTop: 16,
                  marginTop: 16
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 12 }}>Recent Concerns</div>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {concerns.slice(0, 5).length > 0 ? (
                      concerns.slice(0, 5).map(c => {
                        const statusLower = String(c.status || 'open').toLowerCase();
                        let statusIcon = '📬';
                        if (statusLower === 'resolved') statusIcon = '✅';
                        else if (statusLower === 'pending') statusIcon = '⏱';
                        else if (statusLower === 'updating') statusIcon = '🔄';
                        
                        return (
                          <div key={c.id} style={{
                            padding: '10px',
                            background: '#fff',
                            borderRadius: 8,
                            border: `1px solid ${mist}`,
                            borderLeft: `4px solid ${gold}`
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, color: ink }}>{c.subject || 'No subject'}</div>
                                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>From: {c.name || 'Unknown'}</div>
                              </div>
                              <div style={{ fontSize: 16 }}>{statusIcon}</div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ color: '#6b7280', fontSize: 13, padding: '12px', textAlign: 'center' }}>No concerns to track.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  </div>
</div>
  );
}
