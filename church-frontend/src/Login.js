import React, { useState } from 'react';
import api from './api';
import PageWrapper from './PageWrapper';

const stone = '#f8f4ec';
const ink = '#1f2a44';
const gold = '#d6ad60';
const mist = '#e7dfcf';
const accentBlue = '#3b5b8a';

export default function Login({ onLogin, onBack, onForgotPassword }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendMessage, setResendMessage] = useState(null);
  const [resending, setResending] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      setNeedsVerification(false);
      setResendMessage(null);
      const res = await api.auth.login({ email, password });
      onLogin({ token: res.data.token, user: res.data.user });
    } catch (e) {
      const data = e.response?.data;
      if (data?.requiresVerification) {
        setNeedsVerification(true);
        setError(data.error);
      } else {
        setError(data?.error || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      setResending(true);
      setResendMessage(null);
      const res = await api.auth.resendVerification(email);
      setResendMessage(res.data.message || 'Verification email sent!');
    } catch (e) {
      setResendMessage(e.response?.data?.error || 'Failed to resend. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') submit();
  };

  return (
    <PageWrapper>
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        background: `linear-gradient(135deg, rgba(248, 244, 236, 0.95), rgba(255,255,255,0.85)), url('/login-bg.jpg') center/cover no-repeat fixed`
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
          {/* Decorative Symbol */}
          <div style={{
            fontSize: 40,
            marginBottom: 24,
            textAlign: 'center',
            color: gold,
            letterSpacing: 3
          }}>
            ✦
          </div>

          {/* Header */}
          <h1 style={{
            fontSize: '2em',
            fontWeight: 800,
            marginBottom: 8,
            color: ink,
            textAlign: 'center',
            letterSpacing: '-1px'
          }}>
            Welcome Back
          </h1>
          <p style={{
            fontSize: 13,
            color: '#6b7280',
            textAlign: 'center',
            marginBottom: 28,
            fontWeight: 500
          }}>
            Sign in to manage your parish services
          </p>

          {/* Email Input */}
          <div style={{ marginBottom: 16 }}>
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

          {/* Password Input */}
          <div style={{ marginBottom: 24 }}>
            <label style={{
              display: 'block',
              marginBottom: 6,
              fontSize: 13,
              fontWeight: 600,
              color: ink
            }}>
              Password
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

          {/* Forgot Password Link */}
          {onForgotPassword && (
            <div style={{ textAlign: 'right', marginBottom: 16 }}>
              <button
                onClick={onForgotPassword}
                style={{
                  background: 'none',
                  border: 'none',
                  color: accentBlue,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: 'none',
                  padding: 0
                }}
                onMouseEnter={(e) => { e.target.style.textDecoration = 'underline'; }}
                onMouseLeave={(e) => { e.target.style.textDecoration = 'none'; }}
              >
                Forgot Password?
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div style={{
              background: needsVerification ? '#fefce8' : '#fff5f5',
              color: needsVerification ? '#92400e' : '#b0413e',
              padding: '12px 14px',
              borderRadius: 10,
              marginBottom: 20,
              fontSize: 13,
              border: `1px solid ${needsVerification ? '#fde68a' : '#fdd2d2'}`,
              fontWeight: 500
            }}>
              {error}
            </div>
          )}

          {/* Resend Verification */}
          {needsVerification && (
            <div style={{ marginBottom: 20, textAlign: 'center' }}>
              <button
                onClick={handleResendVerification}
                disabled={resending}
                style={{
                  background: 'none',
                  border: 'none',
                  color: accentBlue,
                  cursor: resending ? 'not-allowed' : 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: 'underline',
                  opacity: resending ? 0.6 : 1
                }}
              >
                {resending ? 'Sending...' : 'Resend verification email'}
              </button>
              {resendMessage && (
                <p style={{ fontSize: 12, color: resendMessage.toLowerCase().includes('fail') ? '#b0413e' : '#22c55e', marginTop: 6, fontWeight: 500 }}>
                  {resendMessage}
                </p>
              )}
            </div>
          )}

          {/* Sign In Button */}
          <button
            onClick={submit}
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
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = `0 12px 24px ${accentBlue}40`;
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = `0 8px 20px ${accentBlue}30`;
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          {/* Divider */}
          <div style={{
            margin: '24px 0',
            textAlign: 'center',
            color: '#d1d5db',
            fontSize: 12
          }}>
            ✦ ✦ ✦
          </div>

          {/* Back Button */}
          {onBack && (
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
              ← Back to Home
            </button>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
