import React from 'react';

export function ActivityLogEntry({ action, actor, timestamp, details, type = 'info' }) {
  const getIcon = () => {
    switch (type) {
      case 'approve': return '✅';
      case 'reject': return '❌';
      case 'create': return '➕';
      case 'delete': return '🗑️';
      case 'edit': return '✏️';
      case 'cancel': return '⏹️';
      default: return 'ℹ️';
    }
  };

  const getColor = () => {
    switch (type) {
      case 'approve': return { bg: '#dcfce7', text: '#15803d', border: '#22c55e' };
      case 'reject': return { bg: '#fee2e2', text: '#7f1d1d', border: '#ef4444' };
      case 'create': return { bg: '#dbeafe', text: '#1e3a8a', border: '#3b82f6' };
      case 'delete': return { bg: '#fef3c7', text: '#78350f', border: '#f59e0b' };
      case 'edit': return { bg: '#f3e8ff', text: '#6b21a8', border: '#d946ef' };
      case 'cancel': return { bg: '#f3f4f6', text: '#374151', border: '#9ca3af' };
      default: return { bg: '#dbeafe', text: '#1e3a8a', border: '#3b82f6' };
    }
  };

  const colors = getColor();
  const formattedTime = timestamp ? new Date(timestamp).toLocaleString() : 'Unknown time';

  return (
    <div style={{
      padding: 12,
      background: colors.bg,
      borderLeft: `4px solid ${colors.border}`,
      borderRadius: 6,
      marginBottom: 8,
      border: `1px solid ${colors.border}`,
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start'
    }}>
      <div style={{ fontSize: 18, minWidth: 24 }}>{getIcon()}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, color: colors.text, marginBottom: 4 }}>
          {action}
        </div>
        <div style={{ fontSize: 12, color: colors.text, opacity: 0.8, marginBottom: 4 }}>
          by <strong>{actor || 'System'}</strong>
        </div>
        {details && (
          <div style={{ fontSize: 12, color: colors.text, opacity: 0.75, marginBottom: 4 }}>
            {details}
          </div>
        )}
        <div style={{ fontSize: 11, color: colors.text, opacity: 0.7 }}>
          {formattedTime}
        </div>
      </div>
    </div>
  );
}

export function ActivityLog({ activities, isLoading = false }) {
  if (isLoading) {
    return (
      <div style={{
        padding: 20,
        textAlign: 'center',
        color: '#6b7280'
      }}>
        <div style={{
          display: 'inline-block',
          width: 40,
          height: 40,
          border: '3px solid #e5e7eb',
          borderTop: '3px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <div style={{ marginTop: 12 }}>Loading activity log...</div>
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div style={{
        padding: 20,
        textAlign: 'center',
        color: '#6b7280'
      }}>
        📭 No activities recorded yet.
      </div>
    );
  }

  return (
    <div>
      {activities.map((activity, idx) => (
        <ActivityLogEntry
          key={`${activity.timestamp || 'time'}-${activity.action || 'action'}-${idx}`}
          action={activity.action}
          actor={activity.actor}
          timestamp={activity.timestamp}
          details={activity.details}
          type={activity.type}
        />
      ))}
    </div>
  );
}

export function ActivityFilters({ filters, selected, onSelect }) {
  return (
    <div style={{
      display: 'flex',
      gap: 8,
      flexWrap: 'wrap',
      marginBottom: 12,
      paddingBottom: 12,
      borderBottom: '1px solid #e5e7eb'
    }}>
      {filters.map(filter => (
        <button
          key={filter.type}
          onClick={() => onSelect(filter.type)}
          style={{
            padding: '8px 12px',
            borderRadius: 6,
            border: selected === filter.type ? '2px solid #3b82f6' : '1px solid #d1d5db',
            background: selected === filter.type ? '#dbeafe' : '#fff',
            color: selected === filter.type ? '#1e40af' : '#4b5563',
            cursor: 'pointer',
            fontWeight: selected === filter.type ? 600 : 500,
            fontSize: 13,
            transition: 'all 0.2s ease'
          }}
        >
          {filter.icon} {filter.label}
        </button>
      ))}
    </div>
  );
}
