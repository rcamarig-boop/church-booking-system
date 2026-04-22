import React, { useState } from 'react';
import api from './api';
import PageWrapper from './PageWrapper';
import { NAME_MAX_LENGTH, isValidNameValue, sanitizeNameInput } from './inputValidation';

const stone = '#f8f4ec';
const ink = '#1f2a44';
const gold = '#d6ad60';
const mist = '#e7dfcf';
const accentBlue = '#3b5b8a';

const policyCopy = {
  terms: {
    title: 'Terms and Conditions',
    body: [
      'By creating an account, you agree to use the parish booking system only for legitimate church-related requests and personal account management.',
      'You are responsible for keeping your login credentials secure and for the accuracy of the information you submit.',
      'The parish may review, approve, reject, or remove requests or accounts when needed to protect operations, scheduling, or community safety.',
      'Misuse of the platform, including false submissions, abusive behavior, or attempts to disrupt the system, may result in account suspension or removal.'
    ]
  },
  privacy: {
    title: 'Privacy Policy',
    body: [
      'The parish collects the information you provide during registration and booking so staff can manage requests, communicate with you, and maintain parish records.',
      'Your account information is used for scheduling, notifications, support, and administrative review within the church management system.',
      'The parish does not intend to use your personal data for unrelated commercial purposes.',
      'You may contact the parish office if you need help correcting account information or understanding how your data is being used.'
    ]
  }
};

function PasswordVisibilityIcon({ visible }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
      <circle cx="12" cy="12" r="3" />
      {visible && <path d="M4 20 20 4" />}
    </svg>
  );
}

function PolicyModal({ policy, onClose }) {
  if (!policy) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        zIndex: 10000
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 620,
          maxHeight: '80vh',
          overflowY: 'auto',
          background: '#fff',
          borderRadius: 18,
          border: `2px solid ${gold}`,
          boxShadow: '0 24px 60px rgba(15, 23, 42, 0.2)',
          padding: 24
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.2, color: gold, textTransform: 'uppercase', marginBottom: 6 }}>
              Parish Account Policy
            </div>
            <h2 style={{ margin: 0, color: ink, fontSize: 24 }}>{policy.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#6b7280',
              cursor: 'pointer',
              fontSize: 28,
              lineHeight: 1
            }}
          >
            &times;
          </button>
        </div>

        <div style={{ display: 'grid', gap: 12, color: '#4b5563', fontSize: 14, lineHeight: 1.7 }}>
          {policy.body.map((paragraph) => (
            <p key={paragraph} style={{ margin: 0 }}>
              {paragraph}
            </p>
          ))}
        </div>

        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 16px',
              borderRadius: 10,
              border: `1px solid ${gold}`,
              background: gold,
              color: ink,
              cursor: 'pointer',
              fontWeight: 700
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Register({ onLogin, onBack, onGoToLogin }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [registrationMessage, setRegistrationMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);
  const [openPolicy, setOpenPolicy] = useState(null);

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
    if (!acceptedPolicies) {
      setError('Please agree to the Terms and Conditions and Privacy Policy before registering.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await api.auth.register({ name, email, password, inviteCode });
      if (res.data.requiresVerification) {
        setRegistrationMessage(res.data.message || 'Registration successful. Your account is pending admin approval.');
        setRegistrationSuccess(true);
      } else {
        onLogin({ token: res.data.token, user: res.data.user });
      }
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
      <PolicyModal
        policy={openPolicy ? policyCopy[openPolicy] : null}
        onClose={() => setOpenPolicy(null)}
      />
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
            &#10022;
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
            {registrationSuccess ? 'Registration Submitted' : 'Join Our Parish'}
          </h1>

          {registrationSuccess ? (
            <div>
              <div style={{
                fontSize: 48,
                textAlign: 'center',
                marginBottom: 16,
                color: '#22c55e'
              }}>
                &#9993;
              </div>
              <p style={{
                fontSize: 14,
                color: '#374151',
                textAlign: 'center',
                marginBottom: 12,
                lineHeight: 1.6
              }}>
                {registrationMessage || <>Your account for <strong>{email}</strong> is pending admin approval.</>}
              </p>
              <p style={{
                fontSize: 12,
                color: '#6b7280',
                textAlign: 'center',
                marginBottom: 24,
              }}>
                You can log in after an admin or superadmin reviews and approves your member account.
              </p>
              <button
                onClick={onGoToLogin || onBack}
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
            </div>
          ) : (
          <>
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

          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block',
              marginBottom: 6,
              fontSize: 13,
              fontWeight: 600,
              color: ink
            }}>
              Invite Code
            </label>
            <input
              type="text"
              placeholder="Optional member invite code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
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
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6, lineHeight: 1.5 }}>
              Leave blank if you do not have one. Valid invite codes auto-approve member accounts only.
            </div>
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
          <div style={{ marginBottom: 16, position: 'relative' }}>
            <label style={{
              display: 'block',
              marginBottom: 6,
              fontSize: 13,
              fontWeight: 600,
              color: ink
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                style={{
                  width: '100%',
                  padding: '12px 40px 12px 14px',
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
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: ink,
                  fontSize: 16,
                  padding: 0,
                  width: 24,
                  height: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = gold; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = ink; }}
              >
                <PasswordVisibilityIcon visible={showPassword} />
              </button>
            </div>
          </div>

          {/* Confirm Password Input */}
          <div style={{ marginBottom: 24, position: 'relative' }}>
            <label style={{
              display: 'block',
              marginBottom: 6,
              fontSize: 13,
              fontWeight: 600,
              color: ink
            }}>
              Confirm Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                style={{
                  width: '100%',
                  padding: '12px 40px 12px 14px',
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
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: ink,
                  fontSize: 16,
                  padding: 0,
                  width: 24,
                  height: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = gold; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = ink; }}
              >
                <PasswordVisibilityIcon visible={showPassword} />
              </button>
            </div>
          </div>

          <div style={{
            marginBottom: 20,
            padding: '14px 16px',
            borderRadius: 12,
            border: `1.5px solid ${mist}`,
            background: '#faf7f1'
          }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', color: ink, fontSize: 13, lineHeight: 1.6 }}>
              <input
                type="checkbox"
                checked={acceptedPolicies}
                onChange={(e) => setAcceptedPolicies(e.target.checked)}
                style={{ marginTop: 3, accentColor: accentBlue }}
              />
              <span>
                I agree to the{' '}
                <button
                  type="button"
                  onClick={() => setOpenPolicy('terms')}
                  style={{ border: 'none', background: 'none', padding: 0, color: accentBlue, cursor: 'pointer', fontWeight: 700, textDecoration: 'underline' }}
                >
                  Terms and Conditions
                </button>
                {' '}and{' '}
                <button
                  type="button"
                  onClick={() => setOpenPolicy('privacy')}
                  style={{ border: 'none', background: 'none', padding: 0, color: accentBlue, cursor: 'pointer', fontWeight: 700, textDecoration: 'underline' }}
                >
                  Privacy Policy
                </button>
                .
              </span>
            </label>
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
            &#10022; &#10022; &#10022;
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
              &larr; Back to Home
            </button>
          )}
          </>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}

