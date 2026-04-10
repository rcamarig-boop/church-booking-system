import React, { useState } from 'react';

// Quick filters component
export function QuickFilters({ filters, onFilterChange, selected }) {
  return (
    <div style={{
      display: 'flex',
      gap: 8,
      flexWrap: 'wrap',
      padding: '12px 0',
      borderBottom: '1px solid #e5e7eb',
      marginBottom: 12
    }}>
      {filters.map(filter => (
        <button
          key={filter.key}
          onClick={() => onFilterChange(filter.key)}
          style={{
            padding: '8px 12px',
            borderRadius: 6,
            border: selected === filter.key ? '2px solid #3b82f6' : '1px solid #d1d5db',
            background: selected === filter.key ? '#dbeafe' : '#fff',
            color: selected === filter.key ? '#1e40af' : '#4b5563',
            cursor: 'pointer',
            fontWeight: selected === filter.key ? 600 : 500,
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

// Bulk actions toolbar
export function BulkActionsToolbar({ selectedCount, onSelectAll, onClearSelection, actions, isAllSelected }) {
  if (selectedCount === 0) return null;

  return (
    <div style={{
      padding: 12,
      background: 'linear-gradient(135deg, #dbeafe, #93c5fd)',
      borderRadius: 8,
      marginBottom: 12,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      border: '1px solid #60a5fa'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
        <input
          type="checkbox"
          checked={isAllSelected}
          onChange={(e) => e.checked ? onSelectAll() : onClearSelection()}
          style={{ cursor: 'pointer', width: 18, height: 18 }}
        />
        <span style={{ fontWeight: 600, color: '#1e40af' }}>
          {selectedCount} {selectedCount === 1 ? 'item' : 'items'} selected
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {actions.map((action, idx) => (
          <button
            key={idx}
            onClick={action.onClick}
            disabled={action.disabled}
            style={{
              padding: '8px 12px',
              background: action.variant === 'danger' ? '#ef4444' : action.variant === 'success' ? '#22c55e' : '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: action.disabled ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: 13,
              opacity: action.disabled ? 0.6 : 1
            }}
          >
            {action.icon} {action.label}
          </button>
        ))}
        <button
          onClick={onClearSelection}
          style={{
            padding: '8px 12px',
            background: '#e5e7eb',
            color: '#1f2937',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 13
          }}
        >
          Clear
        </button>
      </div>
    </div>
  );
}

// Checkbox for table rows
export function SelectCheckbox({ checked, onChange }) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.checked)}
      style={{
        cursor: 'pointer',
        width: 18,
        height: 18,
        margin: 0
      }}
    />
  );
}

// Loading skeleton
export function LoadingRow({ columnCount = 5 }) {
  return (
    <tr>
      {Array.from({ length: columnCount }).map((_, idx) => (
        <td key={idx} style={{ padding: 8, border: '1px solid #e5e7eb' }}>
          <div style={{
            height: 12,
            background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
            borderRadius: 4,
            backgroundSize: '200% 100%',
            animation: 'loading 1.5s infinite'
          }} />
        </td>
      ))}
    </tr>
  );
}

// Loading spinner
export function LoadingSpinner({ size = 'medium' }) {
  const sizes = {
    small: { size: 24, borderWidth: 2 },
    medium: { size: 48, borderWidth: 4 },
    large: { size: 64, borderWidth: 5 }
  };

  const s = sizes[size] || sizes.medium;

  return (
    <div style={{
      width: s.size,
      height: s.size,
      border: `${s.borderWidth}px solid #e5e7eb`,
      borderTop: `${s.borderWidth}px solid #3b82f6`,
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }} />
  );
}

// Loading skeleton for cards
export function LoadingSkeleton() {
  return (
    <div style={{
      padding: 16,
      background: '#fff',
      borderRadius: 8,
      border: '1px solid #e5e7eb'
    }}>
      <div style={{
        height: 16,
        background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
        borderRadius: 4,
        marginBottom: 12,
        backgroundSize: '200% 100%',
        animation: 'loading 1.5s infinite'
      }} />
      <div style={{
        height: 12,
        background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
        borderRadius: 4,
        marginBottom: 8,
        backgroundSize: '200% 100%',
        animation: 'loading 1.5s infinite'
      }} />
      <div style={{
        height: 12,
        background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
        borderRadius: 4,
        backgroundSize: '200% 100%',
        animation: 'loading 1.5s infinite',
        width: '80%'
      }} />
    </div>
  );
}

// Add animation styles to document
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes loading {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    @keyframes slideIn {
      from { transform: translateX(400px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}
