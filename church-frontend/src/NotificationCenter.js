import React, { useState } from 'react';

export default function NotificationCenter({ items }) {
  const [isOpen, setIsOpen] = useState(false);

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
    <>
      <div className="notification-wrapper">
        {/* Bell Button */}
        <button
          className="notification-bell"
          onClick={() => setIsOpen(!isOpen)}
        >
          🔔
          {items.length > 0 && (
            <span className="notification-badge">
              {items.length > 9 ? '9+' : items.length}
            </span>
          )}
        </button>

        {/* Popup */}
        {isOpen && (
          <div className="notification-popup">
            <div className="notification-header">
              <span>📬 Notifications ({items.length})</span>
              <button onClick={() => setIsOpen(false)}>✕</button>
            </div>

            {items.length === 0 ? (
              <div className="notification-empty">
                📭 No notifications
              </div>
            ) : (
              <ul className="notification-list">
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
            )}
          </div>
        )}
      </div>

      {/* Styles */}
      <style>{`
        .notification-wrapper {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 999;
        }

        .notification-bell {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          font-size: 24px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          transition: transform 0.2s ease;
        }

        .notification-bell:hover {
          transform: scale(1.1);
        }

        .notification-badge {
          position: absolute;
          top: -6px;
          right: -6px;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: #f56565;
          color: white;
          font-size: 12px;
          font-weight: bold;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .notification-popup {
          position: absolute;
          bottom: 80px;
          right: 0;
          width: 360px;
          max-height: 70vh;
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.15);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .notification-header {
          padding: 14px 16px;
          border-bottom: 1px solid #e2e8f0;
          font-weight: 600;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .notification-header button {
          border: none;
          background: none;
          cursor: pointer;
          font-size: 18px;
          color: #a0aec0;
        }

        .notification-list {
          list-style: none;
          margin: 0;
          padding: 0;
          overflow-y: auto;
        }

        .notification-item {
          padding: 12px 16px;
          border-bottom: 1px solid #e2e8f0;
          border-left: 4px solid;
          background: #fff;
        }

        .notification-text {
          font-size: 13px;
          font-weight: 600;
          color: #2d3748;
        }

        .notification-type {
          font-size: 11px;
          color: #a0aec0;
          text-transform: uppercase;
          margin-top: 4px;
        }

        .notification-empty {
          padding: 32px;
          text-align: center;
          color: #a0aec0;
          font-size: 14px;
        }

        /* ===== MOBILE ===== */
        @media (max-width: 480px) {
          .notification-wrapper {
            right: 16px;
            bottom: 16px;
          }

          .notification-bell {
            width: 52px;
            height: 52px;
            font-size: 22px;
          }

          .notification-popup {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            width: 100%;
            max-height: 75vh;
            border-radius: 16px 16px 0 0;
          }
        }
      `}</style>
    </>
  );
}
