import React, { useState, useContext } from 'react';
import CalendarView from './CalendarView';
import AdminDashboardPanel from './AdminDashboardPanel';
import NotificationCenter from './NotificationCenter';
import { SocketContext } from './App';

export default function Dashboard({ user, notifications, onLogout, addNotification }) {
  const socket = useContext(SocketContext);
  const [adminMode, setAdminMode] = useState(user.role === 'admin');
  const mobile = window.innerWidth < 900;

  return (
    <div style={{ display: 'flex', flexDirection: mobile ? 'column' : 'row', height: '100vh', background: '#f5f7fa', overflow: 'hidden' }}>
      
      {/* Main Panel */}
      <div style={{ flex: 1, padding: mobile ? 20 : 32, background: 'white', overflowY: 'auto', borderRight: mobile ? 'none' : '1px solid #e2e8f0' }}>
        <div style={{
          background: 'linear-gradient(135deg,#667eea,#764ba2)',
          color: 'white', padding: 20, borderRadius: 12, marginBottom: 24,
          display: 'flex', flexDirection: mobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: mobile ? 'flex-start' : 'center', gap: 16
        }}>
          <div>
            <p style={{ margin: 0, fontSize: 14, opacity: 0.9 }}>Welcome back</p>
            <h2 style={{ margin: 0, fontSize: window.innerWidth < 480 ? 18 : 20 }}>
              {user.name} <span style={{ fontSize: 14, opacity: 0.85 }}>({user.role})</span>
            </h2>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', width: mobile ? '100%' : 'auto' }}>
            {user.role === 'admin' &&
              <button onClick={() => setAdminMode(!adminMode)}
                style={{ padding: 8, background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, color: 'white', fontWeight: 600, cursor: 'pointer', flex: mobile ? 1 : 'unset' }}>
                {adminMode ? '👤 User View' : '⚙️ Admin Mode'}
              </button>
            }
            <button onClick={onLogout} style={{ padding: 8, background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, color: 'white', fontWeight: 600, cursor: 'pointer', flex: mobile ? 1 : 'unset' }}>🚪 Logout</button>
          </div>
        </div>

        <div style={{ paddingBottom: 24 }}>
          {adminMode ? <AdminDashboardPanel addNotification={addNotification} /> :
            <>
              <h3 style={{ marginTop: 0, marginBottom: 12 }}>📅 Book Your Appointment</h3>
              <p style={{ color: '#718096', marginBottom: 24 }}>Click on a date in the calendar to book your service</p>
              <CalendarView addNotification={addNotification} />
            </>
          }
        </div>
      </div>

      {/* Calendar Sidebar */}
      <div style={{ width: mobile ? '100%' : 420, background: '#f9fafb', padding: 20, borderLeft: mobile ? 'none' : '1px solid #e2e8f0', borderTop: mobile ? '1px solid #e2e8f0' : 'none' }}>
        <h3 style={{ marginTop: 0, marginBottom: 16 }}>📆 Calendar</h3>
        <CalendarView addNotification={addNotification} compact />
      </div>

      {/* Notifications */}
      <NotificationCenter items={notifications} />
    </div>
  );
}
