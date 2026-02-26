import React from 'react';
import PageWrapper from './PageWrapper';

export default function LandingPage({ onChooseLogin, onChooseRegister }) {
  return (
    <PageWrapper>
      <div style={{ textAlign: 'center' }}>
        <header style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: '2.5em', fontWeight: 800, marginBottom: 8 }}>
            ⛪ Church Booking System
          </h1>
          <p style={{ fontSize: '18px', color: '#4a5568' }}>
            Manage your spiritual appointments with ease
          </p>
        </header>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: 24 }}>
          <button
            onClick={onChooseLogin}
            style={{
              padding: '16px 24px',
              fontWeight: 600,
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(135deg,#667eea,#764ba2)',
              color: 'white',
              cursor: 'pointer',
              minWidth: 140
            }}
          >
            🔐 Sign In
          </button>

          <button
            onClick={onChooseRegister}
            style={{
              padding: '16px 24px',
              fontWeight: 600,
              borderRadius: 8,
              border: '2px solid #667eea',
              background: 'white',
              color: '#667eea',
              cursor: 'pointer',
              minWidth: 140
            }}
          >
            📝 Create Account
          </button>
        </div>
      </div>
    </PageWrapper>
  );
}
