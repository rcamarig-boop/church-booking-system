import React from 'react';
import PageWrapper from './PageWrapper';

const stone = '#f8f4ec';
const ink = '#1f2a44';
const gold = '#d6ad60';
const mist = '#e7dfcf';
const accentBlue = '#3b5b8a';
const sacredRed = '#8b3a3a';

export default function LandingPage({ onChooseLogin, onChooseRegister }) {
  return (
    <PageWrapper>
      <div className="landing-page-shell" style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        background: `linear-gradient(135deg, rgba(139, 58, 58, 0.05), rgba(214, 173, 96, 0.08)), linear-gradient(180deg, rgba(248, 244, 236, 0.95), rgba(255,255,255,0.85))`
      }}>
        <div className="landing-card" style={{
          width: '100%',
          maxWidth: 700,
          background: '#fff',
          borderRadius: 24,
          padding: '60px 45px',
          border: `2px solid ${gold}`,
          boxShadow: '0 25px 70px rgba(0,0,0,0.12)',
          textAlign: 'center'
        }}>
          {/* Sacred Cross Symbol */}
          <div className="landing-cross" style={{
            fontSize: 64,
            marginBottom: 16,
            color: sacredRed,
            letterSpacing: 2,
            fontWeight: 300,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
          }}>
            ✚
          </div>

          {/* Header Section */}
          <header className="landing-header" style={{ marginBottom: 36 }}>
            <h1 style={{
              fontSize: '3.2em',
              fontWeight: 800,
              marginBottom: 12,
              color: sacredRed,
              letterSpacing: '2px',
              textTransform: 'uppercase',
              lineHeight: 1.2
            }}>
              CRAMS
            </h1>
            <p style={{
              fontSize: '15px',
              color: '#6b7280',
              fontWeight: 500,
              marginBottom: 12,
              letterSpacing: '0.5px'
            }}>
              Church Reservations and Management System
            </p>
            <p style={{
              fontSize: '14px',
              color: ink,
              fontWeight: 500,
              marginBottom: 12
            }}>
              Serving Our Congregation with Devotion & Faithfulness
            </p>

            {/* Inspirational Quote */}
            <div className="landing-quote" style={{
              background: `linear-gradient(135deg, ${stone}50, ${mist}40)`,
              borderLeft: `5px solid ${gold}`,
              borderRight: `5px solid ${gold}`,
              padding: '18px 18px',
              borderRadius: 12,
              marginTop: 18,
              color: ink,
              fontStyle: 'italic',
              fontSize: 14,
              lineHeight: 1.7,
              fontWeight: 500
            }}>
              "Come to me, all you who are weary and burdened, and I will give you rest."
              <br />
              <strong style={{ fontSize: 12, fontStyle: 'normal', color: sacredRed }}>— Matthew 11:28</strong>
            </div>
          </header>

          {/* Feature Cards */}
          <div className="landing-features" style={{
            display: 'grid',
            gap: 14,
            marginBottom: 36
          }}>
            <div className="landing-feature-card" style={{
              background: `linear-gradient(135deg, ${stone}70, ${mist}50)`,
              padding: '16px 18px',
              borderRadius: 14,
              border: `1px solid ${gold}40`,
              fontSize: 14,
              color: ink,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}>
              <span style={{ fontSize: 28 }}>⛪</span>
              <span><strong>Sacred Services:</strong> Book confessions, baptisms, counseling, and pastoral visits</span>
            </div>

            <div className="landing-feature-card" style={{
              background: `linear-gradient(135deg, ${stone}70, ${mist}50)`,
              padding: '16px 18px',
              borderRadius: 14,
              border: `1px solid ${gold}40`,
              fontSize: 14,
              color: ink,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}>
              <span style={{ fontSize: 28 }}>🙏</span>
              <span><strong>Spiritual Guidance:</strong> Connect with clergy for prayers, blessings, and ministry</span>
            </div>

            <div className="landing-feature-card" style={{
              background: `linear-gradient(135deg, ${stone}70, ${mist}50)`,
              padding: '16px 18px',
              borderRadius: 14,
              border: `1px solid ${gold}40`,
              fontSize: 14,
              color: ink,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}>
              <span style={{ fontSize: 28 }}>💌</span>
              <span><strong>Parish Updates:</strong> Stay connected with church events and announcements</span>
            </div>

            <div className="landing-feature-card" style={{
              background: `linear-gradient(135deg, ${stone}70, ${mist}50)`,
              padding: '16px 18px',
              borderRadius: 14,
              border: `1px solid ${gold}40`,
              fontSize: 14,
              color: ink,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}>
              <span style={{ fontSize: 28 }}>👨‍👩‍👧‍👦</span>
              <span><strong>Community Fellowship:</strong> Strengthen bonds with your church family</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="landing-actions" style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 14,
            marginBottom: 24
          }}>
            <button
              onClick={onChooseLogin}
              className="landing-primary-btn"
              style={{
                padding: '15px 24px',
                fontSize: 15,
                fontWeight: 700,
                borderRadius: 12,
                border: `2px solid ${sacredRed}`,
                background: sacredRed,
                color: '#fff',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: `0 8px 20px ${sacredRed}30`,
                textTransform: 'uppercase',
                letterSpacing: 0.5
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-3px)';
                e.target.style.boxShadow = `0 12px 28px ${sacredRed}40`;
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = `0 8px 20px ${sacredRed}30`;
              }}
            >
              Sign In
            </button>

            <button
              onClick={onChooseRegister}
              className="landing-secondary-btn"
              style={{
                padding: '15px 24px',
                fontSize: 15,
                fontWeight: 700,
                borderRadius: 12,
                border: `2px solid ${gold}`,
                background: gold,
                color: ink,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: `0 8px 20px ${gold}30`,
                textTransform: 'uppercase',
                letterSpacing: 0.5
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-3px)';
                e.target.style.boxShadow = `0 12px 28px ${gold}40`;
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = `0 8px 20px ${gold}30`;
              }}
            >
              Join Us
            </button>
          </div>

          {/* Footer Text */}
          <div className="landing-footer" style={{
            fontSize: 13,
            color: '#6b7280',
            borderTop: `2px solid ${mist}`,
            paddingTop: 18,
            lineHeight: 1.8,
            fontWeight: 500
          }}>
            Bring your faith and community together.
            <br />
            <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 400 }}>
              Secure • Trustworthy • Serving the Body of Christ
            </span>
          </div>

          {/* Decorative Divider */}
          <div style={{
            marginTop: 18,
            fontSize: 24,
            color: gold,
            letterSpacing: 8,
            fontWeight: 300
          }}>
            ✦
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
