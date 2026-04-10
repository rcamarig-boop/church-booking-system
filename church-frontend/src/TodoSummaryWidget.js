import React from 'react';

export function TodoSummaryWidget({ pendingRequests, openConcerns, collectiveServices, onNavigate }) {
  const hasItems = pendingRequests > 0 || openConcerns > 0 || collectiveServices > 0;

  if (!hasItems) {
    return (
      <div style={{
        padding: 16,
        background: '#dcfce7',
        borderLeft: '4px solid #22c55e',
        borderRadius: 8,
        border: '1px solid #bbf7d0',
        marginBottom: 12,
        textAlign: 'center',
        color: '#15803d',
        fontWeight: 600
      }}>
        ✅ All caught up! No pending items.
      </div>
    );
  }

  return (
    <div style={{
      padding: 16,
      background: 'linear-gradient(135deg, #fef3c7, #fcd34d)',
      borderLeft: '4px solid #f59e0b',
      borderRadius: 8,
      border: '1px solid #fbbf24',
      marginBottom: 12
    }}>
      <div style={{ fontWeight: 700, marginBottom: 12, color: '#92400e', fontSize: 14 }}>
        📋 Action Required
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
        {pendingRequests > 0 && (
          <button
            onClick={() => onNavigate('requests')}
            style={{
              padding: 12,
              background: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'}
            onMouseLeave={(e) => e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'}
          >
            <div style={{ fontSize: 20, marginBottom: 4 }}>📋</div>
            <div style={{ fontWeight: 700, color: '#ef4444', fontSize: 18, marginBottom: 4 }}>
              {pendingRequests}
            </div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>
              {pendingRequests === 1 ? 'Application' : 'Applications'} Pending
            </div>
          </button>
        )}

        {openConcerns > 0 && (
          <button
            onClick={() => onNavigate('concerns')}
            style={{
              padding: 12,
              background: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'}
            onMouseLeave={(e) => e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'}
          >
            <div style={{ fontSize: 20, marginBottom: 4 }}>💭</div>
            <div style={{ fontWeight: 700, color: '#ef4444', fontSize: 18, marginBottom: 4 }}>
              {openConcerns}
            </div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>
              {openConcerns === 1 ? 'Concern' : 'Concerns'} Open
            </div>
          </button>
        )}

        {collectiveServices > 0 && (
          <button
            onClick={() => onNavigate('analytics')}
            style={{
              padding: 12,
              background: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'}
            onMouseLeave={(e) => e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'}
          >
            <div style={{ fontSize: 20, marginBottom: 4 }}>🎫</div>
            <div style={{ fontWeight: 700, color: '#ef4444', fontSize: 18, marginBottom: 4 }}>
              {collectiveServices}
            </div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>
              {collectiveServices === 1 ? 'Group' : 'Groups'} to Convert
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
