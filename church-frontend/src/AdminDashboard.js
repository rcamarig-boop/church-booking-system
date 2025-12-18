import React, { useState, useEffect } from 'react';
import api from './api';

export default function AdminDashboardPanel({ addNotification }) {
  const [events, setEvents] = useState([]);
  const [eventForm, setEventForm] = useState({
    title: '',
    date: '',
    time_slot: '09:00-10:00',
    description: '',
    color: 'purple'
  });

  // Load events from backend
  const loadEvents = async () => {
    try {
      const res = await api.events.list();
      setEvents(res.data || []);
    } catch (e) {
      console.error('Error loading events:', e);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  // Add new event
  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!eventForm.title || !eventForm.date) {
      alert('Please fill all required fields');
      return;
    }
    try {
      await api.events.create(eventForm);
      addNotification({ type: 'info', text: '📌 Event added to calendar' });
      setEventForm({ title: '', date: '', time_slot: '09:00-10:00', description: '', color: 'purple' });
      loadEvents();
    } catch (e) {
      console.error('Error adding event:', e);
    }
  };

  // Delete event
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

  return (
    <div>
      {/* Add Event Section */}
      <div style={{ marginBottom: '32px', padding: '20px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '12px', color: 'white' }}>
        <h3 style={{ margin: '0 0 16px 0', color: 'white' }}>📌 Add Event to Calendar</h3>
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
      <div>
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
                    {evt.description && <div style={{ fontSize: '13px', color: '#4a5568', marginTop: '4px' }}>{evt.description}</div>}
                  </div>
                  <button onClick={() => handleDeleteEvent(evt.id)} style={{ background: '#f56565', color: 'white', padding: '6px 12px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '12px' }}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
