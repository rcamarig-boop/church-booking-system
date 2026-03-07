import React, { useEffect, useState, useContext, useMemo } from 'react';
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
  const [tabsExpanded, setTabsExpanded] = useState(false);
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

  const filteredBookings = useMemo(
    () => bookings.filter(b => {
      if (!bookingSearchTerm) return true;
      return [b.id, b.name, b.email, b.service, b.date, b.slot]
        .map(v => String(v || '').toLowerCase())
        .some(v => v.includes(bookingSearchTerm));
    }),
    [bookings, bookingSearchTerm]
  );

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

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div
      className="dashboard-page"
      style={{
        background:
          "linear-gradient(rgba(255, 255, 255, 0.72), rgba(255, 255, 255, 0.72)), url('/login-bg.jpg') center/cover no-repeat fixed"
      }}
    >
      <div className="dashboard-brand">
        <div className="dashboard-brand-title">CABS</div>
        <div className="dashboard-brand-subtitle">Church Appointment & Booking System</div>
      </div>
    <div className="dashboard-layout dashboard-two-col">
      <div className="dashboard-left-column">
      <aside className={`dashboard-sidebar dashboard-left-panel ${tabsExpanded ? 'expanded' : 'collapsed'}`}>
        <div className="dashboard-sidebar-header">
          <h3 style={{ margin: 0 }}>Admin Panel</h3>
          <button
            className="dashboard-collapse-btn"
            onClick={() => setTabsExpanded(v => !v)}
            title={tabsExpanded ? 'Collapse tabs down' : 'Expand tabs down'}
          >
            {tabsExpanded ? '\u25B2' : '\u25BC'}
          </button>
        </div>

        <div className="dashboard-tab-list dashboard-tab-list-vertical">
          <button className={`dashboard-tab-btn ${activeTab === 'calendar' ? 'active' : ''}`} onClick={() => setActiveTab('calendar')}>
            <span className="dashboard-tab-short">{'\u{1F4C5}'}</span>
            <span className="dashboard-tab-label">Calendar</span>
          </button>
          <button className={`dashboard-tab-btn ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
            <span className="dashboard-tab-short">{'\u{1F465}'}</span>
            <span className="dashboard-tab-label">Users</span>
          </button>
          <button className={`dashboard-tab-btn ${activeTab === 'events' ? 'active' : ''}`} onClick={() => setActiveTab('events')}>
            <span className="dashboard-tab-short">{'\u{1F4CC}'}</span>
            <span className="dashboard-tab-label">Events & Bookings</span>
          </button>
          <button className={`dashboard-tab-btn ${activeTab === 'requests' ? 'active' : ''}`} onClick={() => setActiveTab('requests')}>
            <span className="dashboard-tab-short">{'\u{1F4E8}'}</span>
            <span className="dashboard-tab-label">Request Panel</span>
          </button>
          <button className={`dashboard-tab-btn ${activeTab === 'records' ? 'active' : ''}`} onClick={() => setActiveTab('records')}>
            <span className="dashboard-tab-short">{'\u{1F9FE}'}</span>
            <span className="dashboard-tab-label">Records</span>
          </button>
          <button className={`dashboard-tab-btn ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>
            <span className="dashboard-tab-short">{'\u{1F4CA}'}</span>
            <span className="dashboard-tab-label">Reports</span>
          </button>
          <button className={`dashboard-tab-btn ${activeTab === 'add_event' ? 'active' : ''}`} onClick={() => setActiveTab('add_event')}>
            <span className="dashboard-tab-short">{'\u2795'}</span>
            <span className="dashboard-tab-label">Add Event</span>
          </button>
          <button className="dashboard-tab-btn logout" onClick={onLogout}>
            <span className="dashboard-tab-short">{'\u{1F6AA}'}</span>
            <span className="dashboard-tab-label">Logout</span>
          </button>
        </div>
      </aside>

      {/* ---------- MAIN CONTENT ---------- */}
      <div className="dashboard-main dashboard-left-content">
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
              style={{ width: '100%', maxWidth: 420, marginBottom: 12, padding: 10, border: '1px solid #ccc', borderRadius: 6 }}
            />
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

        {/* EVENTS + BOOKINGS (SAME TAB) */}
        {activeTab === 'events' && (
          <div>
            {/* EVENTS */}
            <h2>Events</h2>
            <input
              type="text"
              placeholder="Search events by id, title, date, time"
              value={eventSearch}
              onChange={e => setEventSearch(e.target.value)}
              style={{ width: '100%', maxWidth: 420, marginBottom: 12, padding: 10, border: '1px solid #ccc', borderRadius: 6 }}
            />
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
                {filteredEvents.map(e => (
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
                {filteredEvents.length === 0 && (
                  <tr>
                    <td style={td} colSpan={5}>No events match your search.</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* BOOKINGS */}
            <h2>Bookings</h2>
            <input
              type="text"
              placeholder="Search bookings by id, user, service, date, time"
              value={bookingSearch}
              onChange={e => setBookingSearch(e.target.value)}
              style={{ width: '100%', maxWidth: 460, marginBottom: 12, padding: 10, border: '1px solid #ccc', borderRadius: 6 }}
            />
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
                {filteredBookings.map(b => (
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
                {filteredBookings.length === 0 && (
                  <tr>
                    <td style={td} colSpan={6}>No bookings match your search.</td>
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
              style={{ width: '100%', maxWidth: 500, marginBottom: 12, padding: 10, border: '1px solid #ccc', borderRadius: 6 }}
            />
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
              <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
                <div style={{ color: '#666', fontSize: 12 }}>Total Users</div>
                <div style={{ fontSize: 28, fontWeight: 700 }}>{reportData.totalUsers}</div>
              </div>
              <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
                <div style={{ color: '#666', fontSize: 12 }}>Total Events</div>
                <div style={{ fontSize: 28, fontWeight: 700 }}>{reportData.totalEvents}</div>
              </div>
              <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
                <div style={{ color: '#666', fontSize: 12 }}>Total Bookings</div>
                <div style={{ fontSize: 28, fontWeight: 700 }}>{reportData.totalBookings}</div>
              </div>
              <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
                <div style={{ color: '#666', fontSize: 12 }}>Total Records</div>
                <div style={{ fontSize: 28, fontWeight: 700 }}>{reportData.totalRecords}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 12 }}>
              <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
                <h4 style={{ marginTop: 0 }}>Bookings by Service</h4>
                {Object.entries(reportData.serviceCounts).length === 0 ? (
                  <div style={{ color: '#666' }}>No booking data.</div>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {Object.entries(reportData.serviceCounts)
                      .sort((a, b) => b[1] - a[1])
                      .map(([k, v]) => <li key={k}>{k}: {v}</li>)}
                  </ul>
                )}
              </div>

              <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
                <h4 style={{ marginTop: 0 }}>Records by Action</h4>
                {Object.entries(reportData.actionCounts).length === 0 ? (
                  <div style={{ color: '#666' }}>No record data.</div>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {Object.entries(reportData.actionCounts)
                      .sort((a, b) => b[1] - a[1])
                      .map(([k, v]) => <li key={k}>{k}: {v}</li>)}
                  </ul>
                )}
              </div>

              <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
                <h4 style={{ marginTop: 0 }}>Users by Role</h4>
                {Object.entries(reportData.roleCounts).length === 0 ? (
                  <div style={{ color: '#666' }}>No user data.</div>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {Object.entries(reportData.roleCounts)
                      .sort((a, b) => b[1] - a[1])
                      .map(([k, v]) => <li key={k}>{k}: {v}</li>)}
                  </ul>
                )}
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
      <section className="dashboard-right-column">
        <CalendarViewNew
          bookings={bookings}
          calendarBookings={bookings}
          events={events}
          calendarConfig={calendarConfig}
          user={user}
          isAdmin
        />
      </section>
    </div>
    </div>
  );
}



