import React, { useEffect, useMemo, useState } from 'react';

const palette = {
  gold: '#d6ad60',
  deepGold: '#c28f3d',
  wine: '#b0413e',
  ink: '#1f2a44',
  blue: '#3b5b8a',
  stone: '#f8f4ec',
};

export default function NotificationCenter({
  items,
  onMarkRead,
  onMarkAllRead,
  onClearAll,
  onDelete,
  onLoadMore,
  hasMore
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const update = () => setIsNarrow(window.innerWidth <= 520);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const unreadCount = useMemo(
    () => items.reduce((count, n) => count + (n.read ? 0 : 1), 0),
    [items]
  );

  const getIcon = (type) => {
    const icons = {
      new_booking: '✚',
      deleted: '✕',
      config: 'ℹ',
      event_soon: '⏰',
      success: '✓',
      info: '✦'
    };
    return icons[type] || '✶';
  };

  const getColor = (type) => {
    const colors = {
      new_booking: palette.blue,
      deleted: palette.wine,
      config: palette.gold,
      info: palette.blue,
      success: '#2f855a'
    };
    return colors[type] || '#6b7280';
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

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  return (
    <div style={{
      position: 'fixed',
      bottom: isNarrow ? 12 : 20,
      right: isNarrow ? 12 : 20,
      left: 'auto',
      zIndex: 999
    }}>
      <button
        onClick={() => {
          const next = !isOpen;
          setIsOpen(next);
          if (next && unreadCount > 0) {
            onMarkAllRead?.();
          }
        }}
        style={{
          width: isNarrow ? 52 : 60,
          height: isNarrow ? 52 : 60,
          borderRadius: '50%',
          border: 'none',
          background: palette.gold,
          backgroundImage: `linear-gradient(135deg, ${palette.gold}, ${palette.deepGold})`,
          color: palette.ink,
          fontSize: 24,
          cursor: 'pointer',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}
        aria-label="Open parish notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -6,
              right: -6,
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: palette.wine,
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
        <>
          <div
            aria-hidden="true"
            onClick={() => setIsOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'transparent',
              zIndex: 998
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: isNarrow ? 68 : 80,
              right: 0,
              width: isNarrow ? 'min(360px, calc(100vw - 24px))' : 360,
              maxWidth: 'calc(100vw - 24px)',
              maxHeight: '70vh',
              background: '#fff',
              borderRadius: 12,
              boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 999
            }}
            onClick={(e) => e.stopPropagation()}
          >
          <div
            style={{
              padding: 14,
              borderBottom: '1px solid #e2e8f0',
              fontWeight: 600,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 10,
              flexWrap: isNarrow ? 'wrap' : 'nowrap',
              color: palette.ink
            }}
          >
            <span>Parish Notifications ({items.length})</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: isNarrow ? 'flex-start' : 'flex-end' }}>
              <button
                onClick={() => onMarkAllRead?.()}
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  color: palette.blue,
                  padding: 0
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
                  color: palette.wine,
                  padding: 0
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
                ×
              </button>
            </div>
          </div>

          {items.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#a0aec0', fontSize: 14 }}>
              No notifications
            </div>
          ) : (
            <>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {items.map((n) => (
                  <li
                    key={n.id}
                    onClick={() => onMarkRead?.(n.id)}
                    style={{
                      padding: 12,
                      borderBottom: '1px solid #e2e8f0',
                      borderLeft: `4px solid ${getColor(n.type)}`,
                      background: n.read ? '#fff' : palette.stone,
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: palette.ink }}>
                        {getIcon(n.type)} {n.text}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete?.(n.id);
                        }}
                        aria-label="Delete notification"
                      style={{
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        color: palette.wine,
                        fontSize: 14,
                        padding: 0
                      }}
                    >
                        ×
                      </button>
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: '#a0aec0',
                        textTransform: 'uppercase',
                        marginTop: 4,
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 8,
                        flexWrap: 'wrap'
                      }}
                    >
                      <span>{n.type}</span>
                      <span>{formatWhen(n.createdAt)}</span>
                    </div>
                  </li>
                ))}
              </ul>
              {hasMore && (
                <button
                  onClick={() => onLoadMore?.()}
                  style={{
                    width: '100%',
                    padding: 10,
                    border: 'none',
                    background: '#f7fafc',
                    color: palette.blue,
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Load older
                </button>
              )}
            </>
          )}
          </div>
        </>
      )}
    </div>
  );
}
