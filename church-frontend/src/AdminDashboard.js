import React, { useState, useEffect } from 'react';
import api from './api';

export default function AdminDashboardPanel({ addNotification }) {
  const [events, setEvents] = useState([]);
  const [eventForm, setEventForm] = useState({ title:'', date:'', time_slot:'09:00-10:00', description:'', color:'purple' });

  const loadEvents = async () => {
    try { const res = await api.events.list(); setEvents(res.data || []); } 
    catch(e){ console.error(e); }
  };

  useEffect(() => { loadEvents(); }, []);

  const handleAddEvent = async (e) => {
    e.preventDefault();
    if(!eventForm.title || !eventForm.date){ alert('Fill required fields'); return; }
    try {
      await api.events.create(eventForm);
      addNotification({ type:'info', text:'📌 Event added' });
      setEventForm({ title:'', date:'', time_slot:'09:00-10:00', description:'', color:'purple' });
      loadEvents();
    } catch(e){ console.error(e); }
  };

  const handleDeleteEvent = async (id) => {
    if(!window.confirm('Delete this event?')) return;
    try{ await api.events.delete(id); addNotification({ type:'info', text:'Event deleted' }); loadEvents(); } 
    catch(e){ console.error(e); }
  };

  return (
    <div>
      {/* Add Event Form */}
      <div style={{ marginBottom:'32px', padding:'20px', background:'linear-gradient(135deg,#667eea,#764ba2)', borderRadius:'12px', color:'white' }}>
        <h3 style={{ margin:0, marginBottom:'16px' }}>📌 Add Event</h3>
        <form onSubmit={handleAddEvent} style={{ display:'grid', gap:'12px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', flexWrap:'wrap' }}>
            <input placeholder="Title*" value={eventForm.title} onChange={e=>setEventForm({...eventForm,title:e.target.value})} style={{ width:'100%', padding:'10px', borderRadius:'6px', border:'none' }} />
            <input type="date" value={eventForm.date} onChange={e=>setEventForm({...eventForm,date:e.target.value})} style={{ width:'100%', padding:'10px', borderRadius:'6px', border:'none' }} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
            <select value={eventForm.time_slot} onChange={e=>setEventForm({...eventForm,time_slot:e.target.value})} style={{ width:'100%', padding:'10px', borderRadius:'6px', border:'none' }}>
              <option>09:00-10:00</option><option>10:00-11:00</option><option>11:00-12:00</option><option>13:00-14:00</option><option>14:00-15:00</option>
            </select>
            <select value={eventForm.color} onChange={e=>setEventForm({...eventForm,color:e.target.value})} style={{ width:'100%', padding:'10px', borderRadius:'6px', border:'none' }}>
              <option value="purple">Purple</option><option value="blue">Blue</option><option value="green">Green</option><option value="red">Red</option>
            </select>
          </div>
          <textarea placeholder="Description" value={eventForm.description} onChange={e=>setEventForm({...eventForm,description:e.target.value})} style={{ width:'100%', minHeight:'60px', padding:'10px', borderRadius:'6px', border:'none', fontFamily:'inherit' }} />
          <button type="submit" style={{ padding:'10px', borderRadius:'6px', border:'none', background:'white', color:'#667eea', cursor:'pointer', fontWeight:600 }}>➕ Add Event</button>
        </form>
      </div>

      {/* Event List */}
      <div>
        <h3 style={{ margin:0, marginBottom:'16px' }}>📅 Events ({events.length})</h3>
        {events.length===0 ? <p style={{ textAlign:'center', color:'#a0aec0' }}>No events</p> :
          <div style={{ display:'grid', gap:'12px' }}>
            {events.map(evt => (
              <div key={evt.id} style={{ padding:'12px', background:'#f7fafc', borderRadius:'8px', borderLeft:`4px solid ${evt.color||'#667eea'}`}}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'start', flexWrap:'wrap' }}>
                  <div>
                    <div style={{ fontWeight:600 }}>{evt.title}</div>
                    <div style={{ fontSize:'13px', color:'#718096' }}>📅 {evt.date} • 🕐 {evt.time_slot}</div>
                    {evt.description && <div style={{ fontSize:'13px', color:'#4a5568' }}>{evt.description}</div>}
                  </div>
                  <button onClick={()=>handleDeleteEvent(evt.id)} style={{ background:'#f56565', color:'white', padding:'6px 12px', borderRadius:'4px', border:'none', cursor:'pointer', fontSize:'12px', marginTop:'6px' }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        }
      </div>
    </div>
  );
}
