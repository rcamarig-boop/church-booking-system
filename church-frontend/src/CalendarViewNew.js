import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import api from './api';
import BookingModal from './BookingModal';
import { SocketContext } from './App';
import { getTomorrowIsoDate, getSixMonthsAheadIsoDate } from './inputValidation';

const STATUS_COLORS = {
  green:  { bg: 'rgba(72,196,17,0.15)', border: '#11c411' },
  yellow: { bg: 'rgba(255,255,0,0.15)', border: '#eeff00' },
  orange: { bg: 'rgba(255,165,0,0.15)', border: '#ff8c00' },
  red:    { bg: 'rgba(236,30,30,0.2)', border: '#dc1414' },
  gray:   { bg: 'rgba(160,174,192,0.35)', border: '#718096' },
};

const DEFAULT_MAX_SLOTS = 5;

export default function CalendarViewNew({
  bookings = [],
  calendarBookings = null,
  events = [],
  calendarConfig = {},
  user,
  isAdmin = false,
  addNotification,
  compact = false
}) {
  const socket = useContext(SocketContext);
  const [isNarrowScreen, setIsNarrowScreen] = useState(false);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [modalDate, setModalDate] = useState(null);
  const [modalEvents, setModalEvents] = useState([]);
  const [modalMode, setModalMode] = useState('list');
  const [dateMap, setDateMap] = useState({});
  const [allSlots, setAllSlots] = useState([]);

  useEffect(() => {
    const update = () => setIsNarrowScreen(window.innerWidth <= 640);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  /* ---------------------------
     SYNC CONFIG ONLY (max slots)
  --------------------------- */
  useEffect(() => {
    setDateMap(calendarConfig || {});
  }, [calendarConfig]);

  useEffect(() => {
    if (calendarBookings) {
      setAllSlots(calendarBookings);
    }
  }, [calendarBookings]);

  /* ---------------------------
     SOCKET REFRESH
  --------------------------- */
  const refreshCalendar = useCallback(async () => {
    try {
      const res = await api.calendar.get();
      setDateMap(res.data || {});
    } catch (err) {
      console.error('Calendar refresh failed', err);
    }
  }, []);

  const refreshSlots = useCallback(async () => {
    try {
      const res = await api.bookings.slots();
      setAllSlots(res.data || []);
    } catch (err) {
      // ignore slot refresh errors
    }
  }, []);

  useEffect(() => {
    if (!socket) return;
    // Re-sync data from DB whenever socket (re)connects
    const refreshAll = () => { refreshCalendar(); refreshSlots(); };
    socket.on('connect', refreshAll);
    socket.on('new_booking', refreshCalendar);
    socket.on('booking_updated', refreshCalendar);
    socket.on('booking_deleted', refreshCalendar);
    socket.on('calendar_config_updated', refreshCalendar);
    socket.on('new_booking', refreshSlots);
    socket.on('booking_updated', refreshSlots);
    socket.on('booking_deleted', refreshSlots);
    return () => {
      socket.off('connect', refreshAll);
      socket.off('new_booking', refreshCalendar);
      socket.off('booking_updated', refreshCalendar);
      socket.off('booking_deleted', refreshCalendar);
      socket.off('calendar_config_updated', refreshCalendar);
      socket.off('new_booking', refreshSlots);
      socket.off('booking_updated', refreshSlots);
      socket.off('booking_deleted', refreshSlots);
    };
  }, [socket, refreshCalendar, refreshSlots]);

  useEffect(() => {
    if (!calendarBookings) {
      refreshSlots();
    }
  }, [calendarBookings, refreshSlots]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      refreshCalendar();
      refreshSlots();
    }, 10000);

    return () => clearInterval(intervalId);
  }, [refreshCalendar, refreshSlots]);

  /* ---------------------------
     DATE HELPERS
  --------------------------- */
  const formatDate = (y, m, d) =>
    `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const calendarDays = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const bookingSource = allSlots || calendarBookings || bookings;
  const compactLayout = compact || isNarrowScreen;
  const compactDayMinHeight = compactLayout ? 'clamp(40px, 6vw, 64px)' : 'clamp(60px, 9vw, 95px)';
  const compactGridGap = compactLayout ? 3 : 4;
  const compactShellPadding = compactLayout ? 8 : 10;
  const compactHeaderMargin = compactLayout ? 10 : 16;
  const tomorrowIso = getTomorrowIsoDate();
  const sixMonthsAheadIso = getSixMonthsAheadIsoDate();
  const maxSelectableDate = `${sixMonthsAheadIso}T23:59:59`;

  // Parse the valid date range for calendar navigation
  const tomorrowDate = new Date(tomorrowIso + 'T00:00:00');
  const sixMonthsAheadDate = new Date(sixMonthsAheadIso + 'T00:00:00');
  
  // Calculate earliest and latest valid months
  const earliestValidMonth = new Date(tomorrowDate.getFullYear(), tomorrowDate.getMonth(), 1);
  const latestValidMonth = new Date(sixMonthsAheadDate.getFullYear(), sixMonthsAheadDate.getMonth(), 1);
  
  // Current viewing month's first day
  const currentViewMonth = new Date(year, month, 1);
  
  // Disable buttons based on valid range
  const isLeftArrowDisabled = currentViewMonth <= earliestValidMonth;
  const isRightArrowDisabled = currentViewMonth >= latestValidMonth;

  const clampMonthNavigation = (nextDate) => {
    const monthStart = new Date(nextDate.getFullYear(), nextDate.getMonth(), 1);
    if (monthStart > latestValidMonth) return;
    setCurrentDate(monthStart);
  };

  const bookingsByDate = useMemo(() => {
    const map = {};
    bookingSource.forEach(b => {
      if (!b?.date) return;
      map[b.date] = (map[b.date] || 0) + 1;
    });
    return map;
  }, [bookingSource]);

  /* ---------------------------
     STATUS LOGIC
     bookings are computed LIVE
  --------------------------- */
  const getLoadStatus = (date) => {
    const max = dateMap[date]?.max_slots ?? DEFAULT_MAX_SLOTS;
    const booked = bookingsByDate[date] || 0;
    if (booked >= max) return 'red';
    if (booked <= 0) return 'green';
    if (booked > max / 2) return 'orange';
    return 'yellow';
  };

  /* ---------------------------
     MODAL
  --------------------------- */
  const openModal = (date) => {
    const eventItems = events
      .filter(e => e.date === date)
      .map(e => ({ ...e, _type: 'event' }));

    // Use the same booking source for the modal as we use for the calendar counts
    const allBookingsForDate = bookingSource
      .filter(b => b.date === date)
      .map(b => {
        // Determine if this booking belongs to the current user
        // Check various possible user ID field names
        const isOwner = user && (
          b.userId === user.id || 
          b.user_id === user.id || 
          b.userId === user._id || 
          b.user_id === user._id
        );
        
        return {
          ...b,
          _type: 'booking',
          _isOwner: isOwner
        };
      });

    const modalItems = isAdmin
      ? [
          ...eventItems,
          ...allBookingsForDate
        ]
      : [...eventItems, ...allBookingsForDate];

    setModalDate(date);
    setModalEvents(modalItems);
    setModalMode('list');
  };

  const handleBooked = async () => {
    await refreshCalendar();
    addNotification?.({
      type: 'success',
      text: `Booking request submitted for ${modalDate}`,
    });
    setModalMode('list');
  };

  const handleCancelled = async () => {
    await refreshCalendar();
    addNotification?.({
      type: 'info',
      text: `Booking cancelled on ${modalDate}`,
    });
    setModalMode('list');
  };

  /* ---------------------------
     RENDER
  --------------------------- */
  return (
    <div style={{
      background: 'rgba(255,255,255,0.6)',
      padding: compactShellPadding,
      borderRadius: 14,
      width: '100%',
      maxWidth: '100%',
      marginLeft: 'auto',
      transition: 'max-width 0.25s ease, width 0.25s ease',
      overflow: 'hidden'
      }}>
      {!compact && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: compactHeaderMargin, gap: 8, alignItems: 'center' }}>
          <button
            style={{ 
              padding: '6px 10px', 
              opacity: isLeftArrowDisabled ? 0.5 : 1, 
              cursor: isLeftArrowDisabled ? 'not-allowed' : 'pointer' 
            }}
            onClick={() => !isLeftArrowDisabled && setCurrentDate(new Date(year, month - 1))}
            disabled={isLeftArrowDisabled}
          >
            {'\u25C0'}
          </button>
          <strong style={{ fontSize: 16 }}>{currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</strong>
          <button
            style={{ 
              padding: '6px 10px',
              opacity: isRightArrowDisabled ? 0.5 : 1,
              cursor: isRightArrowDisabled ? 'not-allowed' : 'pointer'
            }}
            onClick={() => !isRightArrowDisabled && clampMonthNavigation(new Date(year, month + 1))}
            disabled={isRightArrowDisabled}
          >
            {'\u25B6'}
          </button>
        </div>
      )}

      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
        alignItems: 'center',
        marginBottom: 10,
        fontSize: 12,
        color: '#4a5568'
      }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 8px',
          borderRadius: 999,
          background: STATUS_COLORS.green.bg,
          border: `1px solid ${STATUS_COLORS.green.border}`
        }}>
          <span style={{ width: 10, height: 10, borderRadius: 999, background: STATUS_COLORS.green.border }} />
          Open
        </span>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 8px',
          borderRadius: 999,
          background: STATUS_COLORS.yellow.bg,
          border: `1px solid ${STATUS_COLORS.yellow.border}`
        }}>
          <span style={{ width: 10, height: 10, borderRadius: 999, background: STATUS_COLORS.yellow.border }} />
          Filling
        </span>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 8px',
          borderRadius: 999,
          background: STATUS_COLORS.orange.bg,
          border: `1px solid ${STATUS_COLORS.orange.border}`
        }}>
          <span style={{ width: 10, height: 10, borderRadius: 999, background: STATUS_COLORS.orange.border }} />
          Near full
        </span>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 8px',
          borderRadius: 999,
          background: STATUS_COLORS.red.bg,
          border: `1px solid ${STATUS_COLORS.red.border}`
        }}>
          <span style={{ width: 10, height: 10, borderRadius: 999, background: STATUS_COLORS.red.border }} />
          Full
        </span>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 8px',
          borderRadius: 999,
          background: STATUS_COLORS.gray.bg,
          border: `1px solid ${STATUS_COLORS.gray.border}`
        }}>
          <span style={{ width: 10, height: 10, borderRadius: 999, background: STATUS_COLORS.gray.border }} />
          Out of range
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: compactLayout ? 'repeat(7, minmax(0, 1fr))' : 'repeat(7, minmax(72px, 1fr))',
          gap: compactGridGap,
          width: '100%'
        }}
      >
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
          <div key={d} style={{ fontWeight: 700, textAlign: 'center', fontSize: compactLayout ? 10 : 13 }}>{d}</div>
        ))}

        {calendarDays.map((day, i) => {
          if (!day) return <div key={i} />;
          const dateStr = formatDate(year, month, day);
          const status = getLoadStatus(dateStr);
          const isFuture = dateStr >= tomorrowIso && dateStr <= sixMonthsAheadIso;
          const max = dateMap[dateStr]?.max_slots ?? DEFAULT_MAX_SLOTS;
          const booked = bookingsByDate[dateStr] || 0;
          const isClosed = max <= 0;
          const isSelectable = isFuture && !isClosed;
          const palette = isSelectable ? STATUS_COLORS[status] : STATUS_COLORS.gray;
          const unavailableLabel = dateStr < tomorrowIso
            ? 'Too soon'
            : dateStr > sixMonthsAheadIso
              ? '6-mo limit'
              : isClosed
                ? 'Closed'
                : 'Unavailable';

          return (
            <div
              key={dateStr}
              onClick={() => isSelectable && !compact && openModal(dateStr)}
              style={{
                padding: compactLayout ? 3 : 6,
                minHeight: compactDayMinHeight,
                cursor: isSelectable ? 'pointer' : 'not-allowed',
                background: palette.bg,
                border: `2px solid ${palette.border}`,
                borderRadius: 8,
                opacity: isSelectable ? 1 : 0.4,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: compactLayout ? 12 : 15 }}>{day}</div>
              {!compactLayout && (
                <div style={{ fontSize: 12, marginTop: 6 }}>
                  {isSelectable ? `${booked}/${max} booked` : unavailableLabel}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {modalDate && (
        <BookingModal
          date={modalDate}
          events={modalEvents}
          mode={modalMode}
          onClose={() => setModalDate(null)}
          onBooked={handleBooked}
          onCancelled={handleCancelled}
          canCancel={!isAdmin}
        />
      )}
    </div>
  );
}

