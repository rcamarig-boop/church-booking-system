import React, { useState } from 'react';
import api from './api';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      const res = await api.login({ 
        email: email.toLowerCase().trim(), 
        password 
      });
      onLogin(res.data.user, res.data.token);
    } catch (e) {
      setErr(e.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <h3>🔐 Login</h3>
      <form onSubmit={submit}>
        <div>
          <label>Email Address</label>
          <input 
            type="email"
            placeholder="your@email.com" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            required 
          />
        </div>
        <div>
          <label>Password</label>
          <input 
            type="password" 
            placeholder="••••••••" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            required 
          />
        </div>
        {err && <div className="error-msg">⚠️ {err}</div>}
        <button type="submit" disabled={loading}>
          {loading ? '🔄 Signing in...' : '🔓 Sign In'}
        </button>
      </form>
    </div>
  );
}
