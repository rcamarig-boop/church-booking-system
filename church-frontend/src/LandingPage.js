import React from 'react';

export default function LandingPage({ onChooseLogin, onChooseRegister }) {
  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1>⛪ Church Booking System</h1>
          <p>Manage your spiritual appointments with ease</p>
        </div>

        <div className="auth-card">
          <h2>Get Started</h2>
          <p>Choose whether you're a new member or returning to book your appointment.</p>

          <div className="auth-actions">
            <button className="btn-login" onClick={onChooseLogin}>
              🔐 Sign In
            </button>
            <button className="btn-register" onClick={onChooseRegister}>
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
          min-height: 100vh;   /* full screen height */
          background: #f9fafb;
          animation: fadeIn 0.6s ease-in;
        }

        .auth-container {
          text-align: center;
          width: 100%;
          max-width: 900px;
          padding: 20px;
        }

        .auth-header h1 {
          font-size: 2.8em;
          color: #0f1724;
          margin-bottom: 12px;
          font-weight: 800;
          text-shadow: 0 2px 8px rgba(0,0,0,0.25);
        }

        .auth-header p {
          font-size: 18px;
          color: #1f2937;
          margin: 0;
          font-weight: 400;
          text-shadow: 0 1px 4px rgba(255,255,255,0.6);
        }

        .auth-card {
          margin-top: 40px;
          padding: 20px;
        }

        .auth-card h2 {
          margin-bottom: 32px;
          color: #2d3748;
          font-size: 24px;
        }

        .auth-card p {
          color: #718096;
          margin-bottom: 32px;
          font-size: 15px;
          line-height: 1.6;
        }

        .auth-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .btn-login {
          padding: 16px 32px;
          font-size: 16px;
          font-weight: 600;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .btn-login:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(102, 126, 234, 0.6);
        }

        .btn-register {
          padding: 16px 32px;
          font-size: 16px;
          font-weight: 600;
          background: white;
          color: #667eea;
          border: 2px solid #667eea;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-register:hover {
          background: #f7fafc;
          transform: translateY(-2px);
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
