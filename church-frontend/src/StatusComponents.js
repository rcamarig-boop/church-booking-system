import React from 'react';
import { STATUS_COLORS } from './systemConstants';

// Status badge with color coding
export function StatusBadge({ status, label }) {
  const colors = STATUS_COLORS[status?.toLowerCase()] || STATUS_COLORS.pending;

  return (
    <span style={{
      display: 'inline-block',
      padding: '4px 8px',
      background: colors.badge,
      color: '#fff',
      borderRadius: 4,
      fontSize: 12,
      fontWeight: 600,
      whiteSpace: 'nowrap'
    }}>
      {label || status}
    </span>
  );
}

// Status timeline/workflow indicator
export function StatusTimeline({ currentStatus, allStatuses }) {
  const statusOrder = { pending: 1, approved: 2, rejected: 3, cancelled: 4 };
  const currentOrder = statusOrder[currentStatus?.toLowerCase()] || 1;

  return (
    <div style={{
      display: 'flex',
      gap: 0,
      alignItems: 'center',
      fontSize: 11,
      marginTop: 8
    }}>
      {allStatuses.map((status, idx) => {
        const order = statusOrder[status.toLowerCase()];
        const colors = STATUS_COLORS[status.toLowerCase()];
        const isActive = order <= currentOrder;
        const isCurrent = order === currentOrder;

        return (
          <React.Fragment key={status}>
            <div style={{
              padding: '6px 10px',
              background: isActive ? colors.badge : '#e5e7eb',
              color: isActive ? '#fff' : '#6b7280',
              borderRadius: isCurrent ? 6 : 4,
              fontWeight: isCurrent ? 600 : 400,
              minWidth: 70,
              textAlign: 'center',
              fontSize: 11,
              border: isCurrent ? `2px solid ${colors.badge}` : 'none',
              boxShadow: isCurrent ? `0 0 0 2px ${colors.badge}36` : 'none'
            }}>
              {status}
            </div>
            {idx < allStatuses.length - 1 && (
              <div style={{
                width: 12,
                height: 2,
                background: isActive && statusOrder[allStatuses[idx + 1].toLowerCase()] <= currentOrder ? '#22c55e' : '#e5e7eb',
                marginX: 4
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// Permission display component
export function PermissionDisplay({ role }) {
  const permissions = {
    admin: {
      can: ['Approve applications', 'Reject applications', 'Create services', 'Delete services', 'Edit bookings', 'Export reports', 'View all records'],
      cannot: []
    },
    secretary: {
      can: ['Approve applications', 'Reject applications', 'Create services', 'Edit bookings', 'Export reports'],
      cannot: ['Delete services', 'Delete bookings', 'Delete members']
    },
    member: {
      can: ['View my bookings', 'Create applications', 'Edit my own applications', 'Cancel pending applications'],
      cannot: ['Approve applications', 'Create services', 'View other members\' data', 'Export data']
    }
  };

  const userPerms = permissions[role?.toLowerCase()] || permissions.member;

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#1f2937', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
        🔐 <span>Your Permissions ({role})</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#22c55e', marginBottom: 8 }}>✅ You Can:</div>
          <ul style={{ fontSize: 12, color: '#4b5563', margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
            {userPerms.can.map((perm, idx) => <li key={idx}>{perm}</li>)}
          </ul>
        </div>
        {userPerms.cannot.length > 0 && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#ef4444', marginBottom: 8 }}>❌ You Cannot:</div>
            <ul style={{ fontSize: 12, color: '#4b5563', margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
              {userPerms.cannot.map((perm, idx) => <li key={idx}>{perm}</li>)}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// Confirmation dialog with soft warning
export function ConfirmationDialog({ title, message, onConfirm, onCancel, isDangerous = false }) {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10001
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 12,
        padding: 24,
        maxWidth: 450,
        width: '90%',
        boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
      }}>
        <div style={{ marginBottom: 4, fontSize: 24 }}>
          {isDangerous ? '⚠️' : 'ℹ️'}
        </div>
        <h3 style={{ margin: '8px 0', color: '#1f2937', fontSize: 18 }}>
          {title}
        </h3>
        <p style={{ color: '#4b5563', marginTop: 12, marginBottom: 16, lineHeight: 1.6 }}>
          {message}
        </p>

        {isDangerous && (
          <div style={{
            padding: 12,
            background: '#fee2e2',
            borderLeft: '4px solid #ef4444',
            borderRadius: 6,
            marginBottom: 16,
            fontSize: 12,
            color: '#7f1d1d'
          }}>
            <strong>⚠️ Warning:</strong> This action cannot be undone.
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '10px 16px',
              backgroundColor: '#e5e7eb',
              color: '#1f2937',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '10px 16px',
              backgroundColor: isDangerous ? '#ef4444' : '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            {isDangerous ? 'Yes, Delete' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
