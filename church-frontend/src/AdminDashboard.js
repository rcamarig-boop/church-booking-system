import React, { useState, useEffect, useContext } from 'react';
import api from './api';
import CalendarViewNew from './CalendarViewNew';
import { SocketContext } from './App';

export default function AdminDashboard({ addNotification, onLogout }) {
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [dateLimits, setDateLimits] = useState({});
  const [events, setEvents] = useState([]);
  const [activeTab, setActiveTab] = useState('events');
  const [selectedDate, setSelectedDate] = useState('');
  const [newLimit, setNewLimit] = useState('');
  const [eventForm, setEventForm] = useState({
    title: '',
    date: '',
    startTime: '09:00',
    endTime: '10:00',
    description: ''
  });
  const socket = useContext(SocketContext);

  /** Fetch bookings from API */
  const fetchBookings = async () => {
    try {
      const res = await api.bookings.list();
      setBookings(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  /** Fetch events from API */
  const fetchEvents = async () => {
    try {
      const res = await api.events.list();
      setEvents(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  /** Fetch users from API */
  const fetchUsers = async () => {
    try {
      const res = await api.users.list();
      setUsers(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  /** Fetch calendar limits */
  const fetchCalendar = async () => {
    try {
      const res = await api.calendar.get();
      setDateLimits(res.data || {});
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchBookings();
    fetchUsers();
    fetchCalendar();
    fetchEvents();

    const refresh = () => { 
      fetchBookings(); 
      fetchCalendar(); 
      fetchEvents();
    };
    socket.on('new_booking', refresh);
    socket.on('booking_deleted', refresh);
    socket.on('calendar_config_updated', refresh);
    socket.on('event_added', refresh);
    socket.on('event_deleted', refresh);

    return () => {
      socket.off('new_booking', refresh);
      socket.off('booking_deleted', refresh);
      socket.off('calendar_config_updated', refresh);
      socket.off('event_added', refresh);
      socket.off('event_deleted', refresh);
    };
  }, [socket]);

  /** Delete a booking */
  const handleDeleteBooking = async (id) => {
    if (!window.confirm('Delete this booking?')) return;
    try {
      await api.bookings.delete(id);
      addNotification({ type: 'deleted', text: 'Booking deleted' });
      fetchBookings();
    } catch (e) { console.error(e); }
  };

  /** Delete a user */
  const handleDeleteUser = async (id) => {
    if (!window.confirm('Delete this user?')) return;
    try {
      await api.users.delete(id);
      addNotification({ type: 'deleted', text: 'User deleted' });
      fetchUsers();
    } catch (e) { console.error(e); }
  };

  /** Set max bookings for a selected date */
  const handleSetLimit = async () => {
    if (!selectedDate || !newLimit) return;
    try {
      // Format date as YYYY-MM-DD to match backend expectation
      const formattedDate = new Date(selectedDate).toISOString().split('T')[0];
      
      await api.calendar.config({ date: formattedDate, max_slots: parseInt(newLimit) });
      addNotification({ type: 'info', text: `✅ Limit updated for ${formattedDate}` });
      setNewLimit('');
      setSelectedDate('');
      
      // Fetch updated calendar data
      await fetchCalendar();
      await fetchBookings();
      
      // Emit socket event to notify other clients
      socket.emit('calendar_config_updated', { date: formattedDate, max_slots: parseInt(newLimit) });
    } catch (e) { 
      addNotification({ type: 'deleted', text: 'Error updating limit' });
      console.error(e); 
    }
  };

  /** Create custom event for admin */
  const handleCreateCustomEvent = async (e) => {
    e.preventDefault();
    if (!eventForm.title || !eventForm.date || !eventForm.startTime || !eventForm.endTime) {
      addNotification({ type: 'deleted', text: 'Please fill all required fields' });
      return;
    }
    
    // Validate that end time is after start time
    if (eventForm.endTime <= eventForm.startTime) {
      addNotification({ type: 'deleted', text: 'End time must be after start time' });
      return;
    }

    try {
      const eventData = {
        title: eventForm.title,
        date: eventForm.date,
        time_slot: `${eventForm.startTime}-${eventForm.endTime}`,
        description: eventForm.description,
        color: 'purple',
        is_admin_event: true
      };
      await api.events.create(eventData);
      addNotification({ type: 'info', text: '✅ Custom event created successfully!' });
      setEventForm({
        title: '',
        date: '',
        startTime: '09:00',
        endTime: '10:00',
        description: ''
      });
      fetchEvents();
    } catch (e) {
      console.error('Error creating event:', e);
      addNotification({ type: 'deleted', text: 'Error creating event' });
    }
  };

  return (
    <div style={{ background: '#f7fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <div style={{
        background: 'linear-gradient(to right, #667eea, #764ba2)',
        color: 'white',
        padding: '20px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700 }}>👋 Admin Dashboard</h1>
        <button onClick={onLogout} style={styles.headerBtn}>Logout</button>
      </div>

      {/* Main Content */}
      <div style={{ display: 'flex', padding: '32px', gap: '24px' }}>

        {/* Sidebar - Tabbed Panel */}
        <div style={styles.sidebar}>
          {/* Tab Headers */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '2px solid #e2e8f0' }}>
            <button
              onClick={() => setActiveTab('events')}
              style={{
                ...styles.tabButton,
                borderBottom: activeTab === 'events' ? '3px solid #667eea' : 'none',
                color: activeTab === 'events' ? '#667eea' : '#4a5568'
              }}
            >
              ✏️ Custom Events
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              style={{
                ...styles.tabButton,
                borderBottom: activeTab === 'settings' ? '3px solid #667eea' : 'none',
                color: activeTab === 'settings' ? '#667eea' : '#4a5568'
              }}
            >
              👥 Users & Limits
            </button>
          </div>

          {/* Tab Content - Custom Events */}
          {activeTab === 'events' && (
            <div>
              <p style={{ fontSize: '13px', color: '#718096', marginBottom: '20px' }}>
                Admin only - Create events with custom times. Members book fixed time slots.
              </p>

              <form onSubmit={handleCreateCustomEvent} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Event Title */}
                <div>
                  <label style={styles.formLabel}>Event Title *</label>
                  <input
                    type="text"
                    placeholder="e.g., Counseling, Prayer Meeting"
                    value={eventForm.title}
                    onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                    style={styles.formInput}
                  />
                </div>

                {/* Event Date */}
                <div>
                  <label style={styles.formLabel}>Date *</label>
                  <input
                    type="date"
                    value={eventForm.date}
                    onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                    style={styles.formInput}
                  />
                </div>

                {/* Start Time */}
                <div>
                  <label style={styles.formLabel}>Start Time *</label>
                  <input
                    type="time"
                    value={eventForm.startTime}
                    onChange={(e) => setEventForm({ ...eventForm, startTime: e.target.value })}
                    style={styles.formInput}
                  />
                </div>

                {/* End Time */}
                <div>
                  <label style={styles.formLabel}>End Time *</label>
                  <input
                    type="time"
                    value={eventForm.endTime}
                    onChange={(e) => setEventForm({ ...eventForm, endTime: e.target.value })}
                    style={styles.formInput}
                  />
                </div>

                {/* Description */}
                <div>
                  <label style={styles.formLabel}>Description</label>
                  <textarea
                    placeholder="Add event details..."
                    value={eventForm.description}
                    onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                    style={{...styles.formInput, resize: 'vertical', minHeight: '80px'}}
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: 'pointer',
                    marginTop: '12px',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.transform = 'scale(1.02)'}
                  onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                >
                  ➕ Create Custom Event
                </button>
              </form>

              <hr style={{ margin: '24px 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />

              {/* Recent Events */}
              <h3 style={styles.sidebarTitle}>📌 Recent Custom Events</h3>
              {events.length === 0 ? (
                <p style={{ color: '#718096', fontSize: '14px' }}>No custom events yet.</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {events.slice(-5).reverse().map(evt => (
                    <li key={evt.id} style={styles.bookingItem}>
                      <div style={{ fontWeight: 600, color: getColorValue(evt.color || 'purple') }}>
                        {evt.title}
                      </div>
                      <div style={{ fontSize: '13px', color: '#4a5568' }}>
                        {evt.date} • {evt.time_slot}
                      </div>
                      {evt.description && (
                        <div style={{ fontSize: '12px', color: '#718096', marginTop: '4px', fontStyle: 'italic' }}>
                          {evt.description}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Tab Content - Users & Limits */}
          {activeTab === 'settings' && (
            <div>
              {/* Bookings Section */}
              <h3 style={styles.sidebarTitle}>📋 All Bookings</h3>
              {bookings.length === 0 ? (
                <p style={{ color: '#718096', marginBottom: '24px' }}>No bookings yet.</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, marginBottom: '24px' }}>
                  {bookings.map(b => (
                    <li key={b.id} style={styles.bookingItem}>
                      <div style={{ fontWeight: 600 }}>{b.service_type} — {b.user_name}</div>
                      <div style={{ fontSize: '14px', color: '#4a5568' }}>
                        {b.date} • {b.time_slot}
                      </div>
                      <button style={styles.cancelBtn} onClick={() => handleDeleteBooking(b.id)}>Cancel</button>
                    </li>
                  ))}
                </ul>
              )}

              <hr style={{ margin: '24px 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />

              {/* Users Section */}
              <h3 style={styles.sidebarTitle}>👥 Users</h3>
              {users.length === 0 ? (
                <p style={{ color: '#718096', marginBottom: '24px' }}>No users found.</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, marginBottom: '24px' }}>
                  {users.map(u => (
                    <li key={u.id} style={styles.bookingItem}>
                      <div style={{ fontWeight: 600 }}>{u.name}</div>
                      <div style={{ fontSize: '14px', color: '#4a5568' }}>{u.email}</div>
                      <button style={styles.cancelBtn} onClick={() => handleDeleteUser(u.id)}>Delete</button>
                    </li>
                  ))}
                </ul>
              )}

              <hr style={{ margin: '24px 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />

              {/* Set date limit */}
              <h3 style={styles.sidebarTitle}>📅 Set Booking Limit</h3>
              <p style={{ fontSize: '13px', color: '#718096', marginBottom: '16px' }}>
                Set maximum number of slots available per date.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={styles.formLabel}>Date</label>
                  <input 
                    type="date" 
                    value={selectedDate} 
                    onChange={e => setSelectedDate(e.target.value)}
                    style={styles.formInput}
                  />
                </div>
                <div>
                  <label style={styles.formLabel}>Max Slots</label>
                  <input 
                    type="number" 
                    min={1} 
                    value={newLimit} 
                    onChange={e => setNewLimit(e.target.value)}
                    style={styles.formInput}
                  />
                </div>
                <button 
                  onClick={handleSetLimit}
                  style={{
                    width: '100%',
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: 'pointer',
                    marginTop: '8px',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.background = '#764ba2'}
                  onMouseOut={(e) => e.target.style.background = '#667eea'}
                >
                  Set Limit
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Calendar */}
        <div style={styles.calendarContainer}>
          <CalendarViewNew addNotification={addNotification} compact={true} />
        </div>
      </div>
    </div>
  );
}

const styles = {
  headerBtn: {
    background: 'white',
    color: '#4a5568',
    border: 'none',
    padding: '8px 14px',
    borderRadius: '6px',
    fontWeight: 600,
    cursor: 'pointer'
  },
  tabButton: {
    background: 'none',
    border: 'none',
    padding: '12px 16px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginBottom: '-2px'
  },
  sidebar: {
    width: '380px',
    minWidth: '300px',
    maxHeight: '80vh',
    overflowY: 'auto',
    background: '#fff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    flexShrink: 0
  },
  sidebarTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#2d3748',
    marginBottom: '12px'
  },
  formLabel: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: '#4a5568',
    marginBottom: '6px'
  },
  formInput: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
    ':focus': {
      outline: 'none',
      borderColor: '#667eea'
    }
  },
  bookingItem: {
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '1px solid #e2e8f0'
  },
  cancelBtn: {
    marginTop: '8px',
    background: '#e53e3e',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer'
  },
  calendarContainer: {
    flex: 1,
    background: '#fff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    maxHeight: '90vh',
    overflowY: 'auto'
  }
};

/** Helper function to get color values */
function getColorValue(color) {
  const colorMap = {
    'purple': '#a855f7',
    'blue': '#3b82f6',
    'green': '#10b981',
    'red': '#ef4444',
    'orange': '#f97316',
    'pink': '#ec4899',
    'indigo': '#6366f1',
    'teal': '#14b8a6'
  };
  return colorMap[color] || '#a855f7';
}
