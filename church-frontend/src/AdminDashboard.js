import React, { useEffect, useState, useContext } from 'react';
import api from './api';
import CalendarViewNew from './CalendarViewNew';
import { SocketContext } from './App';
import AdminRequestPanel from './AdminRequestPanel';

/* ---------- shared styles ---------- */
const th = {
  padding: 8,
  border: '1px solid #ccc',
  textAlign: 'left',
};

const td = {
  padding: 8,
  border: '1px solid #ccc',
};

const dangerBtn = {
  padding: '6px 10px',
  background: '#f56565',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
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
      'Details JSON',
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

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f0f4f8', fontFamily: 'sans-serif' }}>
      {/* ---------- SIDEBAR ---------- */}
      <div style={{
        width: 220,
        background: '#ffffff',
        borderRight: '1px solid #ddd',
        padding: 16,
      }}>
        <h3 style={{ textAlign: 'center', marginBottom: 24 }}>Admin Panel</h3>

        <button style={tabBtn(activeTab === 'calendar')} onClick={() => setActiveTab('calendar')}>
          Calendar
        </button>

        <button style={tabBtn(activeTab === 'users')} onClick={() => setActiveTab('users')}>
          Users
        </button>

        <button style={tabBtn(activeTab === 'events')} onClick={() => setActiveTab('events')}>
          Events & Bookings
        </button>

        <button style={tabBtn(activeTab === 'requests')} onClick={() => setActiveTab('requests')}>
          Request Panel
        </button>

        <button style={tabBtn(activeTab === 'records')} onClick={() => setActiveTab('records')}>
          Records
        </button>

        <button style={tabBtn(activeTab === 'add_event')} onClick={() => setActiveTab('add_event')}>
          Add Event
        </button>

        <button
          onClick={onLogout}
          style={{ ...tabBtn(false), background: '#f56565', color: '#fff', marginTop: 24 }}
        >
          Logout
        </button>
      </div>

      {/* ---------- MAIN CONTENT ---------- */}
      <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
        {/* CALENDAR */}
        {activeTab === 'calendar' && (
          <div>
            <div
              style={{
                marginBottom: 16,
                background: '#fff',
                padding: 12,
                borderRadius: 8,
                border: '1px solid #ddd',
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
                style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
              />
              <input
                type="number"
                min="0"
                value={bookingMaxSlots}
                onChange={e => setBookingMaxSlots(e.target.value)}
                placeholder="Max bookings"
                style={{ width: 140, padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
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
                  background: '#2b6cb0',
                  color: '#fff',
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
                  background: '#e53e3e',
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
                  background: '#38a169',
                  color: '#fff',
                  cursor: 'pointer'
                }}
              >
                Open Date
              </button>
              {bookingControlMsg && (
                <span style={{ fontSize: 13, color: '#2d3748' }}>{bookingControlMsg}</span>
              )}
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

        {/* USERS */}
        {activeTab === 'users' && (
          <div>
            <h2>Users</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#eee' }}>
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
              </tbody>
            </table>
          </div>
        )}

        {/* EVENTS + BOOKINGS (SAME TAB) */}
        {activeTab === 'events' && (
          <div>
            {/* EVENTS */}
            <h2>Events</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 40 }}>
              <thead>
                <tr style={{ background: '#eee' }}>
                  <th style={th}>ID</th>
                  <th style={th}>Title</th>
                  <th style={th}>Date</th>
                  <th style={th}>Time</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map(e => (
                  <tr key={e.id}>
                    <td style={td}>{e.id}</td>
                    <td style={td}>{e.title}</td>
                    <td style={td}>{e.date}</td>
                    <td style={td}>{e.time || '-'}</td>
                    <td style={td}>
                      <button
                        style={{ ...dangerBtn, background: '#3182ce', marginRight: 8 }}
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
                ))}
              </tbody>
            </table>

            {/* BOOKINGS */}
            <h2>Bookings</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#eee' }}>
                  <th style={th}>ID</th>
                  <th style={th}>User</th>
                  <th style={th}>Service</th>
                  <th style={th}>Date</th>
                  <th style={th}>Time</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map(b => (
                  <tr key={b.id}>
                    <td style={td}>{b.id}</td>
                    <td style={td}>{b.name || b.email}</td>
                    <td style={td}>{b.service}</td>
                    <td style={td}>{b.date}</td>
                    <td style={td}>{b.slot}</td>
                    <td style={td}>
                      <button
                        style={{ ...dangerBtn, background: '#3182ce', marginRight: 8 }}
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
                ))}
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
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#eee' }}>
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
                    <td style={td} colSpan={8}>No booking records yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
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
                style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ccc' }}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 6 }}>Date</label>
              <input
                type="date"
                value={eventDate}
                onChange={e => setEventDate(e.target.value)}
                style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ccc' }}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 6 }}>Time (optional)</label>
              <input
                type="time"
                value={eventTime}
                onChange={e => setEventTime(e.target.value)}
                step="60"
                style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ccc' }}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 6 }}>Description (optional)</label>
              <textarea
                value={eventDescription}
                onChange={e => setEventDescription(e.target.value)}
                placeholder="Notes about the event"
                rows={4}
                style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ccc' }}
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
                background: '#667eea',
                color: '#fff',
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
    </div>
  );
}

/* ---------- helper ---------- */
function tabBtn(active) {
  return {
    width: '100%',
    padding: 12,
    marginBottom: 12,
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    background: active ? '#667eea' : '#f9f9f9',
    color: active ? '#fff' : '#333',
    fontSize: 15,
  };
}
