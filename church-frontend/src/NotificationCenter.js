import React, { useMemo, useState } from 'react';

export default function NotificationCenter({
  items,
  onMarkRead,
  onMarkAllRead,
  onClearAll
}) {
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = useMemo(
    () => items.reduce((count, n) => count + (n.read ? 0 : 1), 0),
    [items]
  );

  const getIcon = (type) => {
    const icons = {
      new_booking: '[OK]',
      deleted: '[X]',
      config: '[CFG]',
      event_soon: '[SOON]',
      success: '[DONE]',
      info: '[INFO]'
    };
    return icons[type] || '[*]';
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

  const formatWhen = (value) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 999 }}>
      <button
        onClick={() => {
          const next = !isOpen;
          setIsOpen(next);
          if (next && unreadCount > 0) {
            onMarkAllRead?.();
          }
        }}
        style={{
          width: 60,
          height: 60,
          borderRadius: '50%',
          border: 'none',
          background: '#667eea',
          backgroundImage: 'linear-gradient(135deg,#667eea,#764ba2)',
          color: '#fff',
          fontSize: 24,
          cursor: 'pointer',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}
      >
        N
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -6,
              right: -6,
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: '#f56565',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            bottom: 80,
            right: 0,
            width: 360,
            maxHeight: '70vh',
            background: '#fff',
            borderRadius: 12,
            boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div
            style={{
              padding: 14,
              borderBottom: '1px solid #e2e8f0',
              fontWeight: 600,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <span>Notifications ({items.length})</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                onClick={() => onMarkAllRead?.()}
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  color: '#4a5568'
                }}
              >
                Mark all read
              </button>
              <button
                onClick={() => onClearAll?.()}
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  color: '#c53030'
                }}
              >
                Clear
              </button>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: 18,
                  color: '#a0aec0'
                }}
              >
                x
              </button>
            </div>
          </div>

          {items.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#a0aec0', fontSize: 14 }}>
              No notifications
            </div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {items.map((n) => (
                <li
                  key={n.id}
                  onClick={() => onMarkRead?.(n.id)}
                  style={{
                    padding: 12,
                    borderBottom: '1px solid #e2e8f0',
                    borderLeft: `4px solid ${getColor(n.type)}`,
                    background: n.read ? '#fff' : '#f7fafc',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#2d3748' }}>
                    {getIcon(n.type)} {n.text}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: '#a0aec0',
                      textTransform: 'uppercase',
                      marginTop: 4,
                      display: 'flex',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span>{n.type}</span>
                    <span>{formatWhen(n.createdAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
