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

  const activeTabLabel = {
    events: 'Events',
    bookings: 'My Bookings',
    requests: 'My Requests'
  }[activeTab] || 'Events';

  return (
    <div className="dash-shell">
      <div className="dash-header-card" style={{ marginBottom: 14 }}>
        <div className="dash-header-avatar">
          <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', fontWeight: 700, color: '#2d3748' }}>
            {(user?.name || 'U')[0]}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, color: palette.ink, fontSize: 18 }}>{user?.name || 'Member'}</div>
          <div style={{ color: '#718096', fontSize: 13 }}>{user?.email}</div>
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
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: 12,
        marginBottom: 14
      }}>
        {[
          { key: 'events', label: 'Events', icon: '🗓️' },
          { key: 'bookings', label: 'My Bookings', icon: '✅' },
          { key: 'requests', label: 'My Requests', icon: '📄' },
          { key: 'calendar', label: 'Calendar', icon: '📅' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              all: 'unset',
              cursor: 'pointer',
              background: '#fff',
              borderRadius: 16,
              border: `1px solid ${activeTab === tab.key ? palette.accent : palette.mist}`,
              boxShadow: activeTab === tab.key ? '0 10px 24px rgba(0,0,0,0.12)' : '0 6px 16px rgba(0,0,0,0.08)',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              fontWeight: 700,
              color: palette.ink
            }}
          >
            <span style={{ fontSize: 22 }}>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 14 }}>
        <div className="dashboard-card" style={{ border: `1px solid ${palette.mist}`, boxShadow: '0 12px 28px rgba(0,0,0,0.08)' }}>
          {activeTab === 'events' && (
            <div>
              <h2>Events</h2>
              <div style={{ display: 'grid', gap: 10 }}>
                {events.map((event) => (
                  <div key={event.id} style={{
                    padding: 12,
                    border: `1px solid ${palette.mist}`,
                    borderRadius: 10,
                    background: '#fff'
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

        <section className="dashboard-right-column">
          <CalendarViewNew
            bookings={bookings}
            calendarBookings={calendarBookings}
            events={events}
            calendarConfig={calendarConfig}
            user={user}
          />
          <div style={{ marginTop: 10, textAlign: 'center', color: '#4a5568', fontWeight: 600 }}>
            Viewing tab: {activeTabLabel}
          </div>
        </section>
      </div>
    </div>
  );
}
