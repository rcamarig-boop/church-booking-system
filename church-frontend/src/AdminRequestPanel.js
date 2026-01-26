import React, { useState, useEffect, useContext } from 'react';
import api from './api';
import { SocketContext } from './App';

export default function AdminRequestPanel({ addNotification }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [eventForm, setEventForm] = useState({ 
    title: '', 
    date: '', 
    time_slot: '09:00-10:00', 
    useTimeSlot: true,
    description: '', 
    color: 'purple' 
  });
  const [events, setEvents] = useState([]);
  const socket = useContext(SocketContext);

  const loadRequests = async () => {
    try {
      const res = await api.bookingRequests.list();
      setRequests(res.data || []);
    } catch (e) {
      console.error('Error loading requests:', e);
    }
  };

  const loadEvents = async () => {
    try {
      const res = await api.events.list();
      setEvents(res.data || []);
    } catch (e) {
      console.error('Error loading events:', e);
    }
  };

  useEffect(() => {
    loadRequests();
    loadEvents();

    const refresh = () => { 
      loadRequests();
      loadEvents();
    };
    socket.on('new_booking', refresh);
    socket.on('event_added', refresh);
    socket.on('event_deleted', refresh);

    return () => {
      socket.off('new_booking', refresh);
      socket.off('event_added', refresh);
      socket.off('event_deleted', refresh);
    };
  }, [socket]);

  const handleApprove = async (id) => {
    try {
      await api.bookingRequests.approve(id);
      addNotification({ type: 'info', text: '✅ Request approved' });
      loadRequests();
    } catch (e) {
      addNotification({ type: 'deleted', text: '❌ Error approving request' });
    }
  };

  const handleReject = async (id) => {
    try {
      await api.bookingRequests.reject(id);
      addNotification({ type: 'info', text: '❌ Request rejected' });
      loadRequests();
    } catch (e) {
      addNotification({ type: 'deleted', text: '❌ Error rejecting request' });
    }
  };

  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!eventForm.title || !eventForm.date) {
      alert('Please fill all required fields');
      return;
    }
    try {
      const eventData = {
        ...eventForm,
        time_slot: eventForm.useTimeSlot ? eventForm.time_slot : 'all-day'
      };
      await api.events.create(eventData);
      addNotification({ type: 'info', text: '📌 Event added to calendar' });
      setEventForm({ 
        title: '', 
        date: '', 
        time_slot: '09:00-10:00', 
        useTimeSlot: true,
        description: '', 
        color: 'purple' 
      });
      loadEvents();
    } catch (e) {
      console.error('Error adding event:', e);
      addNotification({ type: 'deleted', text: 'Error adding event: ' + (e.response?.data?.error || e.message) });
    }
  };

  const handleDeleteEvent = async (id) => {
    if (!window.confirm('Delete this event?')) return;
    try {
      await api.events.delete(id);
      addNotification({ type: 'info', text: 'Event deleted' });
      loadEvents();
    } catch (e) {
      console.error('Error deleting event:', e);
    }
  };

  const createQuickEvent = (preset) => {
    const today = new Date().toISOString().split('T')[0];
    const presets = {
      morning: { title: '⛪ Morning Mass', time_slot: '06:00-07:00', color: 'blue' },
      evening: { title: '⛪ Evening Mass', time_slot: '18:00-19:00', color: 'purple' },
      sunday: { title: '⛪ Sunday Service', time_slot: '09:00-11:00', color: 'green' },
    };
    const p = presets[preset];
    setEventForm({
      title: p.title,
      date: today,
      time_slot: p.time_slot,
      useTimeSlot: true,
      description: '',
      color: p.color
    });
  };

  const filteredRequests = requests.filter(r => filterStatus === 'all' || r.status === filterStatus);

  return (
    <div>
      {/* Add Event Section */}
      <div style={{ marginBottom: '32px', padding: '20px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '12px', color: 'white' }}>
        <h3 style={{ margin: '0 0 16px 0', color: 'white' }}>📌 Add Event to Calendar</h3>
        
        {/* Quick Event Buttons */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            type="button"
            onClick={() => createQuickEvent('morning')}
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.5)',
              padding: '8px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '12px',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.3)'}
            onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
          >
            + Morning Mass
          </button>
          <button
            type="button"
            onClick={() => createQuickEvent('evening')}
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.5)',
              padding: '8px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '12px',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.3)'}
            onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
          >
            + Evening Mass
          </button>
          <button
            type="button"
            onClick={() => createQuickEvent('sunday')}
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.5)',
              padding: '8px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '12px',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.3)'}
            onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
          >
            + Sunday Service
          </button>
        </div>

        <form onSubmit={handleAddEvent} style={{ display: 'grid', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ color: 'rgba(255,255,255,0.9)' }}>Event Title *</label>
              <input
                type="text"
                value={eventForm.title}
                onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                placeholder="e.g., Sunday Service"
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: 'none' }}
              />
            </div>
            <div>
              <label style={{ color: 'rgba(255,255,255,0.9)' }}>Date *</label>
              <input
                type="date"
                value={eventForm.date}
                onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: 'none' }}
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ color: 'rgba(255,255,255,0.9)' }}>Use Time Slot?</label>
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setEventForm({ ...eventForm, useTimeSlot: true })}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '6px',
                    border: 'none',
                    background: eventForm.useTimeSlot ? 'white' : 'rgba(255,255,255,0.3)',
                    color: eventForm.useTimeSlot ? '#667eea' : 'rgba(255,255,255,0.9)',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setEventForm({ ...eventForm, useTimeSlot: false })}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '6px',
                    border: 'none',
                    background: !eventForm.useTimeSlot ? 'white' : 'rgba(255,255,255,0.3)',
                    color: !eventForm.useTimeSlot ? '#667eea' : 'rgba(255,255,255,0.9)',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  All-day
                </button>
              </div>
            </div>
          </div>
          {eventForm.useTimeSlot && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ color: 'rgba(255,255,255,0.9)' }}>Time Slot</label>
                <select
                  value={eventForm.time_slot}
                  onChange={(e) => setEventForm({ ...eventForm, time_slot: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: 'none' }}
                >
                  <option>09:00-10:00</option>
                  <option>10:00-11:00</option>
                  <option>11:00-12:00</option>
                  <option>13:00-14:00</option>
                  <option>14:00-15:00</option>
                  <option>15:00-16:00</option>
                  <option>16:00-17:00</option>
                </select>
              </div>
              <div>
                <label style={{ color: 'rgba(255,255,255,0.9)' }}>Color</label>
                <select
                  value={eventForm.color}
                  onChange={(e) => setEventForm({ ...eventForm, color: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: 'none' }}
                >
                  <option value="purple">Purple</option>
                  <option value="blue">Blue</option>
                  <option value="green">Green</option>
                  <option value="red">Red</option>
                </select>
              </div>
            </div>
          )}
          {!eventForm.useTimeSlot && (
            <div>
              <label style={{ color: 'rgba(255,255,255,0.9)' }}>Color</label>
              <select
                value={eventForm.color}
                onChange={(e) => setEventForm({ ...eventForm, color: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: 'none' }}
              >
                <option value="purple">Purple</option>
                <option value="blue">Blue</option>
                <option value="green">Green</option>
                <option value="red">Red</option>
              </select>
            </div>
          )}
          <div>
            <label style={{ color: 'rgba(255,255,255,0.9)' }}>Description</label>
            <textarea
              value={eventForm.description}
              onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
              placeholder="Event details..."
              style={{ width: '100%', minHeight: '60px', padding: '10px', borderRadius: '6px', border: 'none', fontFamily: 'inherit' }}
            />
          </div>
          <button type="submit" style={{ background: 'white', color: '#667eea', padding: '10px 20px', fontWeight: 600, borderRadius: '6px', border: 'none', cursor: 'pointer' }}>
            ➕ Add Event
          </button>
        </form>
      </div>

      {/* Events List */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '16px' }}>📅 Events on Calendar ({events.length})</h3>
        {events.length === 0 ? (
          <p style={{ color: '#a0aec0', textAlign: 'center', padding: '20px' }}>No events added yet</p>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {events.map((evt) => (
              <div key={evt.id} style={{ padding: '12px', background: '#f7fafc', borderRadius: '8px', borderLeft: `4px solid ${evt.color || '#667eea'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#2d3748' }}>{evt.title}</div>
                    <div style={{ fontSize: '13px', color: '#718096', marginTop: '4px' }}>
                      📅 {evt.date} • 🕐 {evt.time_slot}
                    </div>
                    {evt.description && (
                      <div style={{ fontSize: '13px', color: '#4a5568', marginTop: '4px' }}>{evt.description}</div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteEvent(evt.id)}
                    style={{ background: '#f56565', color: 'white', padding: '6px 12px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '12px' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Booking Requests Section */}
      <div style={{ marginBottom: '32px', padding: '20px', background: '#f9fafb', borderRadius: '12px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '16px' }}>✉️ Booking Requests</h3>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          {['pending', 'approved', 'rejected', 'all'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              style={{
                padding: '8px 16px',
                background: filterStatus === status ? '#667eea' : '#e2e8f0',
                color: filterStatus === status ? 'white' : '#4a5568',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '13px'
              }}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)} ({requests.filter(r => status === 'all' || r.status === status).length})
            </button>
          ))}
        </div>

        {filteredRequests.length === 0 ? (
          <p style={{ color: '#a0aec0', textAlign: 'center', padding: '20px' }}>No {filterStatus} requests</p>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {filteredRequests.map((req) => (
              <div key={req.id} style={{ padding: '16px', background: 'white', borderRadius: '8px', borderLeft: `4px solid ${req.status === 'pending' ? '#ed8936' : req.status === 'approved' ? '#48bb78' : '#f56565'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#2d3748' }}>{req.user_name}</div>
                    <div style={{ fontSize: '13px', color: '#718096' }}>📧 {req.user_email}</div>
                  </div>
                  <div style={{ background: req.status === 'pending' ? '#fef5e7' : req.status === 'approved' ? '#d5f4e6' : '#fadbd8', color: req.status === 'pending' ? '#d68910' : req.status === 'approved' ? '#186a3b' : '#78281f', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>
                    {req.status}
                  </div>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '13px', color: '#4a5568', marginBottom: '4px' }}>
                    📋 <strong>{req.service_type}</strong> • 📅 {req.date} • 🕐 {req.time_slot}
                  </div>
                  {req.notes && (
                    <div style={{ fontSize: '13px', color: '#718096', fontStyle: 'italic', marginTop: '8px' }}>
                      💬 "{req.notes}"
                    </div>
                  )}
                </div>
                {req.status === 'pending' && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleApprove(req.id)}
                      style={{ flex: 1, background: '#48bb78', color: 'white', padding: '8px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
                    >
                      ✅ Approve
                    </button>
                    <button
                      onClick={() => handleReject(req.id)}
                      style={{ flex: 1, background: '#f56565', color: 'white', padding: '8px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
                    >
                      ❌ Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
