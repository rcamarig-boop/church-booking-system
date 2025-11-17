import React, { useState } from 'react';

export default function NotificationCenter({ items }) {
  const [isOpen, setIsOpen] = useState(false);

  const getIcon = (type) => {
    const icons = {
      'new_booking': '✅',
      'deleted': '❌',
      'config': '⚙️',
      'info': 'ℹ️'
    };
    return icons[type] || '📌';
  };

  const getColor = (type) => {
    const colors = {
      'new_booking': '#48bb78',
      'deleted': '#f56565',
      'config': '#ed8936',
      'info': '#667eea'
    };
    return colors[type] || '#718096';
  };

  return (
    <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 999 }}>
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'scale(1.1)';
          e.target.style.boxShadow = '0 8px 20px rgba(0,0,0,0.25)';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'scale(1)';
          e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        }}
      >
        🔔
        {items.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '-5px',
            right: '-5px',
            background: '#f56565',
            color: 'white',
            borderRadius: '50%',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 'bold',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
          }}>
            {items.length > 9 ? '9+' : items.length}
          </div>
        )}
      </button>

      {/* Notification Popup */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          bottom: '80px',
          right: '0',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
          width: '360px',
          maxHeight: '500px',
          overflow: 'auto',
          zIndex: 1000
        }}>
          <div style={{
            padding: '16px',
            borderBottom: '1px solid #e2e8f0',
            fontWeight: 600,
            color: '#2d3748',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>📬 Notifications ({items.length})</span>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '18px',
                cursor: 'pointer',
                color: '#a0aec0'
              }}
            >
              ✕
            </button>
          </div>
          
          <div>
            {items.length === 0 ? (
              <div style={{
                padding: '32px 16px',
                textAlign: 'center',
                color: '#a0aec0',
                fontSize: '14px'
              }}>
                📭 No notifications
              </div>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {items.map((n, i) => (
                  <li key={i} style={{
                    padding: '12px 16px',
                    borderBottom: i < items.length - 1 ? '1px solid #e2e8f0' : 'none',
                    borderLeft: '4px solid ' + getColor(n.type),
                    background: i % 2 === 0 ? 'white' : '#f9fafb',
                    transition: 'background 0.2s'
                  }}>
                    <div style={{
                      fontWeight: 600,
                      color: '#2d3748',
                      marginBottom: '4px',
                      fontSize: '13px'
                    }}>
                      {getIcon(n.type)} {n.text}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: '#a0aec0',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      {n.type}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
