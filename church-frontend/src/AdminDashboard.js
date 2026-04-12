import React, { useEffect, useState, useContext, useMemo } from 'react';
import api from './api';
import { useCallback } from 'react';
import CalendarViewNew from './CalendarViewNew';
import { SocketContext } from './App';
import AdminRequestPanel from './AdminRequestPanel';
import AdminMassServicesPanel from './AdminMassServicesPanel';
import { loadSidebarContact, saveSidebarContact } from './sidebarContact';
import { BOOKING_TIME_MAX, BOOKING_TIME_MIN, DATE_FIELD_KEYS, NAME_MAX_LENGTH, getTomorrowIsoDate, isAllowedBookingTime, isFutureIsoDate, isValidNameValue, sanitizeFieldValue, sanitizeNameInput, PHONE_FIELD_KEYS, NAME_FIELD_KEYS } from './inputValidation';
import { STATUS_COLORS, HELP_TEXT } from './systemConstants';
import { useToast } from './ToastNotification';
import { Tooltip, HelpIcon, InfoCard } from './HelpSystem';
import { TodoSummaryWidget } from './TodoSummaryWidget';
import { StatusBadge, StatusTimeline, PermissionDisplay, ConfirmationDialog } from './StatusComponents';
import { QuickFilters, BulkActionsToolbar, LoadingSpinner } from './FormComponents';
import { ActivityLog, ActivityFilters } from './ActivityLog';

/* ---------- shared styles (parish palette) ---------- */
const stone = '#f8f4ec';
const ink = '#1f2a44';
const gold = '#d6ad60';
const mist = '#e7dfcf';
const accentBlue = '#3b5b8a';
const churchDisplayFont = "'Cormorant Garamond', Georgia, serif";
const churchBodyFont = "'Alegreya Sans', 'Segoe UI', sans-serif";

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
const CHAPEL_OPTIONS = ['Main Chapel', 'Side Chapel #1'];
const BOOKING_SHARED_DETAIL_KEYS = new Set(['chapel', 'needsChairsTables', 'chairsCount', 'tablesCount']);

