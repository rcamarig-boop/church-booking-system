import React, { useState } from 'react';
import api from './api';
import PageWrapper from './PageWrapper';

const ink = '#1f2a44';
const gold = '#d6ad60';
const mist = '#e7dfcf';
const accentBlue = '#3b5b8a';

export default function ForgotPassword({ onBack }) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      setMessage(null);
      const res = await api.auth.forgotPassword(email);
      setMessage(res.data.message || 'If that email is registered, a reset link has been sent.');
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <PageWrapper>
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        background: `linear-gradient(135deg, rgba(248, 244, 236, 0.95), rgba(255,255,255,0.85))`
      }}>
        <div style={{
          width: '100%',
          maxWidth: 450,
          background: '#fff',
          borderRadius: 20,
          padding: '50px 40px',
          border: `2px solid ${gold}`,
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)'
        }}>
          <div style={{ fontSize: 40, marginBottom: 24, textAlign: 'center', color: gold, letterSpacing: 3 }}>
            ✦
          </div>

          <h1 style={{
            fontSize: '1.8em',
            fontWeight: 800,
            marginBottom: 8,
            color: ink,
            textAlign: 'center',
            letterSpacing: '-1px'
          }}>
            Forgot Password
          </h1>
          <p style={{
            fontSize: 13,
            color: '#6b7280',
            textAlign: 'center',
            marginBottom: 28,
            fontWeight: 500
          }}>
            Enter your email and we'll send you a reset link
          </p>

          {message && (
            <div style={{
              background: '#f0fdf4',
              color: '#166534',
              padding: '12px 14px',
              borderRadius: 10,
              marginBottom: 20,
              fontSize: 13,
              border: '1px solid #bbf7d0',
              fontWeight: 500,
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>✉️</div>
              {message}
            </div>
          )}

          {error && (
            <div style={{
              background: '#fff5f5',
              color: '#b0413e',
              padding: '12px 14px',
              borderRadius: 10,
              marginBottom: 20,
              fontSize: 13,
              border: '1px solid #fdd2d2',
              fontWeight: 500
            }}>
              {error}
            </div>
          )}

          {!message && (
            <>
              <div style={{ marginBottom: 24 }}>
                <label style={{
                  display: 'block',
                  marginBottom: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  color: ink
                }}>
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={handleKeyPress}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    fontSize: 14,
                    borderRadius: 10,
                    border: `1.5px solid ${mist}`,
                    background: '#fafafa',
                    color: ink,
                    transition: 'all 0.2s ease',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = gold;
                    e.target.style.background = '#fff';
                    e.target.style.boxShadow = `0 0 0 3px ${gold}15`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = mist;
                    e.target.style.background = '#fafafa';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  fontSize: 15,
                  fontWeight: 700,
                  borderRadius: 12,
                  border: `2px solid ${accentBlue}`,
                  background: accentBlue,
                  color: '#fff',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: `0 8px 20px ${accentBlue}30`,
                  opacity: loading ? 0.7 : 1,
                  marginBottom: 16
                }}
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </>
          )}

          <div style={{ margin: '16px 0', textAlign: 'center', color: '#d1d5db', fontSize: 12 }}>
            ✦ ✦ ✦
          </div>

          <button
            onClick={onBack}
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 10,
              border: `1.5px solid ${mist}`,
              background: '#f8fafb',
              color: ink,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#fff';
              e.target.style.borderColor = gold;
            }}
            onMouseLeave={(e) => {
              e.target.style.background = '#f8fafb';
              e.target.style.borderColor = mist;
            }}
          >
            ← Back to Login
          </button>
        </div>
      </div>
    </PageWrapper>
  );
}
