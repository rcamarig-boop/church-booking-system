import React, { useEffect, useState } from 'react';
import api from './api';
import AdminRequestPanel from './AdminRequestPanel';

export default function AdminDashboard({ addNotification }) {
  const [date, setDate] = useState('');
  const [maxSlots, setMaxSlots] = useState(5);
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [activeTab, setActiveTab] = useState('requests'); // 'requests' or 'config'

  const load = async () => {
    try {
      const u = await api.users.list(); setUsers(u.data);
      const b = await api.bookings.list(); setBookings(b.data);
    } catch(e){ console.error(e); }
  }

  useEffect(()=>{ load(); },[]);

  const saveConfig = async () => {
    try {
      await api.calendar.config({ date, max_slots: parseInt(maxSlots) });
      addNotification({ type:'info', text:`Set ${date} max slots ${maxSlots}`});
    } catch(e){ console.error(e); }
  }

  const delBooking = async (id) => {
    if (!confirm('Delete booking?')) return;
    try {
      await api.bookings.delete(id);
      addNotification({ type:'info', text:'Booking deleted' });
      load();
    } catch(e){ console.error(e); }
  }

  const delUser = async (id) => {
    if (!confirm('Delete user? This cannot be undone.')) return;
    try {
      await api.users.delete(id);
      addNotification({ type:'info', text:'User deleted' });
      load();
    } catch(e){
      console.error(e);
      const msg = e && e.response && e.response.data && e.response.data.error ? e.response.data.error : 'Failed to delete user';
      addNotification({ type:'error', text: msg });
    }
  }

  return (
    <div style={{ background:'white', padding:'24px', borderRadius:'12px', boxShadow:'0 2px 8px rgba(0,0,0,0.05)' }}>
      <h2 style={{ marginTop:0, marginBottom:'24px', display:'flex', alignItems:'center', gap:'8px' }}>⚙️ Admin Dashboard</h2>
      
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '2px solid #e2e8f0' }}>
        <button
          onClick={() => setActiveTab('requests')}
          style={{
            padding: '12px 24px',
            background: activeTab === 'requests' ? '#667eea' : 'transparent',
            color: activeTab === 'requests' ? 'white' : '#4a5568',
            border: 'none',
            borderBottom: activeTab === 'requests' ? '3px solid #667eea' : 'none',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '14px',
            marginBottom: '-2px'
          }}
        >
          ✉️ Booking Requests
        </button>
        <button
          onClick={() => setActiveTab('config')}
          style={{
            padding: '12px 24px',
            background: activeTab === 'config' ? '#667eea' : 'transparent',
            color: activeTab === 'config' ? 'white' : '#4a5568',
            border: 'none',
            borderBottom: activeTab === 'config' ? '3px solid #667eea' : 'none',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '14px',
            marginBottom: '-2px'
          }}
        >
          📋 Settings & Users
        </button>
      </div>

      {activeTab === 'requests' && (
        <AdminRequestPanel addNotification={addNotification} />
      )}

      {activeTab === 'config' && (
        <div>
      <div style={{ marginBottom:'32px', padding:'20px', background:'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius:'12px', color:'white' }}>
        <h3 style={{ margin:'0 0 16px 0', color:'white' }}>Configure Calendar</h3>
        <p style={{ margin:'0 0 16px 0', fontSize:'14px', opacity:0.9 }}>Set maximum booking slots for a specific date</p>
        <div style={{ display:'flex', gap:'12px', alignItems:'flex-end' }}>
          <div style={{ flex:1 }}>
            <label style={{ color:'rgba(255,255,255,0.9)', marginBottom:'8px' }}>Date</label>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{ width:'100%', padding:'10px', borderRadius:'6px', border:'none' }} />
          </div>
          <div style={{ width:'120px' }}>
            <label style={{ color:'rgba(255,255,255,0.9)', marginBottom:'8px' }}>Max Slots</label>
            <input type="number" value={maxSlots} onChange={e=>setMaxSlots(e.target.value)} style={{ width:'100%', padding:'10px', borderRadius:'6px', border:'none' }} />
          </div>
          <button onClick={saveConfig} style={{ background:'white', color:'#667eea', padding:'10px 24px', fontWeight:600 }}>Save Config</button>
        </div>
      </div>

      <div style={{ marginBottom:'32px' }}>
        <h3 style={{ marginTop:0, marginBottom:'16px', display:'flex', alignItems:'center', gap:'8px' }}>👥 Users ({users.length})</h3>
        <div style={{ display:'grid', gap:'12px' }}>
          {users.length === 0 ? (
            <p style={{ color:'#a0aec0', textAlign:'center', padding:'20px' }}>No users found</p>
          ) : (
            users.map(u => (
              <div key={u.id} style={{ padding:'12px', background:'#f7fafc', borderRadius:'8px', borderLeft:'4px solid #667eea', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontWeight:600, color:'#2d3748' }}>{u.name}</div>
                  <div style={{ fontSize:'13px', color:'#718096', marginTop:'4px' }}>
                    📧 {u.email} • <span style={{ background:'#e0e7ff', color:'#667eea', padding:'2px 8px', borderRadius:'4px', fontSize:'12px', fontWeight:600 }}>{u.role.toUpperCase()}</span>
                  </div>
                </div>
                <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                  <button onClick={()=>{ if(confirm('Delete user?')) delUser(u.id); }} style={{ background:'#f56565', padding:'6px 12px', fontSize:'12px', fontWeight:600 }}>Delete</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div>
        <h3 style={{ marginTop:0, marginBottom:'16px', display:'flex', alignItems:'center', gap:'8px' }}>📋 Bookings ({bookings.length})</h3>
        {bookings.length === 0 ? (
          <p style={{ color:'#a0aec0', textAlign:'center', padding:'20px' }}>No bookings found</p>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#f7fafc', borderBottom:'2px solid #e2e8f0' }}>
                  <th style={{ padding:'12px', textAlign:'left', fontWeight:600, color:'#4a5568' }}>Date</th>
                  <th style={{ padding:'12px', textAlign:'left', fontWeight:600, color:'#4a5568' }}>Time</th>
                  <th style={{ padding:'12px', textAlign:'left', fontWeight:600, color:'#4a5568' }}>Service</th>
                  <th style={{ padding:'12px', textAlign:'left', fontWeight:600, color:'#4a5568' }}>User</th>
                  <th style={{ padding:'12px', textAlign:'center', fontWeight:600, color:'#4a5568' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map(b => (
                  <tr key={b.id} style={{ borderBottom:'1px solid #e2e8f0', transition:'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#f7fafc'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                    <td style={{ padding:'12px', color:'#2d3748' }}>📅 {b.date}</td>
                    <td style={{ padding:'12px', color:'#4a5568' }}>🕐 {b.time_slot}</td>
                    <td style={{ padding:'12px', color:'#4a5568' }}>{b.service_type}</td>
                    <td style={{ padding:'12px', color:'#4a5568' }}>{b.user_name}</td>
                    <td style={{ padding:'12px', textAlign:'center' }}>
                      <button onClick={()=>delBooking(b.id)} style={{ background:'#f56565', padding:'6px 12px', fontSize:'12px', fontWeight:600 }}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
        </div>
      )}
    </div>
  )
}
