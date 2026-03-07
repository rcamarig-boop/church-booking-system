import React, { useEffect, useState, useContext, useCallback } from 'react';
import api from './api';
import CalendarViewNew from './CalendarViewNew';
import { SocketContext } from './App';

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
          <h3 style={{ margin: 0 }}>Dashboard</h3>
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
            <span className="dashboard-tab-short">{'\u{1F4CC}'}</span>
            <span className="dashboard-tab-label">Events</span>
          </button>
          <button className={`dashboard-tab-btn ${activeTab === 'bookings' ? 'active' : ''}`} onClick={() => setActiveTab('bookings')}>
            <span className="dashboard-tab-short">{'\u{1F4D6}'}</span>
            <span className="dashboard-tab-label">My Bookings</span>
          </button>
          <button className={`dashboard-tab-btn ${activeTab === 'requests' ? 'active' : ''}`} onClick={() => setActiveTab('requests')}>
            <span className="dashboard-tab-short">{'\u{1F4E8}'}</span>
            <span className="dashboard-tab-label">My Requests</span>
          </button>
          <button className="dashboard-tab-btn logout" onClick={onLogout}>
            <span className="dashboard-tab-short">{'\u{1F6AA}'}</span>
            <span className="dashboard-tab-label">Logout</span>
          </button>
        </div>

      </aside>

      <div className="dashboard-main dashboard-left-content">
          {activeTab === 'events' && (
            <div>
              <h2>Events</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#eee' }}>
                    <th style={{ padding: 8, border: '1px solid #ccc' }}>ID</th>
                    <th style={{ padding: 8, border: '1px solid #ccc' }}>Title</th>
                    <th style={{ padding: 8, border: '1px solid #ccc' }}>Date</th>
                    <th style={{ padding: 8, border: '1px solid #ccc' }}>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map(e => (
                    <tr key={e.id}>
                      <td style={{ padding: 8, border: '1px solid #ccc' }}>{e.id}</td>
                      <td style={{ padding: 8, border: '1px solid #ccc' }}>{e.title}</td>
                      <td style={{ padding: 8, border: '1px solid #ccc' }}>{e.date}</td>
                      <td style={{ padding: 8, border: '1px solid #ccc' }}>{e.time || '-'}</td>
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
                  <tr style={{ background: '#eee' }}>
                    <th style={{ padding: 8, border: '1px solid #ccc' }}>Service</th>
                    <th style={{ padding: 8, border: '1px solid #ccc' }}>Date</th>
                    <th style={{ padding: 8, border: '1px solid #ccc' }}>Time</th>
                    <th style={{ padding: 8, border: '1px solid #ccc' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map(b => (
                    <tr key={b.id}>
                      <td style={{ padding: 8, border: '1px solid #ccc' }}>{b.service}</td>
                      <td style={{ padding: 8, border: '1px solid #ccc' }}>{b.date}</td>
                      <td style={{ padding: 8, border: '1px solid #ccc' }}>{b.slot}</td>
                      <td style={{ padding: 8, border: '1px solid #ccc' }}>
                        <button
                          style={{
                            padding: '6px 10px',
                            background: '#f56565',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer'
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
                      <td colSpan={4} style={{ padding: 8, border: '1px solid #ccc' }}>
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
                  <tr style={{ background: '#eee' }}>
                    <th style={{ padding: 8, border: '1px solid #ccc' }}>Service</th>
                    <th style={{ padding: 8, border: '1px solid #ccc' }}>Date</th>
                    <th style={{ padding: 8, border: '1px solid #ccc' }}>Slot</th>
                    <th style={{ padding: 8, border: '1px solid #ccc' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bookingRequests.map(r => (
                    <tr key={r.id}>
                      <td style={{ padding: 8, border: '1px solid #ccc' }}>{r.service}</td>
                      <td style={{ padding: 8, border: '1px solid #ccc' }}>{r.date}</td>
                      <td style={{ padding: 8, border: '1px solid #ccc' }}>{r.slot}</td>
                      <td style={{ padding: 8, border: '1px solid #ccc', textTransform: 'capitalize' }}>
                        {r.status || 'pending'}
                      </td>
                    </tr>
                  ))}
                  {bookingRequests.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ padding: 8, border: '1px solid #ccc' }}>
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

