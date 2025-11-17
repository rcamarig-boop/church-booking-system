import React, { useState, useEffect, useContext } from 'react';
import CalendarView from './CalendarView';
import api from './api';
import AdminDashboard from './AdminDashboard';
import NotificationCenter from './NotificationCenter';
import { SocketContext } from './App';

export default function Dashboard({ user, notifications, onLogout, addNotification }) {
  const socket = useContext(SocketContext);
  const [adminMode, setAdminMode] = useState(user.role === 'admin');

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f5f7fa' }}>
      {/* Left Sidebar - Main Content */}
      <div style={{
        flex: 1,
        padding: '40px',
        overflowY: 'auto',
        background: 'white',
        borderRight: '1px solid #e2e8f0'
      }}>
        {/* User Info Header */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <p style={{ margin: '0 0 4px 0', fontSize: '14px', opacity: 0.9 }}>Welcome back</p>
            <h2 style={{ margin: 0, color: 'white', fontSize: '20px' }}>
              {user.name} <span style={{ fontSize: '14px', opacity: 0.9 }}>({user.role})</span>
            </h2>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {user.role === 'admin' && (
              <button
                onClick={() => setAdminMode(!adminMode)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  border: 'none',
                  color: 'white',
                  padding: '8px 16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                {adminMode ? '👤 User View' : '⚙️ Admin Mode'}
              </button>
            )}
            <button
              onClick={onLogout}
              style={{
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '8px',
                border: 'none',
                color: 'white',
                padding: '8px 16px',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              🚪 Logout
            </button>
            <button
              onClick={async () => {
                if (!confirm('Delete your account? This action is irreversible.')) return;
                try {
                  await api.users.deleteMe();
                  addNotification({ type: 'info', text: 'Account deleted' });
                  onLogout();
                } catch (e) {
                  const msg = e && e.response && e.response.data && e.response.data.error ? e.response.data.error : 'Failed to delete account';
                  addNotification({ type: 'error', text: msg });
                }
              }}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.18)',
                borderRadius: '8px',
                color: 'white',
                padding: '8px 12px',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              🗑️ Delete Account
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div>
          {adminMode ? (
            <AdminDashboard addNotification={addNotification} />
          ) : (
            <div>
              <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#2d3748' }}>
                📅 Book Your Appointment
              </h3>
              <p style={{ color: '#718096', marginBottom: '24px' }}>
                Click on a date in the calendar to book your service
              </p>
              {/* Additional content can go here */}
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar - Calendar */}
      <div style={{
        width: '420px',
        background: '#f9fafb',
        borderLeft: '1px solid #e2e8f0',
        padding: '20px',
        overflowY: 'auto',
        boxShadow: '-2px 0 8px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#2d3748' }}>
          📆 Calendar
        </h3>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <CalendarView addNotification={addNotification} compact={true} />
        </div>
      </div>

      {/* Notifications Panel - Hidden by default, can be toggled */}
      {/* Or moved to a notification center elsewhere */}
      <NotificationCenter items={notifications} />
    </div>
  );
}
