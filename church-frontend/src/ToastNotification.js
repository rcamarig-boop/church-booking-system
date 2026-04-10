import React, { useState, useCallback } from 'react';

// Toast context for global notifications
export const ToastContext = React.createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now();
    const newToast = { id, message, type, duration };
    
    setToasts(prev => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, onRemove }) {
  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      right: 20,
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }}>
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

function Toast({ toast, onRemove }) {
  const getStyle = () => {
    const baseStyle = {
      padding: '14px 16px',
      borderRadius: 8,
      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      maxWidth: 400,
      fontWeight: 500,
      fontSize: 14,
      display: 'flex',
      gap: 10,
      alignItems: 'center',
      cursor: 'pointer',
      animation: 'slideIn 0.3s ease',
      transition: 'all 0.3s ease'
    };

    switch (toast.type) {
      case 'success':
        return { ...baseStyle, background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' };
      case 'error':
        return { ...baseStyle, background: '#fee2e2', color: '#7f1d1d', border: '1px solid #fecaca' };
      case 'warning':
        return { ...baseStyle, background: '#fef3c7', color: '#78350f', border: '1px solid #fcd34d' };
      case 'info':
      default:
        return { ...baseStyle, background: '#dbeafe', color: '#1e3a8a', border: '1px solid #93c5fd' };
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '👋';
    }
  };

  return (
    <div
      style={getStyle()}
      onClick={() => onRemove(toast.id)}
    >
      <span style={{ fontSize: 16 }}>{getIcon()}</span>
      <span>{toast.message}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(toast.id);
        }}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: 18,
          marginLeft: 'auto',
          opacity: 0.6,
          padding: 0
        }}
      >
        ✕
      </button>
    </div>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
