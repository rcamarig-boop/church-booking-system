import React, { useState } from 'react';
import api from './api';
import PageWrapper from './PageWrapper';

const ink = '#1f2a44';
const gold = '#d6ad60';
const mist = '#e7dfcf';
const accentBlue = '#3b5b8a';

export default function ResetPassword({ token, onGoToLogin }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!password.trim() || !confirmPassword.trim()) {
      setError('Please fill in both fields');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await api.auth.resetPassword(token, password);
      setMessage(res.data.message || 'Password has been reset successfully!');
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to reset password. The link may be invalid or expired.');
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
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 40, marginBottom: 24, color: gold, letterSpacing: 3 }}>
            ✦
          </div>

          {message ? (
            <>
              <div style={{ fontSize: 48, marginBottom: 16, color: '#22c55e' }}>✓</div>
              <h1 style={{ fontSize: '1.8em', fontWeight: 800, color: ink, marginBottom: 12 }}>
                Password Reset!
              </h1>
              <p style={{ color: '#374151', fontSize: 14, marginBottom: 24 }}>{message}</p>
              <button
                onClick={onGoToLogin}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  fontSize: 15,
                  fontWeight: 700,
                  borderRadius: 12,
                  border: `2px solid ${accentBlue}`,
                  background: accentBlue,
                  color: '#fff',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
              >
                Go to Login
              </button>
            </>
          ) : (
            <>
              <h1 style={{
                fontSize: '1.8em',
                fontWeight: 800,
                marginBottom: 8,
                color: ink,
                letterSpacing: '-1px'
              }}>
                Set New Password
              </h1>
              <p style={{
                fontSize: 13,
                color: '#6b7280',
                marginBottom: 28,
                fontWeight: 500
              }}>
                Enter your new password below
              </p>

              {error && (
                <div style={{
                  background: '#fff5f5',
                  color: '#b0413e',
                  padding: '12px 14px',
                  borderRadius: 10,
                  marginBottom: 20,
                  fontSize: 13,
                  border: '1px solid #fdd2d2',
                  fontWeight: 500,
                  textAlign: 'left'
                }}>
                  {error}
                </div>
              )}

              <div style={{ marginBottom: 16, textAlign: 'left' }}>
                <label style={{
                  display: 'block',
                  marginBottom: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  color: ink
                }}>
                  New Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

              <div style={{ marginBottom: 24, textAlign: 'left' }}>
                <label style={{
                  display: 'block',
                  marginBottom: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  color: ink
                }}>
                  Confirm Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                  opacity: loading ? 0.7 : 1
                }}
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
