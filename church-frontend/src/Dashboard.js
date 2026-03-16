import React, { useEffect, useState, useContext, useCallback } from 'react';
import api from './api';
import CalendarViewNew from './CalendarViewNew';
import { SocketContext } from './App';

const palette = {
  stone: '#f8f4ec',
  ink: '#1f2a44',
  gold: '#d6ad60',
  mist: '#e7dfcf',
  accent: '#3b5b8a',
  wine: '#b0413e'
};

const th = {
  padding: 10,
  border: `1px solid ${palette.mist}`,
  textAlign: 'left',
  background: palette.mist,
  color: palette.ink,
};

const td = {
  padding: 10,
  border: `1px solid ${palette.mist}`,
  color: palette.ink,
  background: '#fff',
};

export default function Dashboard({ user, onLogout }) {
  const socket = useContext(SocketContext);

  const [bookings, setBookings] = useState([]);
  const [bookingRequests, setBookingRequests] = useState([]);
  const [events, setEvents] = useState([]);
  const [calendarBookings, setCalendarBookings] = useState([]);
  const [calendarConfig, setCalendarConfig] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('events'); // events | bookings | requests
  const [tabsExpanded, setTabsExpanded] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [b, br, e, c, s] = await Promise.all([
        api.bookings.list(),
        api.bookingRequests.my(),
        api.events.list(),
        api.calendar.get(),
        api.bookings.slots()
      ]);

      setBookings(b.data || []);
      setBookingRequests(br.data || []);
      setEvents(e.data || []);
      setCalendarConfig(c.data || {});
      setCalendarBookings(s.data || []);
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
    socket.on('event_added', refresh);
    socket.on('event_deleted', refresh);
    socket.on('calendar_config_updated', refresh);

    return () => {
      socket.off('new_booking', refresh);
      socket.off('booking_updated', refresh);
      socket.off('booking_deleted', refresh);
      socket.off('booking_request_created', refresh);
      socket.off('booking_request_updated', refresh);
      socket.off('event_added', refresh);
      socket.off('event_deleted', refresh);
      socket.off('calendar_config_updated', refresh);
    };
  }, [socket, loadData]);

  useEffect(() => {
    if (activeTab !== 'events' && activeTab !== 'bookings' && activeTab !== 'requests') return;
    const intervalId = setInterval(() => {
      loadData();
    }, 5000);
    return () => clearInterval(intervalId);
  }, [activeTab, loadData]);

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div
      className="dashboard-page"
      style={{
        background:
          "linear-gradient(rgba(248, 244, 236, 0.9), rgba(248, 244, 236, 0.9)), url('/login-bg.jpg') center/cover no-repeat fixed"
      }}
    >
      <div className="dashboard-brand">
        <div className="dashboard-brand-title" style={{ color: palette.ink }}>Parish Portal</div>
        <div className="dashboard-brand-subtitle" style={{ color: palette.ink }}>
          Stay close to parish life and sacraments
        </div>
      </div>
    <div className="dashboard-layout dashboard-two-col">
      <div className="dashboard-left-column">
      <aside className={`dashboard-sidebar dashboard-left-panel ${tabsExpanded ? 'expanded' : 'collapsed'}`}>
        <div className="dashboard-sidebar-header">
          <h3 style={{ margin: 0, color: palette.ink }}>My Parish Desk</h3>
          <button
            className="dashboard-collapse-btn"
            onClick={() => setTabsExpanded(v => !v)}
            title={tabsExpanded ? 'Collapse tabs down' : 'Expand tabs down'}
          >
            {tabsExpanded ? '\u25B2' : '\u25BC'}
          </button>
        </div>

        <div className="dashboard-tab-list dashboard-tab-list-vertical">
          <button className={`dashboard-tab-btn ${activeTab === 'events' ? 'active' : ''}`} onClick={() => setActiveTab('events')}>
            <span className="dashboard-tab-short">🕯</span>
            <span className="dashboard-tab-label">Events</span>
          </button>
          <button className={`dashboard-tab-btn ${activeTab === 'bookings' ? 'active' : ''}`} onClick={() => setActiveTab('bookings')}>
            <span className="dashboard-tab-short">✚</span>
            <span className="dashboard-tab-label">My Bookings</span>
          </button>
          <button className={`dashboard-tab-btn ${activeTab === 'requests' ? 'active' : ''}`} onClick={() => setActiveTab('requests')}>
            <span className="dashboard-tab-short">📜</span>
            <span className="dashboard-tab-label">My Requests</span>
          </button>
          <button className="dashboard-tab-btn logout" onClick={onLogout}>
            <span className="dashboard-tab-short">{'\u{1F6AA}'}</span>
            <span className="dashboard-tab-label">Logout</span>
          </button>
        </div>

      </aside>

      <div className="dashboard-main dashboard-left-content">
          <div style={{
            background: '#fff',
            borderRadius: 14,
            padding: 16,
            border: `1px solid ${palette.mist}`,
            boxShadow: '0 8px 18px rgba(0,0,0,0.08)',
            marginBottom: 14,
            color: palette.ink
          }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
              Welcome, {user?.name || 'Parishioner'}
            </div>
            <div style={{ fontSize: 13, color: '#6b7280' }}>
              Keep track of upcoming liturgies and your sacrament requests in one place.
            </div>
          </div>
          {activeTab === 'events' && (
            <div>
              <h2>Events</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={th}>ID</th>
                    <th style={th}>Title</th>
                    <th style={th}>Date</th>
                    <th style={th}>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map(e => (
                    <tr key={e.id}>
                      <td style={td}>{e.id}</td>
                      <td style={td}>{e.title}</td>
                      <td style={td}>{e.date}</td>
                      <td style={td}>{e.time || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'bookings' && (
            <div>
              <h2>My Bookings</h2>
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
                            background: palette.wine,
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
              <h2>My Requests</h2>
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
      </div>
      </div>

      <section className="dashboard-right-column">
        <CalendarViewNew
          bookings={bookings}
          calendarBookings={calendarBookings}
          events={events}
          calendarConfig={calendarConfig}
          user={user}
        />
      </section>
    </div>
    </div>
  );
}
