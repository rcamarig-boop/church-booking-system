import React from 'react';
import PageWrapper from './PageWrapper';

export default function LandingPage({ onChooseLogin, onChooseRegister }) {
  return (
    <PageWrapper>
      <div className="landing-shell">
        <header style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: '2.5em', fontWeight: 800, marginBottom: 8 }}>
            Church Booking System
          </h1>
          <p style={{ fontSize: '18px', color: '#4a5568' }}>
            Manage your spiritual appointments with ease
          </p>
        </header>

        <div className="landing-actions">
          <button onClick={onChooseLogin} className="landing-primary-btn">
            Sign In
          </button>

          <button onClick={onChooseRegister} className="landing-secondary-btn">
            Create Account
          </button>
        </div>
      </div>
    </PageWrapper>
  );
}
