import React, { useState, useEffect } from 'react';
import api from './api';
import PageWrapper from './PageWrapper';

const ink = '#1f2a44';
const gold = '#d6ad60';
const accentBlue = '#3b5b8a';

export default function VerifyEmail({ token, onGoToLogin }) {
  const [status, setStatus] = useState('verifying'); // verifying | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided.');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await api.auth.verifyEmail(token);
        if (!cancelled) {
          setStatus('success');
          setMessage(res.data.message || 'Email verified successfully!');
        }
      } catch (e) {
        if (!cancelled) {
          setStatus('error');
          setMessage(e.response?.data?.error || 'Verification failed. The link may be invalid or expired.');
        }
      }
    })();

    return () => { cancelled = true; };
  }, [token]);

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

          {status === 'verifying' && (
            <>
              <h1 style={{ fontSize: '1.8em', fontWeight: 800, color: ink, marginBottom: 12 }}>
                Verifying Email...
              </h1>
              <p style={{ color: '#6b7280', fontSize: 14 }}>Please wait while we verify your email address.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div style={{ fontSize: 48, marginBottom: 16, color: '#22c55e' }}>✓</div>
              <h1 style={{ fontSize: '1.8em', fontWeight: 800, color: ink, marginBottom: 12 }}>
                Email Verified!
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
          )}

          {status === 'error' && (
            <>
              <div style={{ fontSize: 48, marginBottom: 16, color: '#ef4444' }}>✗</div>
              <h1 style={{ fontSize: '1.8em', fontWeight: 800, color: ink, marginBottom: 12 }}>
                Verification Failed
              </h1>
              <p style={{ color: '#b0413e', fontSize: 14, marginBottom: 24 }}>{message}</p>
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
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
