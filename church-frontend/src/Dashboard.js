import React, { useState, useContext } from 'react';
import CalendarView from './CalendarView';
import AdminDashboardPanel from './AdminDashboardPanel';
import NotificationCenter from './NotificationCenter';
import { SocketContext } from './App';
import api from './api';

export default function Dashboard({ user, notifications, onLogout, addNotification }) {
  const socket = useContext(SocketContext);
  const [adminMode, setAdminMode] = useState(user.role === 'admin');

  return (
    <div className="dashboard-layout">
      <div className="main-panel">
        <div className="user-header">
          <div>
            <p className="welcome-text">Welcome back</p>
            <h2 className="user-name">{user.name} <span className="user-role">({user.role})</span></h2>
          </div>
          <div className="header-actions">
            {user.role === 'admin' && (
              <button className="header-btn" onClick={() => setAdminMode(!adminMode)}>
                {adminMode ? '👤 User View' : '⚙️ Admin Mode'}
              </button>
            )}
            <button className="header-btn" onClick={onLogout}>🚪 Logout</button>
            <button className="header-btn outline" onClick={async ()=>{
              if(!window.confirm('Delete your account?')) return;
              try{ await api.users.deleteMe(); addNotification({type:'info', text:'Account deleted'}); onLogout();}
              catch(e){ addNotification({type:'error', text:e?.response?.data?.error||'Failed to delete account'});}
            }}>🗑️ Delete Account</button>
          </div>
        </div>

        <div className="content-area">
          {adminMode ? <AdminDashboardPanel addNotification={addNotification} /> :
            <>
              <h3>📅 Book Your Appointment</h3>
              <p>Click on a date in the calendar to book your service</p>
            </>
          }
        </div>
      </div>

      <div className="calendar-panel">
        <h3>📆 Calendar</h3>
        <div className="calendar-container">
          <CalendarView addNotification={addNotification} compact />
        </div>
      </div>

      <NotificationCenter items={notifications} />
    </div>
  );
}
