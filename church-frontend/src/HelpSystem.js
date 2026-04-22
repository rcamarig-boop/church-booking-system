import React, { useState } from 'react';

export function Tooltip({ children, text, side = 'top' }) {
  const [isVisible, setIsVisible] = useState(false);

  const getPosition = () => {
    switch (side) {
      case 'top': return { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 8 };
      case 'bottom': return { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 8 };
      case 'left': return { right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: 8 };
      case 'right': return { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: 8 };
      default: return { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 8 };
    }
  };

  return (
    <div
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      style={{ position: 'relative', display: 'inline-block' }}
    >
      {children}
      {isVisible && (
        <div
          style={{
            position: 'absolute',
            ...getPosition(),
            background: '#1f2937',
            color: '#fff',
            padding: '8px 12px',
            borderRadius: 6,
            fontSize: 12,
            maxWidth: 250,
            wordWrap: 'break-word',
            zIndex: 9999,
            whiteSpace: 'normal',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
}

export function HelpIcon({ title, description, steps = [] }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Tooltip text="Click for help" side="top">
        <button
          onClick={() => setIsOpen(true)}
          style={{
            background: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '50%',
            width: 28,
            height: 28,
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: 8
          }}
        >
          ?
        </button>
      </Tooltip>

      {isOpen && (
        <HelpModal
          title={title}
          description={description}
          steps={steps}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

function HelpModal({ title, description, steps, onClose }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 24,
          maxWidth: 600,
          width: '90%',
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
          maxHeight: '80vh',
          overflowY: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 16 }}>
          <h2 style={{ margin: 0, color: '#1f2937' }}>&#10067; {title}</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 24,
              cursor: 'pointer',
              color: '#9ca3af'
            }}
          >
            &times;
          </button>
        </div>

        {description && (
          <div style={{ marginBottom: 20, color: '#4b5563', lineHeight: 1.6 }}>
            {description}
          </div>
        )}

        {steps && steps.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <h3 style={{ color: '#374151', marginBottom: 12 }}>Steps:</h3>
            <ol style={{ color: '#4b5563', lineHeight: 1.8, marginLeft: 20 }}>
              {steps.map((step, idx) => (
                <li key={idx} style={{ marginBottom: 8 }}>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}

export function InfoCard({ icon, title, description }) {
  return (
    <div style={{
      padding: 12,
      background: '#dbeafe',
      borderLeft: '4px solid #0284c7',
      borderRadius: 8,
      border: '1px solid #93c5fd',
      marginBottom: 12
    }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'start' }}>
        <div style={{ fontSize: 20, minWidth: 24 }}>{icon}</div>
        <div>
          <div style={{ fontWeight: 600, color: '#1e40af', marginBottom: 4 }}>
            {title}
          </div>
          <div style={{ fontSize: 13, color: '#1e3a8a' }}>
            {description}
          </div>
        </div>
      </div>
    </div>
  );
}
