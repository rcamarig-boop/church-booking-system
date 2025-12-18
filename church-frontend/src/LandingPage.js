import React from 'react';

export default function LandingPage({ onChooseLogin, onChooseRegister }) {
  return (
    <div className="landing-container">
      <div className="landing-header">
        <h1 className="landing-title">Welcome to Church Booking System</h1>
        <p className="landing-subtitle">Easily manage your appointments and services</p>
      </div>
      <div className="button-group">
        <button className="btn btn-primary" onClick={onChooseLogin}>🔐 Login</button>
        <button className="btn btn-outline" onClick={onChooseRegister}>📝 Register</button>
      </div>
    </div>
  );
}
