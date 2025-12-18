import React, { useEffect, useState } from 'react';
import api from './api';
import AdminRequestPanel from './AdminRequestPanel';

export default function AdminDashboard({ addNotification }) {
  const [date, setDate] = useState('');
  const [maxSlots, setMaxSlots] = useState(5);
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [activeTab, setActiveTab] = useState('requests');

  const load = async () => {
    try {
      const [u, b] = await Promise.all([
        api.users.list(),
        api.bookings.list()
      ]);
      setUsers(u.data);
      setBookings(b.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const saveConfig = async () => {
    try {
      await api.calendar.config({
        date,
        max_slots: Number(maxSlots)
      });
      addNotification({
        type: 'info',
        text: `Set ${date} max slots to ${maxSlots}`
      });
    } catch (e) {
      console.error(e);
    }
  };

  const delBooking = async (id) => {
    if (!window.confirm('Delete booking?')) return;
    await api.bookings.delete(id);
    addNotification({ type: 'info', text: 'Booking deleted' });
    load();
  };

  const delUser = async (id) => {
    if (!window.confirm('Delete user?')) return;
    await api.users.delete(id);
    addNotification({ type: 'info', text: 'User deleted' });
    load();
  };

  return (
    <div className="admin-card">
      <h2>⚙️ Admin Dashboard</h2>

      <div className="tab-bar">
        <button
          className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          ✉️ Booking Requests
        </button>
        <button
          className={`tab-btn ${activeTab === 'config' ? 'active' : ''}`}
          onClick={() => setActiveTab('config')}
        >
          📋 Settings & Users
        </button>
      </div>

      {activeTab === 'requests' && (
        <AdminRequestPanel addNotification={addNotification} />
      )}

      {activeTab === 'config' && (
        <>
          <div className="config-box">
            <h3>Configure Calendar</h3>
            <div className="config-row">
              <input type="date" value={date} onChange={e => setDate(e.target.value)} />
              <input type="number" value={maxSlots} onChange={e => setMaxSlots(e.target.value)} />
              <button onClick={saveConfig}>Save</button>
            </div>
          </div>

          <h3>👥 Users</h3>
          <div className="list">
            {users.map(u => (
              <div key={u.id} className="list-item">
                <div>
                  <strong>{u.name}</strong>
                  <div className="meta">{u.email}</div>
                </div>
                <button className="danger" onClick={() => delUser(u.id)}>Delete</button>
              </div>
            ))}
          </div>

          <h3>📋 Bookings</h3>
          <table className="table">
            <tbody>
              {bookings.map(b => (
                <tr key={b.id}>
                  <td>📅 {b.date}</td>
                  <td>🕐 {b.time_slot}</td>
                  <td>{b.service_type}</td>
                  <td>{b.user_name}</td>
                  <td>
                    <button className="danger" onClick={() => delBooking(b.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <style>{`
        .admin-card {
          background: white;
          padding: 24px;
          border-radius: 12px;
        }

        .tab-bar {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
        }

        .tab-btn {
          padding: 12px;
          border: none;
          cursor: pointer;
          font-weight: 600;
        }

        .tab-btn.active {
          background: #667eea;
          color: white;
        }

        .config-box {
          background: #edf2ff;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 24px;
        }

        .config-row {
          display: flex;
          gap: 12px;
        }

        .list {
          display: grid;
          gap: 12px;
        }

        .list-item {
          display: flex;
          justify-content: space-between;
          background: #f7fafc;
          padding: 12px;
          border-radius: 8px;
        }

        .danger {
          background: #f56565;
          color: white;
          border: none;
          padding: 6px 12px;
        }

        .table td {
          padding: 8px;
        }

        /* 📱 Mobile */
        @media (max-width: 768px) {
          .tab-bar {
            flex-direction: column;
          }

          .config-row {
            flex-direction: column;
          }

          .list-item {
            flex-direction: column;
            gap: 8px;
          }

          .table tr {
            display: block;
            border: 1px solid #e2e8f0;
            margin-bottom: 12px;
            padding: 12px;
          }

          .table td {
            display: block;
          }
        }
      `}</style>
    </div>
  );
}
