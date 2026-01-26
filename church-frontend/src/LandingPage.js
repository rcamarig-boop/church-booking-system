import React from 'react';

export default function LandingPage({ onChooseLogin, onChooseRegister }) {
  return (
    <div className="auth-page">
      <div className="landing-container">
        <header className="landing-header">
          <h1 className="landing-title">⛪ Church Booking System</h1>
          <p className="landing-subtitle">
            Manage your spiritual appointments with ease
          </p>
        </header>

        <div className="auth-card auth-card--large">
          <h2 className="card-title">Get Started</h2>

          <p className="card-description">
            Choose whether you're a new member or returning to book your appointment.
          </p>

          <div className="button-group">
            <button
              className="btn btn-primary"
              onClick={onChooseLogin}
            >
              🔐 Sign In
            </button>

            <button
              className="btn btn-outline"
              onClick={onChooseRegister}
            >
              📝 Create Account
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .auth-page {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: #f7fafc;
        }

        .landing-container {
          text-align: center;
          width: 100%;
          max-width: 900px;
          padding: 20px;
          animation: fadeIn 0.6s ease-in;
        }

        .landing-header {
          margin-bottom: 40px;
        }

        .landing-title {
          font-size: 2.8em;
          font-weight: 800;
          color: #0f1724;
          margin-bottom: 12px;
        }

        .landing-subtitle {
          font-size: 18px;
          color: #1f2937;
        }

        .auth-card {
          background: white;
          padding: 32px;
          border-radius: 12px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.08);
        }

        .card-title {
          font-size: 24px;
          margin-bottom: 20px;
        }

        .card-description {
          font-size: 15px;
          color: #718096;
          margin-bottom: 32px;
        }

        .button-group {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .btn {
          padding: 16px;
          font-size: 16px;
          font-weight: 600;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-primary {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          border: none;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
        }

        .btn-outline {
          background: white;
          color: #667eea;
          border: 2px solid #667eea;
        }

        .btn-outline:hover {
          background: #f7fafc;
        }

        /* 📱 Mobile */
        @media (max-width: 640px) {
          .landing-title {
            font-size: 2.1em;
          }

          .landing-subtitle {
            font-size: 15px;
          }

          .auth-card {
            padding: 20px;
          }

          .btn {
            width: 100%;
            padding: 14px;
          }
        }

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
