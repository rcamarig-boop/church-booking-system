import React, { useState } from 'react';
import api from './api';

export default function Register({ onRegister }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      const res = await api.register({ 
        name, 
        email: email.toLowerCase().trim(), 
        password: pass 
      });

      // If backend returns token, use it. Otherwise just user.
      onRegister(res.data.user, res.data.token || null);
    } catch (e) {
      setErr(e.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <h3>📝 Create Your Account</h3>
      <form onSubmit={submit}>
        <div>
          <label>Full Name</label>
          <input 
            placeholder="John Doe" 
            value={name} 
            onChange={e => setName(e.target.value)} 
            required 
          />
        </div>
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
            value={pass} 
            onChange={e => setPass(e.target.value)} 
            required 
          />
        </div>
        {err && <div className="error-msg">⚠️ {err}</div>}
        <button type="submit" disabled={loading}>
          {loading ? '⏳ Creating account...' : '✨ Create Account'}
        </button>
      </form>
    </div>
  );
}