export default function AdminDashboard({ user, onLogout }) {
  const socket = useContext(SocketContext);
  const { addToast } = useToast();

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
  const [bookingChapel, setBookingChapel] = useState('');
  const [bookingNeedsChairsTables, setBookingNeedsChairsTables] = useState(false);
  const [bookingChairsCount, setBookingChairsCount] = useState('');
  const [bookingTablesCount, setBookingTablesCount] = useState('');
  const [bookingDetailsExtra, setBookingDetailsExtra] = useState('');
  const [timeTrigger, setTimeTrigger] = useState(0);
  const [sidebarContact, setSidebarContact] = useState(loadSidebarContact());
  const [contactEditorOpen, setContactEditorOpen] = useState(false);
  const [contactDraft, setContactDraft] = useState(loadSidebarContact());
  const [contactError, setContactError] = useState('');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [requests, setRequests] = useState([]);
  const [showCollectiveServiceModal, setShowCollectiveServiceModal] = useState(false);
  
  // New feature states
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [activityLog, setActivityLog] = useState([]);
  const [selectedRequestIds, setSelectedRequestIds] = useState(new Set());
  const [requestFilters, setRequestFilters] = useState('all');
  const [showPermissions, setShowPermissions] = useState(false);

  // Track window width for responsive grid layout
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Toggle body class when sidebar opens/closes on mobile
  useEffect(() => {
    if (window.innerWidth < 900) {
      if (sidebarOpen) {
        document.body.classList.add('sidebar-drawer-open');
      } else {
        document.body.classList.remove('sidebar-drawer-open');
      }
    }
    return () => document.body.classList.remove('sidebar-drawer-open');
  }, [sidebarOpen]);

  useEffect(() => {
    if (!profileMenuOpen) return;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setProfileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [profileMenuOpen]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [sidebarOpen]);

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
        if (BOOKING_SHARED_DETAIL_KEYS.has(k)) return;
        if (!fields.includes(k)) extras[k] = detailsObj[k];
      });
    }
    return {
      fieldValues,
      chapel: detailsObj?.chapel || '',
      needsChairsTables: !!detailsObj?.needsChairsTables,
      chairsCount: detailsObj?.chairsCount ?? '',
      tablesCount: detailsObj?.tablesCount ?? '',
      extrasText: Object.keys(extras).length ? JSON.stringify(extras, null, 2) : ''
    };
  };

  const formatBookingDetails = (detailsObj) => {
    if (!detailsObj || typeof detailsObj !== 'object') return '-';
    const parts = [];

    if (detailsObj.chapel) {
      parts.push(`Chapel: ${detailsObj.chapel}`);
    }

    if (detailsObj.needsChairsTables) {
      parts.push(`Chairs: ${detailsObj.chairsCount || '0'}`);
      parts.push(`Tables: ${detailsObj.tablesCount || '0'}`);
    }

    Object.entries(detailsObj).forEach(([key, value]) => {
      if (BOOKING_SHARED_DETAIL_KEYS.has(key)) return;
      if (value === null || value === undefined) return;
      const text = String(value).trim();
      if (!text) return;
      parts.push(`${key}: ${text}`);
    });

    return parts.length ? parts.join(' | ') : '-';
  };

  useEffect(() => {
    if (!user) return;
    setProfileName(user.name || '');
    setProfileEmail(user.email || '');
  }, [user]);

  useEffect(() => {
    const syncContact = () => {
      const latest = loadSidebarContact();
      setSidebarContact(latest);
      setContactDraft(prev => ({ ...latest, ...prev }));
    };
    syncContact();
    window.addEventListener('storage', syncContact);
    return () => window.removeEventListener('storage', syncContact);
  }, []);

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
    const {
      fieldValues,
      chapel,
      needsChairsTables,
      chairsCount,
      tablesCount,
      extrasText
    } = buildDetailsState(booking.service, detailsObj);
    setEditingBooking(booking);
    setBookingForm({
      service: booking.service || '',
      date: booking.date || '',
      slot: booking.slot || '',
      details: JSON.stringify(booking.details || {}, null, 2)
    });
    setBookingDetailsFields(fieldValues);
    setBookingChapel(chapel);
    setBookingNeedsChairsTables(needsChairsTables);
    setBookingChairsCount(chairsCount);
    setBookingTablesCount(tablesCount);
    setBookingDetailsExtra(extrasText);
    setBookingError('');
    setBookingEditorOpen(true);
  };

  const bookingDetailsSummary = useMemo(() => {
    if (!editingBooking) return [];
    const detailsObj = editingBooking.details && typeof editingBooking.details === 'object'
      ? editingBooking.details
      : {};
    const key = String(editingBooking.service || '').trim().toLowerCase();
    const fields = SERVICE_FIELDS[key] || [];
    const lines = [
      { label: 'Service', value: editingBooking.service || '-' },
      { label: 'Date', value: editingBooking.date || '-' },
      { label: 'Time', value: editingBooking.slot || '-' },
      { label: 'Requester', value: editingBooking.name || editingBooking.email || '-' }
    ];

    if (detailsObj.chapel) {
      lines.push({ label: 'Current Place / Chapel', value: detailsObj.chapel });
    }
    if (detailsObj.needsChairsTables) {
      lines.push({ label: 'Chairs Needed', value: detailsObj.chairsCount || '0' });
      lines.push({ label: 'Tables Needed', value: detailsObj.tablesCount || '0' });
    }
    fields.forEach((field) => {
      if (field === 'chapel') return;
      const value = detailsObj[field];
      if (value === undefined || value === null || String(value).trim() === '') return;
      lines.push({ label: field, value: String(value) });
    });
    return lines;
  }, [editingBooking]);

  /* ---------- load all admin data ---------- */
  const loadData = async () => {
    try {
      const [c, reqCount, conCount, reqs] = await Promise.all([
        api.calendar.get(),
        api.bookingRequests.count({ status: 'pending' }),
        api.concerns.count({ status: 'open' }),
        api.bookingRequests.list({ limit: 1000 }) // Load all requests for analysis
      ]);
      setCalendarConfig(c.data || {});
      setPendingRequestsCount(reqCount.data?.count || 0);
      setOpenConcernsCount(conCount.data?.count || 0);
      setRequests(reqs.data || []);
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

    // Re-sync data from DB whenever socket (re)connects
    socket.on('connect', refresh);
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
      socket.off('connect', refresh);
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

    const setupStats = bookings.reduce((acc, b) => {
      const details = b.details && typeof b.details === 'object' ? b.details : {};
      const needsSetup = !!details.needsChairsTables;
      const chairsCount = Number.parseInt(details.chairsCount, 10);
      const tablesCount = Number.parseInt(details.tablesCount, 10);

      if (needsSetup || Number.isFinite(chairsCount) || Number.isFinite(tablesCount)) {
        acc.setupBookings += 1;
      }
      if (Number.isFinite(chairsCount)) {
        acc.totalChairsRequested += chairsCount;
      }
      if (Number.isFinite(tablesCount)) {
        acc.totalTablesRequested += tablesCount;
      }
      return acc;
    }, {
      setupBookings: 0,
      totalChairsRequested: 0,
      totalTablesRequested: 0
    });

    return {
      totalUsers: users.length,
      totalEvents: events.length,
      totalBookings: bookings.length,
      totalRecords: records.length,
      serviceCounts,
      actionCounts,
      roleCounts,
      ...setupStats
    };
  }, [bookings, records, users, events]);

  // Analyze collective service candidates
  const collectiveServiceCandidates = useMemo(() => {
    const candidates = [];
    const grouped = {};

    // Group requests by date + service
    requests.forEach(req => {
      const key = `${req.date}|${req.service}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(req);
    });

    console.log('📊 Grouping Analysis:', {
      totalRequests: requests.length,
      groupedKeys: Object.keys(grouped),
      allGroups: grouped
    });

    // Find groups with > 4 requests
    Object.entries(grouped).forEach(([key, reqs]) => {
      console.log(`  Group "${key}": ${reqs.length} requests`);
      if (reqs.length > 4) {
        const [date, service] = key.split('|');
        console.log(`  ✅ Collective service candidate found!`);
        candidates.push({
          date,
          service,
          count: reqs.length,
          requests: reqs
        });
      }
    });

    console.log('💡 Final candidates:', candidates);

    return candidates;
  }, [requests]);

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
        fontFamily: churchBodyFont,
        color: ink,
        background:
          "linear-gradient(135deg, rgba(248, 244, 236, 0.9), rgba(255,255,255,0.82)), url('/login-bg.jpg') center/cover no-repeat fixed"
      }}
    >
      {sidebarOpen && (
        <div
          className="dashboard-drawer-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      <div className="church-ornament-top dashboard-shell-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 20,
        marginBottom: 16,
        flexWrap: 'wrap'
      }}>
        <div className="dashboard-shell-header-left" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button
            className="sidebar-toggle-btn"
            aria-label="Show navigation panel"
            onClick={() => setSidebarOpen(v => !v)}
            style={{
              all: 'unset',
              cursor: 'pointer',
              fontSize: 24,
              color: '#fff',
              fontWeight: 800,
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 14,
              background: 'linear-gradient(135deg, rgba(31,42,68,0.98), rgba(59,91,138,0.92))',
              border: `1px solid ${gold}`,
              boxShadow: '0 10px 24px rgba(31,42,68,0.18), inset 0 1px 0 rgba(255,255,255,0.2)',
              minWidth: 48
            }}
          >
            ☰
          </button>
          <div className="dashboard-brand" style={{ paddingTop: 0, paddingBottom: 0, textAlign: 'left' }}>
            <div className="dashboard-brand-title dashboard-shell-title" style={{ color: ink, textShadow: '0 4px 20px rgba(0,0,0,0.12)', margin: 0, fontFamily: churchDisplayFont, letterSpacing: 0.6 }}>Parish Admin</div>
            <div className="dashboard-brand-subtitle" style={{ color: '#4a5568', marginTop: 4, fontFamily: churchBodyFont, fontStyle: 'italic' }}>Parish Management</div>
          </div>
        </div>

        <div className="dashboard-shell-header-actions" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 8,
          flexWrap: 'wrap',
          marginLeft: 'auto'
        }}>
          <button
            onClick={() => setActiveTab('analytics')}
            style={{
              all: 'unset',
              cursor: 'pointer',
              padding: '8px 12px',
              borderRadius: 16,
              background: activeTab === 'analytics' ? 'linear-gradient(135deg, #f7e8c8, #d6ad60 55%, #b8872c)' : 'transparent',
              color: ink,
              fontWeight: 800,
              fontSize: 11,
              transition: 'all 0.2s ease',
              border: `1px solid ${activeTab === 'analytics' ? gold : 'rgba(214,173,96,0.45)'}`,
              boxShadow: activeTab === 'analytics' ? '0 10px 24px rgba(214,173,96,0.22)' : '0 8px 18px rgba(0,0,0,0.08)',
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              lineHeight: 1
            }}
          >
            📊 Analytics
          </button>
          <button
            onClick={() => setActiveTab('records')}
            style={{
              all: 'unset',
              cursor: 'pointer',
              padding: '8px 12px',
              borderRadius: 16,
              background: activeTab === 'records' ? 'linear-gradient(135deg, #f7e8c8, #d6ad60 55%, #b8872c)' : 'transparent',
              color: ink,
              fontWeight: 800,
              fontSize: 11,
              transition: 'all 0.2s ease',
              border: `1px solid ${activeTab === 'records' ? gold : 'rgba(214,173,96,0.45)'}`,
              boxShadow: activeTab === 'records' ? '0 10px 24px rgba(214,173,96,0.22)' : '0 8px 18px rgba(0,0,0,0.08)',
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              lineHeight: 1
            }}
          >
            📖 Records
          </button>
          <button
            onClick={() => setActiveTab('bookings')}
            style={{
              all: 'unset',
              cursor: 'pointer',
              padding: '8px 12px',
              borderRadius: 16,
              background: activeTab === 'bookings' ? 'linear-gradient(135deg, #f7e8c8, #d6ad60 55%, #b8872c)' : 'transparent',
              color: ink,
              fontWeight: 800,
              fontSize: 11,
              transition: 'all 0.2s ease',
              border: `1px solid ${activeTab === 'bookings' ? gold : 'rgba(214,173,96,0.45)'}`,
              boxShadow: activeTab === 'bookings' ? '0 10px 24px rgba(214,173,96,0.22)' : '0 8px 18px rgba(0,0,0,0.08)',
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              lineHeight: 1
            }}
          >
            ✅ Bookings
          </button>
          <button
          onClick={() => setActiveTab('concerns')}
          style={{
            all: 'unset',
            cursor: 'pointer',
            padding: '8px 12px',
              borderRadius: 16,
              background: activeTab === 'concerns' ? 'linear-gradient(135deg, #f7e8c8, #d6ad60 55%, #b8872c)' : 'transparent',
              color: ink,
              fontWeight: 800,
              fontSize: 11,
              transition: 'all 0.2s ease',
              border: `1px solid ${activeTab === 'concerns' ? gold : 'rgba(214,173,96,0.45)'}`,
              boxShadow: activeTab === 'concerns' ? '0 10px 24px rgba(214,173,96,0.22)' : '0 8px 18px rgba(0,0,0,0.08)',
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              lineHeight: 1
            }}
          >
            📣 Concerns
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            style={{
              all: 'unset',
              cursor: 'pointer',
              padding: '8px 12px',
              borderRadius: 16,
              background: activeTab === 'requests' ? 'linear-gradient(135deg, #f7e8c8, #d6ad60 55%, #b8872c)' : 'transparent',
              color: ink,
              fontWeight: 800,
              fontSize: 11,
              transition: 'all 0.2s ease',
              border: `1px solid ${activeTab === 'requests' ? gold : 'rgba(214,173,96,0.45)'}`,
              boxShadow: activeTab === 'requests' ? '0 10px 24px rgba(214,173,96,0.22)' : '0 8px 18px rgba(0,0,0,0.08)',
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              lineHeight: 1
            }}
          >
            📜 Requests
          </button>
          <button
            onClick={() => setActiveTab('mass_services')}
            style={{
              all: 'unset',
              cursor: 'pointer',
              padding: '8px 12px',
              borderRadius: 16,
              background: activeTab === 'mass_services' ? 'linear-gradient(135deg, #f7e8c8, #d6ad60 55%, #b8872c)' : 'transparent',
              color: ink,
              fontWeight: 800,
              fontSize: 11,
              transition: 'all 0.2s ease',
              border: `1px solid ${activeTab === 'mass_services' ? gold : 'rgba(214,173,96,0.45)'}`,
              boxShadow: activeTab === 'mass_services' ? '0 10px 24px rgba(214,173,96,0.22)' : '0 8px 18px rgba(0,0,0,0.08)',
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              lineHeight: 1
            }}
          >
            🎫 Mass Services
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            style={{
              all: 'unset',
              cursor: 'pointer',
              padding: '7px 10px',
              borderRadius: 999,
              background: activeTab === 'calendar' ? 'linear-gradient(135deg, #f7e8c8, #d6ad60 55%, #b8872c)' : 'transparent',
              color: ink,
              fontWeight: 800,
              fontSize: 11,
              transition: 'all 0.2s ease',
              border: `1px solid ${activeTab === 'calendar' ? gold : 'rgba(214,173,96,0.45)'}`,
              boxShadow: activeTab === 'calendar' ? '0 10px 24px rgba(214,173,96,0.22)' : 'none',
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              lineHeight: 1
            }}
          >
            📅 Calendar
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            style={{
              all: 'unset',
              cursor: 'pointer',
              padding: '7px 10px',
              borderRadius: 999,
              background: activeTab === 'activity' ? 'linear-gradient(135deg, #f7e8c8, #d6ad60 55%, #b8872c)' : 'transparent',
              color: ink,
              fontWeight: 800,
              fontSize: 11,
              transition: 'all 0.2s ease',
              border: `1px solid ${activeTab === 'activity' ? gold : 'rgba(214,173,96,0.45)'}`,
              boxShadow: activeTab === 'activity' ? '0 10px 24px rgba(214,173,96,0.22)' : 'none',
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              lineHeight: 1
            }}
          >
            📋 Activity Log
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            style={{
              all: 'unset',
              cursor: 'pointer',
              padding: '7px 10px',
              borderRadius: 999,
              background: activeTab === 'settings' ? 'linear-gradient(135deg, #f7e8c8, #d6ad60 55%, #b8872c)' : 'transparent',
              color: ink,
              fontWeight: 800,
              fontSize: 11,
              transition: 'all 0.2s ease',
              border: `1px solid ${activeTab === 'settings' ? gold : 'rgba(214,173,96,0.45)'}`,
              boxShadow: activeTab === 'settings' ? '0 10px 24px rgba(214,173,96,0.22)' : 'none',
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              lineHeight: 1
            }}
          >
            ⚙️ Settings
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
              <>
                <div
                  className="dashboard-profile-backdrop"
                  onClick={() => setProfileMenuOpen(false)}
                  aria-hidden="true"
                />
                <div
                  className="dashboard-profile-menu"
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
                    zIndex: 9992
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
              </>
            )}
          </div>
        </div>
      </div>

      {profileEditorOpen && (
        <div
          className="church-review-overlay dashboard-dialog-overlay"
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
            className="dashboard-dialog-card church-review-card"
            style={{
              width: '100%',
              maxWidth: 520,
              background: 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,244,236,0.98))',
              borderRadius: 20,
              padding: 22,
              border: `1px solid rgba(214,173,96,0.42)`,
              boxShadow: '0 24px 60px rgba(31,42,68,0.22)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="church-review-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div className="church-review-kicker">✦ Profile Settings</div>
              <button
                onClick={() => {
                  if (profileSaving) return;
                  setProfileEditorOpen(false);
                  setProfileError('');
                  setProfilePassword('');
                  setProfileConfirm('');
                }}
                className="church-review-close"
                style={{ cursor: 'pointer' }}
              >
                ×
              </button>
            </div>
            <h3 className="church-review-title">Edit Profile</h3>
            <div className="church-review-subtitle">
              Keep your parish account details current. Name and email are required, and password changes are optional.
            </div>
            <div className="church-review-sheet" style={{ display: 'grid', gap: 12 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6 }}>Name</label>
                <input
                  type="text"
                  value={profileName}
                  maxLength={NAME_MAX_LENGTH}
                  onChange={(e) => setProfileName(sanitizeNameInput(e.target.value))}
                  style={{ width: '100%', padding: 10, borderRadius: 12, border: `1px solid ${mist}` }}
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
                <div className="church-review-error">{profileError}</div>
              )}
              <div className="church-review-actions dashboard-dialog-actions" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    if (profileSaving) return;
                    setProfileEditorOpen(false);
                    setProfileError('');
                    setProfilePassword('');
                    setProfileConfirm('');
                  }}
                  className="church-review-btn church-review-btn--soft"
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
                    if (!isValidNameValue(profileName)) {
                      setProfileError(`Name must be ${NAME_MAX_LENGTH} characters or fewer and use letters, spaces, apostrophes, or hyphens only.`);
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
                  className="church-review-btn church-review-btn--primary"
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
          className="dashboard-dialog-overlay"
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
            className="dashboard-dialog-card"
            style={{
              width: '100%',
              maxWidth: 760,
              background: '#fff',
              borderRadius: 16,
              padding: 20,
              border: `1px solid ${mist}`,
              boxShadow: '0 20px 50px rgba(0,0,0,0.18)',
              maxHeight: 'calc(100vh - 32px)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, color: ink }}>Propose Booking Change</h3>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                  Review the original request, then adjust only the place and time.
                </div>
              </div>
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
            <div style={{ overflowY: 'auto', paddingRight: 4, display: 'grid', gap: 14 }}>
              <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                <div style={{ border: `1px solid ${mist}`, borderRadius: 12, padding: 12, background: '#fbfaf7' }}>
                  <div style={{ fontWeight: 800, marginBottom: 8, color: ink }}>Booking Review</div>
                  <div style={{ display: 'grid', gap: 6, color: '#4a5568', fontSize: 14 }}>
                    {bookingDetailsSummary.map(item => (
                      <div key={item.label}>
                        <strong>{item.label}:</strong> {item.value}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ border: `1px solid ${gold}55`, borderRadius: 12, padding: 12, background: 'rgba(248,244,236,0.72)' }}>
                  <div style={{ fontWeight: 800, marginBottom: 8, color: ink }}>Editable Fields</div>
                  <div style={{ color: '#4a5568', fontSize: 14, lineHeight: 1.5 }}>
                    Only the place / chapel and the time can be changed. Everything else is shown below for review.
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 6 }}>Chapel</label>
                <select
                  value={bookingChapel}
                  onChange={(e) => setBookingChapel(e.target.value)}
                  style={{ width: '100%', padding: 10, borderRadius: 8, border: `1px solid ${mist}`, background: '#fff' }}
                >
                  <option value="">Select a chapel</option>
                  {CHAPEL_OPTIONS.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6 }}>Service</label>
                <input
                  type="text"
                  value={bookingForm.service}
                  disabled
                  style={{ width: '100%', padding: 10, borderRadius: 8, border: `1px solid ${mist}`, background: '#f8fafc', color: '#475569' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 6 }}>Date</label>
                  <input
                    type="date"
                    value={bookingForm.date}
                    disabled
                    style={{ width: '100%', padding: 10, borderRadius: 8, border: `1px solid ${mist}`, background: '#f8fafc', color: '#475569' }}
                  />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6 }}>Preferred Time</label>
                <input
                  type="time"
                  value={bookingForm.slot}
                  onChange={(e) => setBookingForm(f => ({ ...f, slot: e.target.value }))}
                  step="1800"
                  min={BOOKING_TIME_MIN}
                  max={BOOKING_TIME_MAX}
                  style={{ width: '100%', padding: 10, borderRadius: 12, border: `1px solid ${mist}` }}
                />
              </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6 }}>Service Details for Review</label>
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
                            type={DATE_FIELD_KEYS.has(field) ? 'date' : 'text'}
                            value={bookingDetailsFields[field] || ''}
                            disabled
                            inputMode={PHONE_FIELD_KEYS.has(field) ? 'numeric' : undefined}
                            max={DATE_FIELD_KEYS.has(field) ? getTodayIsoDate() : undefined}
                            maxLength={PHONE_FIELD_KEYS.has(field) ? 11 : NAME_FIELD_KEYS.has(field) ? NAME_MAX_LENGTH : undefined}
                            style={{ width: '100%', padding: 10, borderRadius: 8, border: `1px solid ${mist}`, background: '#f8fafc', color: '#475569' }}
                          />
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6 }}>Additional Details for Review</label>
                <textarea
                  rows={4}
                  value={bookingDetailsExtra}
                  disabled
                  style={{ width: '100%', padding: 10, borderRadius: 8, border: `1px solid ${mist}`, background: '#f8fafc', color: '#475569' }}
                />
              </div>
              {bookingError && (
                <div style={{ color: '#b0413e', fontWeight: 600 }}>{bookingError}</div>
              )}
              <div className="dashboard-dialog-actions" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
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
                className="dashboard-action-btn dashboard-action-btn--primary"
                disabled={bookingSaving}
                  onClick={async () => {
                    if (!editingBooking?.id) {
                      setBookingError('Missing booking id.');
                      return;
                    }
                    if (!String(bookingChapel || '').trim()) {
                      setBookingError('Chapel is required.');
                      return;
                    }
                    if (!isAllowedBookingTime(bookingForm.slot)) {
                      setBookingError('Preferred time must be between 8:00 AM and 6:00 PM.');
                      return;
                    }
                    try {
                      setBookingSaving(true);
                      setBookingError('');
                      await api.bookings.update(editingBooking.id, {
                        details: { chapel: bookingChapel },
                        slot: bookingForm.slot,
                        note: `Proposed by admin for review.`
                      });
                      setBookingEditorOpen(false);
                      setEditingBooking(null);
                      setBookingChapel('');
                      await loadData();
                    } catch (err) {
                      setBookingError(err.response?.data?.error || 'Failed to send booking change proposal.');
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
                  {bookingSaving ? 'Sending...' : 'Send Proposal'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {concernReplyOpen && (
        <div
          className="dashboard-dialog-overlay"
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
            className="dashboard-dialog-card"
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
                  style={{ width: '100%', padding: 10, borderRadius: 12, border: `1px solid ${mist}` }}
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
                  style={{ width: '100%', padding: 10, borderRadius: 12, border: `1px solid ${mist}` }}
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
              <div className="dashboard-dialog-actions" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
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
                  className="dashboard-action-btn dashboard-action-btn--primary"
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
          <button
            type="button"
            className="dashboard-drawer-close-btn"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation panel"
            style={{ position: 'static' }}
          >
            <span className="dashboard-drawer-close-arrow">←</span>
            <span className="dashboard-drawer-close-text">Back</span>
          </button>
          <h3 style={{ margin: '8px 0 0 0', color: ink, textAlign: 'center', fontSize: 17, fontWeight: 800 }}>✦ Admin Panel ✦</h3>
          <div style={{ fontSize: 12, textAlign: 'center', color: gold, marginTop: 4 }}>Parish Management</div>
        </div>
        {/* Tab buttons on expandable sidebar */}
          <div style={{ background: '#f9fafb', borderRadius: 16, padding: 12, display: 'flex', flexDirection: 'column', gap: 14, flex: 1, minHeight: 0, overflowY: 'auto' }} className="dashboard-sidebar-content">

          <div className="dashboard-admin-grid" style={{
            display: 'grid',
            gridTemplateColumns: windowWidth >= 900 ? 'repeat(2, minmax(0, 1fr))' : '1fr',
            gap: 10
          }}>
            {[
              { key: 'calendar', label: 'Calendar', icon: '📅' },
              { key: 'analytics', label: 'Analytics', icon: '📊', count: collectiveServiceCandidates.length },
              { key: 'requests', label: 'Requests', icon: '📜', count: pendingRequestsCount },
              { key: 'bookings', label: 'Bookings', icon: '✅' },
              { key: 'events', label: 'Events', icon: '🕯' },
              { key: 'mass_services', label: 'Mass Services', icon: '🎫' },
              { key: 'users', label: 'Parishioners', icon: '👥' },
              { key: 'concerns', label: 'Concerns', icon: '📣', count: openConcernsCount },
              { key: 'records', label: 'Records', icon: '📖' },
              { key: 'reports', label: 'Reports', icon: '🕊' },
              { key: 'tracking', label: 'Actions', icon: '📊' },
              { key: 'add_event', label: 'Add Event', icon: '✚' },
            ].map(tab => (
              <button
                className="dashboard-tab-btn dashboard-tab-btn--admin"
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  background: activeTab === tab.key
                    ? `linear-gradient(135deg, ${accentBlue}, ${accentBlue}dd)`
                    : 'linear-gradient(180deg, #fff 0%, #fafaf8 100%)',
                  borderRadius: 16,
                  border: `2px solid ${activeTab === tab.key ? gold : 'rgba(214,173,96,0.35)'}`,
                  padding: '12px 10px',
                  minHeight: 74,
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  transition: 'all 0.2s ease',
                  boxShadow: activeTab === tab.key ? `0 8px 18px ${accentBlue}30` : '0 4px 12px rgba(0,0,0,0.05)'
                }}
              >
                <div style={{ fontSize: 22, lineHeight: 1 }}>{tab.icon}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: activeTab === tab.key ? '#fff' : ink }}>{tab.label}</div>
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

          <div style={{
            marginTop: 12,
            padding: '12px 14px',
            borderRadius: 12,
            border: `1px solid rgba(214,173,96,0.35)`,
            background: `linear-gradient(135deg, ${stone}80, ${mist}60)`,
            textAlign: 'center',
            color: '#4a5568',
            fontSize: 12,
            fontStyle: 'italic'
          }}>
            "Let us gather in fellowship and serve with compassion"
          </div>
          <div className="dashboard-sidebar-contact">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
              <div className="dashboard-sidebar-contact-title" style={{ marginBottom: 0 }}>{sidebarContact.title}</div>
              <button
                type="button"
                onClick={() => {
                  setContactError('');
                  setContactDraft(sidebarContact);
                  setContactEditorOpen(true);
                }}
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 700,
                  color: accentBlue,
                  whiteSpace: 'nowrap'
                }}
              >
                Edit
              </button>
            </div>
            <div style={{ fontSize: 12, color: '#4a5568', marginBottom: 8, lineHeight: 1.5 }}>
              {sidebarContact.contactNote}
            </div>
            <a
              className="dashboard-sidebar-contact-link"
              href={`mailto:${sidebarContact.email}`}
            >
              {sidebarContact.emailLabel}
            </a>
            <a
              className="dashboard-sidebar-contact-link"
              href={sidebarContact.phone ? `tel:${sidebarContact.phone}` : undefined}
              onClick={(e) => {
                if (!sidebarContact.phone) e.preventDefault();
              }}
            >
              {sidebarContact.phone ? `${sidebarContact.phoneLabel}: ${sidebarContact.phone}` : sidebarContact.phoneLabel}
            </a>
            <a
              className="dashboard-sidebar-contact-link"
              href={sidebarContact.facebookUrl}
              target="_blank"
              rel="noreferrer"
            >
              {sidebarContact.facebookLabel}
            </a>
          </div>
        </div>
      </aside>
      </div>

      {contactEditorOpen && (
        <div
          className="dashboard-dialog-overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => setContactEditorOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.5)',
            backdropFilter: 'blur(2px)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 10020,
            padding: 16
          }}
        >
          <div
            className="dashboard-dialog-card dashboard-contact-modal-card"
            style={{
              width: '100%',
              maxWidth: 640,
              maxHeight: 'calc(100vh - 32px)',
              overflow: 'hidden',
              background: '#fff',
              borderRadius: 18,
              border: `1px solid rgba(214,173,96,0.28)`,
              boxShadow: '0 24px 60px rgba(15,23,42,0.24)',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '18px 20px 14px', background: 'linear-gradient(180deg, rgba(248,244,236,0.98), rgba(255,255,255,0.98))', borderBottom: `1px solid rgba(214,173,96,0.18)` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div>
                  <h3 style={{ margin: 0, color: ink, fontSize: 22, lineHeight: 1.15 }}>Edit Contact Info</h3>
                  <div style={{ marginTop: 4, color: '#64748b', fontSize: 13, lineHeight: 1.45 }}>
                    Update the sidebar contact card and Facebook details shown to members.
                  </div>
                </div>
                <button
                  onClick={() => setContactEditorOpen(false)}
                  style={{ all: 'unset', cursor: 'pointer', color: '#64748b', fontWeight: 800, padding: '4px 8px', lineHeight: 1 }}
                  aria-label="Close contact editor"
                >
                  ✕
                </button>
              </div>
            </div>
            <div style={{ padding: 20, overflowY: 'auto', display: 'grid', gap: 16 }}>
              <div style={{ display: 'grid', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 700, color: ink }}>Section Title</label>
                  <input
                    value={contactDraft.title}
                    onChange={(e) => setContactDraft(prev => ({ ...prev, title: e.target.value }))}
                    style={{ width: '100%', padding: 12, borderRadius: 10, border: `1px solid ${mist}`, background: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 700, color: ink }}>Short Description</label>
                  <textarea
                    rows={3}
                    value={contactDraft.contactNote}
                    onChange={(e) => setContactDraft(prev => ({ ...prev, contactNote: e.target.value }))}
                    style={{ width: '100%', padding: 12, borderRadius: 10, border: `1px solid ${mist}`, background: '#fff', resize: 'vertical' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', color: '#64748b' }}>
                  Contact Channels
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: 6, fontWeight: 700, color: ink }}>Email Label</label>
                    <input
                      value={contactDraft.emailLabel}
                      onChange={(e) => setContactDraft(prev => ({ ...prev, emailLabel: e.target.value }))}
                      style={{ width: '100%', padding: 12, borderRadius: 10, border: `1px solid ${mist}`, background: '#fff' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 6, fontWeight: 700, color: ink }}>Email Address</label>
                    <input
                      type="email"
                      value={contactDraft.email}
                      onChange={(e) => setContactDraft(prev => ({ ...prev, email: e.target.value }))}
                      style={{ width: '100%', padding: 12, borderRadius: 10, border: `1px solid ${mist}`, background: '#fff' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 6, fontWeight: 700, color: ink }}>Phone Label</label>
                    <input
                      value={contactDraft.phoneLabel}
                      onChange={(e) => setContactDraft(prev => ({ ...prev, phoneLabel: e.target.value }))}
                      style={{ width: '100%', padding: 12, borderRadius: 10, border: `1px solid ${mist}`, background: '#fff' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 6, fontWeight: 700, color: ink }}>Phone Number</label>
                    <input
                      value={contactDraft.phone}
                      onChange={(e) => setContactDraft(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="e.g. +63 912 345 6789"
                      style={{ width: '100%', padding: 12, borderRadius: 10, border: `1px solid ${mist}`, background: '#fff' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 6, fontWeight: 700, color: ink }}>Facebook Label</label>
                    <input
                      value={contactDraft.facebookLabel}
                      onChange={(e) => setContactDraft(prev => ({ ...prev, facebookLabel: e.target.value }))}
                      style={{ width: '100%', padding: 12, borderRadius: 10, border: `1px solid ${mist}`, background: '#fff' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 6, fontWeight: 700, color: ink }}>Facebook URL</label>
                    <input
                      type="url"
                      value={contactDraft.facebookUrl}
                      onChange={(e) => setContactDraft(prev => ({ ...prev, facebookUrl: e.target.value }))}
                      style={{ width: '100%', padding: 12, borderRadius: 10, border: `1px solid ${mist}`, background: '#fff' }}
                    />
                  </div>
                </div>
              </div>

              {contactError && (
                <div style={{ color: '#b0413e', fontWeight: 700, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 12px' }}>
                  {contactError}
                </div>
              )}

              <div className="dashboard-dialog-actions" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
                <button
                  onClick={() => setContactEditorOpen(false)}
                  style={{ background: '#e2e8f0', color: '#1f2937', borderRadius: 10, padding: '10px 14px', fontWeight: 700 }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const next = {
                      ...contactDraft,
                      title: String(contactDraft.title || '').trim() || 'Contact & Facebook',
                      email: String(contactDraft.email || '').trim(),
                      facebookUrl: String(contactDraft.facebookUrl || '').trim(),
                      contactNote: String(contactDraft.contactNote || '').trim() || 'Need help? Reach out to the parish office.'
                    };
                    if (!next.email) {
                      setContactError('Email is required.');
                      return;
                    }
                    if (!next.facebookUrl) {
                      setContactError('Facebook URL is required.');
                      return;
                    }
                    saveSidebarContact(next);
                    setSidebarContact(next);
                    setContactEditorOpen(false);
                    setContactError('');
                  }}
                  style={{ background: '#1f2a44', color: '#fff', borderRadius: 10, padding: '10px 14px', fontWeight: 700 }}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------- MAIN CONTENT ---------- */}
      <section className="dashboard-right-column" style={{ background: 'rgba(255,255,255,0.88)', borderRadius: 18, border: `1px solid rgba(214,173,96,0.38)`, boxShadow: '0 16px 32px rgba(0,0,0,0.08)', padding: 10, display: 'flex', flexDirection: 'column', gap: 16 }}>
        
        {/* Action Required Summary */}
        <TodoSummaryWidget
          pendingRequests={pendingRequestsCount}
          openConcerns={openConcernsCount}
          collectiveServices={collectiveServiceCandidates.length}
          onNavigate={(tab) => setActiveTab(tab)}
        />

        {/* Collective Services Notification */}
        {collectiveServiceCandidates.length > 0 && (
          <div style={{
            padding: 16,
            background: 'linear-gradient(135deg, #fef3c7, #fcd34d, #fbbf24)',
            borderLeft: '4px solid #f59e0b',
            borderRadius: 12,
            border: '1px solid #f59e0b',
            color: '#78350f',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 20 }}>💡</div>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Collective Service Opportunity</div>
                <div style={{ fontSize: 13 }}>
                  {collectiveServiceCandidates.length} group{collectiveServiceCandidates.length > 1 ? 's' : ''} of booking requests can be converted to collective services. View them in the <strong>Analytics</strong> tab.
                </div>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('analytics')}
              style={{
                padding: '8px 16px',
                background: '#f59e0b',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 13,
                whiteSpace: 'nowrap'
              }}
            >
              View Analytics
            </button>
          </div>
        )}

        {!calendarMinimized && activeTab === 'calendar' && (
          <div>
            <div style={{ marginBottom: 10, padding: '12px 14px', background: 'linear-gradient(90deg, rgba(255,255,255,0.96), rgba(248,244,236,0.96))', borderRadius: 16, color: ink, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between', border: `1px solid rgba(214,173,96,0.35)`, boxShadow: '0 8px 18px rgba(0,0,0,0.06)' }}>
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
            <div style={{ background: 'rgba(255,255,255,0.96)', borderRadius: 18, border: `1px solid rgba(214,173,96,0.35)`, boxShadow: '0 14px 30px rgba(0,0,0,0.06)', padding: 12 }}>
              <CalendarViewNew
                bookings={bookings}
                calendarBookings={bookings}
                events={events}
                calendarConfig={calendarConfig}
                user={user}
                isAdmin
              />
            </div>
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

            {/* Collective Services Analytics */}
            {collectiveServiceCandidates.length > 0 && (
              <div style={{
                padding: '24px',
                background: 'linear-gradient(135deg, #fef3c7, #fcd34d, #fbbf24)',
                borderRadius: 12,
                border: '2px solid #f59e0b',
                marginTop: 16
              }}>
                <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 16, color: '#92400e', display: 'flex', alignItems: 'center', gap: 8 }}>
                  💡 <span>Collective Service Opportunities</span>
                </div>
                <div style={{ marginBottom: 12, color: '#78350f', fontSize: 14 }}>
                  {collectiveServiceCandidates.length} group(s) of booking requests can be converted to collective services.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                  {collectiveServiceCandidates.map((candidate, idx) => (
                    <div key={idx} style={{
                      background: '#fff',
                      padding: '16px',
                      borderRadius: 10,
                      border: '2px solid #f59e0b',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 4px 12px rgba(245, 158, 11, 0.15)'
                    }}>
                      <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>
                        {candidate.service}
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#ef4444', marginBottom: 4 }}>
                        {candidate.count}
                      </div>
                      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>
                        📅 {candidate.date}
                      </div>
                      <button
                        onClick={() => setShowCollectiveServiceModal(candidate)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          background: '#f59e0b',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: 12
                        }}
                      >
                        View Requests
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
              <th style={th}>Place / Chapel</th>
              <th style={th}>Chairs</th>
              <th style={th}>Tables</th>
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
                    <td style={td}>{r.chapel || r.details?.chapel || '-'}</td>
                    <td style={td}>{r.details?.needsChairsTables ? (r.details?.chairsCount || '0') : '-'}</td>
                    <td style={td}>{r.details?.needsChairsTables ? (r.details?.tablesCount || '0') : '-'}</td>
                    <td style={{ ...td, textTransform: 'capitalize' }}>{r.action || '-'}</td>
                    <td style={td}>{formatBookingDetails(r.details)}</td>
                    <td style={td}>{r.actionAt || '-'}</td>
                  </tr>
                ))}
                {records.length === 0 && (
                  <tr>
                    <td style={td} colSpan={11}>No booking records match your search.</td>
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
              <div style={{ background: '#fff', border: `1px solid ${mist}`, borderRadius: 8, padding: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
                <div style={{ color: '#6b7280', fontSize: 12 }}>Bookings Needing Setup</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: ink }}>{reportData.setupBookings}</div>
              </div>
              <div style={{ background: '#fff', border: `1px solid ${mist}`, borderRadius: 8, padding: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
                <div style={{ color: '#6b7280', fontSize: 12 }}>Total Chairs Requested</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: ink }}>{reportData.totalChairsRequested}</div>
              </div>
              <div style={{ background: '#fff', border: `1px solid ${mist}`, borderRadius: 8, padding: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
                <div style={{ color: '#6b7280', fontSize: 12 }}>Total Tables Requested</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: ink }}>{reportData.totalTablesRequested}</div>
              </div>
            </div>

              <div className="dashboard-report-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 12 }}>
                <div className="dashboard-report-card" style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 10, alignItems: 'center' }}>
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

                <div className="dashboard-report-card" style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 10, alignItems: 'center' }}>
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

                <div className="dashboard-report-card" style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 10, alignItems: 'center' }}>
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
              className="dashboard-action-btn dashboard-action-btn--primary"
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

        {/* MASS SERVICES */}
        {activeTab === 'mass_services' && (
          <div>
            <AdminMassServicesPanel />
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
                <div className="church-card" style={{
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
                <div className="church-card" style={{
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
                <div className="church-card" style={{
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
                <div className="church-card" style={{
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

        {/* ACTIVITY LOG TAB */}
        {activeTab === 'activity' && (
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 20
            }}>
              <h2 style={{ color: ink, borderBottom: `3px solid ${gold}`, paddingBottom: 8, margin: 0, fontWeight: 800, fontSize: 22 }}>📋 Activity Log</h2>
              <HelpIcon 
                title="Activity Log Help"
                description="Track all administrative actions in the parish management system"
                steps={[
                  'View all actions performed by staff members',
                  'Filter by action type (approve, reject, create, edit, delete)',
                  'See timestamps and user details for each action',
                  'Use for audit trail and accountability'
                ]}
              />
            </div>
            <div style={{
              display: 'grid',
              gap: 16
            }}>
              <ActivityFilters filters={['info', 'approve', 'reject', 'create', 'edit', 'delete']} selected={null} onSelect={() => {}} />
              <ActivityLog activities={activityLog} isLoading={false} />
              <div style={{
                padding: '16px',
                background: `linear-gradient(135deg, ${stone}40, ${mist}40)`,
                borderRadius: 12,
                border: `2px solid ${gold}`,
                color: ink,
                textAlign: 'center'
              }}>
                <div style={{ fontSize: 14, color: '#6b7280' }}>
                  💡 Activity logs help maintain accountability and provide an audit trail for all system actions.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 20
            }}>
              <h2 style={{ color: ink, borderBottom: `3px solid ${gold}`, paddingBottom: 8, margin: 0, fontWeight: 800, fontSize: 22 }}>⚙️ System Settings</h2>
              <HelpIcon 
                title="Settings Help"
                description="Configure parish management system preferences and defaults"
                steps={[
                  'View current system configuration',
                  'Manage booking constraints',
                  'Configure staff permissions',
                  'Set service defaults and templates'
                ]}
              />
            </div>
            <div style={{
              display: 'grid',
              gap: 16
            }}>
              <div style={{
                padding: '16px',
                background: '#fff',
                borderRadius: 12,
                border: `1px solid ${mist}`,
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
              }}>
                <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 16, color: ink }}>📋 Current System Status</div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: 12,
                  marginBottom: 16
                }}>
                  <InfoCard 
                    icon="👥"
                    title="Staff Members"
                    description={`${users.length} users registered`}
                  />
                  <InfoCard 
                    icon="📅"
                    title="Total Bookings"
                    description={`${bookings.length} bookings scheduled`}
                  />
                  <InfoCard 
                    icon="📢"
                    title="Open Concerns"
                    description={`${concerns.filter(c => c.status?.toLowerCase() === 'open').length} issues`}
                  />
                  <InfoCard 
                    icon="🎫"
                    title="Mass Services"
                    description="Collective service feature enabled"
                  />
                </div>
              </div>

              <div style={{
                padding: '16px',
                background: '#fff',
                borderRadius: 12,
                border: `1px solid ${mist}`,
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
              }}>
                <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 16, color: ink }}>🔐 Permissions & Roles</div>
                <PermissionDisplay role={user?.role || 'member'} />
                <div style={{
                  marginTop: 16,
                  padding: '12px',
                  background: '#f0fdf4',
                  borderRadius: 8,
                  borderLeft: '4px solid #22c55e',
                  color: '#15803d',
                  fontSize: 13
                }}>
                  <strong>Current Role:</strong> {user?.role?.toUpperCase() || 'MEMBER'}
                </div>
              </div>

              <div style={{
                padding: '16px',
                background: '#fff',
                borderRadius: 12,
                border: `1px solid ${mist}`,
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
              }}>
                <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 16, color: ink }}>📱 Feature Status</div>
                <div style={{
                  display: 'grid',
                  gap: 10
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    background: '#f8fafc',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0'
                  }}>
                    <span style={{ color: ink }}>Booking Conflict Detection</span>
                    <span style={{ color: '#22c55e', fontWeight: 700 }}>✓ Enabled</span>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    background: '#f8fafc',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0'
                  }}>
                    <span style={{ color: ink }}>Mass Services (Collective)</span>
                    <span style={{ color: '#22c55e', fontWeight: 700 }}>✓ Enabled</span>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    background: '#f8fafc',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0'
                  }}>
                    <span style={{ color: ink }}>Real-time Notifications</span>
                    <span style={{ color: '#22c55e', fontWeight: 700 }}>✓ Enabled</span>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    background: '#f8fafc',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0'
                  }}>
                    <span style={{ color: ink }}>Activity Logging</span>
                    <span style={{ color: '#22c55e', fontWeight: 700 }}>✓ Enabled</span>
                  </div>
                </div>
              </div>

              <div style={{
                padding: '16px',
                background: `linear-gradient(135deg, ${stone}40, ${mist}40)`,
                borderRadius: 12,
                border: `2px dashed ${gold}`,
                color: ink,
                textAlign: 'center'
              }}>
                <div style={{ fontSize: 14, marginBottom: 8 }}>📝 Session Information</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>
                  Logged in as: <strong>{user?.email || 'Unknown'}</strong><br />
                  Role: <strong>{user?.role?.toUpperCase() || 'MEMBER'}</strong><br />
                  Session: Active
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Collective Service Modal */}
      {showCollectiveServiceModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 12,
            padding: 28,
            maxWidth: 700,
            width: '90%',
            maxHeight: '85vh',
            overflowY: 'auto',
            boxShadow: '0 25px 60px rgba(0,0,0,0.35)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, color: '#1f2937', fontSize: 20 }}>
                📋 Collective Service Group
              </h2>
              <button
                onClick={() => setShowCollectiveServiceModal(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 28,
                  cursor: 'pointer',
                  color: '#9ca3af'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{
              padding: 16,
              background: '#fef3c7',
              borderLeft: '4px solid #f59e0b',
              borderRadius: 8,
              marginBottom: 20,
              color: '#78350f'
            }}>
              <strong>💡 Suggestion:</strong> Convert these {showCollectiveServiceModal.count} requests into a single collective service booking where multiple parishioners register together.
            </div>

            <div style={{
              padding: 16,
              background: '#f0fdf4',
              borderRadius: 8,
              marginBottom: 20,
              border: '1px solid #bbf7d0'
            }}>
              <div style={{ marginBottom: 12, fontSize: 14, color: '#15803d' }}>
                <strong>Service Details:</strong>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Service Type</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#1f2937' }}>
                    {showCollectiveServiceModal.service}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Proposed Date</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#1f2937' }}>
                    {showCollectiveServiceModal.date}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Total Requests</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#ef4444' }}>
                    {showCollectiveServiceModal.count}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <h3 style={{ color: '#374151', marginBottom: 12, fontSize: 16 }}>📝 Booking Requests</h3>
              <div style={{ display: 'grid', gap: 10 }}>
                {showCollectiveServiceModal.requests.map((req, idx) => (
                  <div key={req.id} style={{
                    padding: 12,
                    background: '#f9fafb',
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                    borderLeft: '4px solid #3b82f6'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontWeight: 600, color: '#1f2937' }}>
                          {idx + 1}. {req.name}
                        </div>
                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                          ID: {req.id}
                        </div>
                      </div>
                      <div style={{
                        fontSize: 12,
                        fontWeight: 600,
                        padding: '4px 8px',
                        background: '#dbeafe',
                        color: '#0284c7',
                        borderRadius: 4
                      }}>
                        {req.slot}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: '#4b5563' }}>
                      📧 {req.email}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{
              borderTop: '1px solid #e5e7eb',
              paddingTop: 16,
              display: 'flex',
              gap: 12,
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowCollectiveServiceModal(null)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#e5e7eb',
                  color: '#1f2937',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 14
                }}
              >
                Close
              </button>
              <button
                onClick={() => {
                  setActiveTab('mass_services');
                  setShowCollectiveServiceModal(null);
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#f59e0b',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 14
                }}
              >
                Create Collective Service
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  </div>
</div>
  );
}
