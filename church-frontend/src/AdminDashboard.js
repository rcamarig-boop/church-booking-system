import React, { useState, useEffect } from 'react';
import api from './api';

export default function AdminDashboardPanel({ addNotification }) {
  const [events, setEvents] = useState([]);
  const [eventForm, setEventForm] = useState({ title:'', date:'', time_slot:'09:00-10:00', description:'', color:'purple' });

  const loadEvents = async () => {
    try { const res = await api.events.list(); setEvents(res.data||[]); } 
    catch(e){ console.error(e); }
  };

  useEffect(() => { loadEvents(); }, []);

  const handleAddEvent = async (e) => {
    e.preventDefault();
    if(!eventForm.title||!eventForm.date) return alert('Fill all required fields');
    try{ await api.events.create(eventForm); addNotification({type:'info', text:'📌 Event added'}); setEventForm({ title:'', date:'', time_slot:'09:00-10:00', description:'', color:'purple' }); loadEvents(); }
    catch(e){ console.error(e); }
  };

  const handleDeleteEvent = async (id) => {
    if(!window.confirm('Delete this event?')) return;
    try{ await api.events.delete(id); addNotification({type:'info', text:'Event deleted'}); loadEvents(); } 
    catch(e){ console.error(e); }
  };

  return (
    <div>
      <div style={{marginBottom:'32px', padding:'20px', background:'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius:'12px', color:'white'}}>
        <h3>📌 Add Event to Calendar</h3>
        <form onSubmit={handleAddEvent} style={{display:'grid', gap:'12px'}}>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px'}}>
            <div>
              <label>Event Title *</label>
              <input type="text" value={eventForm.title} onChange={e=>setEventForm({...eventForm, title:e.target.value})} placeholder="e.g., Sunday Service" />
            </div>
            <div>
              <label>Date *</label>
              <input type="date" value={eventForm.date} onChange={e=>setEventForm({...eventForm, date:e.target.value})} />
            </div>
          </div>

          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px'}}>
            <div>
              <label>Time Slot</label>
              <select value={eventForm.time_slot} onChange={e=>setEventForm({...eventForm, time_slot:e.target.value})}>
                <option>09:00-10:00</option><option>10:00-11:00</option><option>11:00-12:00</option><option>13:00-14:00</option><option>14:00-15:00</option>
              </select>
            </div>
            <div>
              <label>Color</label>
              <select value={eventForm.color} onChange={e=>setEventForm({...eventForm, color:e.target.value})}>
                <option value="purple">Purple</option><option value="blue">Blue</option><option value="green">Green</option><option value="red">Red</option>
              </select>
            </div>
          </div>

          <div>
            <label>Description</label>
            <textarea value={eventForm.description} onChange={e=>setEventForm({...eventForm, description:e.target.value})} placeholder="Event details..." />
          </div>

          <button type="submit">➕ Add Event</button>
        </form>
      </div>

      <div>
        <h3>📅 Events on Calendar ({events.length})</h3>
        {events.length===0 ? <p>No events added yet</p> : 
          <div style={{display:'grid', gap:'12px'}}>
            {events.map(evt=>(
              <div key={evt.id} style={{padding:'12px', background:'#f7fafc', borderLeft:`4px solid ${evt.color||'#667eea'}`}}>
                <div style={{display:'flex', justifyContent:'space-between'}}>
                  <div>
                    <div>{evt.title}</div>
                    <div>📅 {evt.date} • 🕐 {evt.time_slot}</div>
                    {evt.description && <div>{evt.description}</div>}
                  </div>
                  <button onClick={()=>handleDeleteEvent(evt.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        }
      </div>
    </div>
  );
}
