import React from 'react';

export default function Notifications({ items }) {
  const getIcon = (type) => {
    const icons = {
      new_booking: '✅',
      deleted: '❌',
      config: '⚙️',
      info: 'ℹ️'
    };
    return icons[type] || '📌';
  };

  const getColor = (type) => {
    const colors = {
      new_booking: '#48bb78',
      deleted: '#f56565',
      config: '#ed8936',
      info: '#667eea'
    };
    return colors[type] || '#718096';
  };

  return (
    <div className="notifications-container">
      {items.length === 0 && (
        <div className="notifications-empty">
          📭 No notifications yet
        </div>
      )}

      <ul className="notifications-list">
        {items.map((n, i) => (
          <li
            key={i}
            className="notification-item"
            style={{ borderLeftColor: getColor(n.type) }}
          >
            <div className="notification-text">
              {getIcon(n.type)} {n.text}
            </div>
            <div className="notification-type">
              {n.type}
            </div>
          </li>
        ))}
      </ul>

      <style>{`
        .notifications-container {
          width: 100%;
        }

        .notifications-empty {
          text-align: center;
          color: #a0aec0;
          padding: 40px 20px;
          font-size: 14px;
        }

        .notifications-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .notification-item {
          padding: 14px;
          border-bottom: 1px solid #e2e8f0;
          border-left: 4px solid;
          background: white;
          margin-bottom: 10px;
          border-radius: 8px;
          font-size: 13px;
        }

        .notification-text {
          font-weight: 600;
          color: #2d3748;
          margin-bottom: 6px;
          line-height: 1.4;
        }

        .notification-type {
          font-size: 11px;
          color: #a0aec0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* ===== MOBILE ===== */
        @media (max-width: 480px) {
          .notification-item {
            padding: 16px;
            font-size: 14px;
          }

          .notification-text {
            font-size: 14px;
          }

          .notification-type {
            font-size: 10px;
          }
        }
      `}</style>
    </div>
  );
}
