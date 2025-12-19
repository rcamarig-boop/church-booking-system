import React from 'react';

export default function LandingPage({ onChooseLogin, onChooseRegister }) {
  return (
    <div className="auth-page">
      <div style={{
        textAlign: 'center',
        animation: 'fadeIn 0.6s ease-in',
        width: '100%',
        maxWidth: 900,
        padding: '20px'
      }}>
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{
            fontSize: '2.8em',
            color: '#0f1724',
            margin: '0 0 12px 0',
            fontWeight: 800,
            textShadow: '0 2px 8px rgba(0,0,0,0.25)'
          }}>⛪ Church Booking System</h1>
          <p style={{
            fontSize: '18px',
            color: '#1f2937',
            margin: '0',
            fontWeight: 400,
            textShadow: '0 1px 4px rgba(255,255,255,0.6)'
          }}>Manage your spiritual appointments with ease</p>
        </div>

        <div className="auth-card auth-card--large">
          <h2 style={{
            margin: '0 0 32px 0',
            color: '#2d3748',
            fontSize: '24px'
          }}>Get Started</h2>

          <p style={{
            color: '#718096',
            marginBottom: '32px',
            fontSize: '15px',
            lineHeight: '1.6'
          }}>Choose whether you're a new member or returning to book your appointment.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={onChooseLogin}
              style={{
                padding: '16px 32px',
                fontSize: '16px',
                fontWeight: 600,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 20px rgba(102, 126, 234, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
              }}
            >
              🔐 Sign In
            </button>

            <button
              onClick={onChooseRegister}
              style={{
                padding: '16px 32px',
                fontSize: '16px',
                fontWeight: 600,
                background: 'white',
                color: '#667eea',
                border: '2px solid #667eea',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#f7fafc';
                e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'white';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              📝 Create Account
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
