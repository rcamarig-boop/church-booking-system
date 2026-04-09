import React, { useState } from 'react';
import api from './api';
import PageWrapper from './PageWrapper';
import { NAME_MAX_LENGTH, isValidNameValue, sanitizeNameInput } from './inputValidation';

const stone = '#f8f4ec';
const ink = '#1f2a44';
const gold = '#d6ad60';
const mist = '#e7dfcf';
const accentBlue = '#3b5b8a';

export default function Register({ onLogin, onBack }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    if (!isValidNameValue(name)) {
      setError(`Full name must be ${NAME_MAX_LENGTH} characters or fewer and use letters, spaces, apostrophes, or hyphens only.`);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await api.auth.register({ name, email, password });
      onLogin({ token: res.data.token, user: res.data.user });
    } catch (e) {
      setError(e.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
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
          maxWidth: 480,
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
            Join Our Parish
          </h1>
          <p style={{
            fontSize: 13,
            color: '#6b7280',
            textAlign: 'center',
            marginBottom: 28,
            fontWeight: 500
          }}>
            Create an account to manage your spiritual services
          </p>

          {/* Full Name Input */}
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block',
              marginBottom: 6,
              fontSize: 13,
              fontWeight: 600,
              color: ink
            }}>
              Full Name
            </label>
              <input
              type="text"
              placeholder="John Doe"
              value={name}
              maxLength={NAME_MAX_LENGTH}
              onChange={(e) => setName(sanitizeNameInput(e.target.value))}
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
          <div style={{ marginBottom: 16 }}>
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

          {/* Confirm Password Input */}
          <div style={{ marginBottom: 24 }}>
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

          {/* Error Message */}
          {error && (
            <div style={{
              background: '#fff5f5',
              color: '#b0413e',
              padding: '12px 14px',
              borderRadius: 10,
              marginBottom: 20,
              fontSize: 13,
              border: `1px solid #fdd2d2`,
              fontWeight: 500
            }}>
              {error}
            </div>
          )}

          {/* Register Button */}
          <button
            onClick={submit}
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px 16px',
              fontSize: 15,
              fontWeight: 700,
              borderRadius: 12,
              border: `2px solid ${gold}`,
              background: gold,
              color: ink,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: `0 8px 20px ${gold}30`,
              opacity: loading ? 0.7 : 1
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = `0 12px 24px ${gold}40`;
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = `0 8px 20px ${gold}30`;
            }}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
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
