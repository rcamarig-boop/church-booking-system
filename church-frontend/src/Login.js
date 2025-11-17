import React, { useState } from 'react';
import api from './api';
export default function Login({ onLogin }) {
  const [email,setEmail]=useState(''), [password,setPassword]=useState(''), [err,setErr]=useState(null), [loading, setLoading] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); 
    setErr(null);
    setLoading(true);
    try {
      const res = await api.login({ email: email.toLowerCase().trim(), password });
      onLogin(res.data.user, res.data.token);
    } catch (e) { 
      setErr(e.response?.data?.error || 'Login failed'); 
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="auth-card">
      <h3 style={{ margin:'0 0 24px 0' }}>🔐 Login</h3>
      <form onSubmit={submit}>
        <div style={{ marginBottom:'12px' }}>
          <label>Email Address</label>
          <input placeholder="your@email.com" value={email} onChange={e=>setEmail(e.target.value)} required style={{ width:'100%' }} />
        </div>
        <div style={{ marginBottom:'12px' }}>
          <label>Password</label>
          <input placeholder="••••••••" type="password" value={password} onChange={e=>setPassword(e.target.value)} required style={{ width:'100%' }} />
        </div>
        {err && <div style={{ color:'#e53e3e', background:'#fff5f5', padding:'10px', borderRadius:'6px', marginBottom:'12px', fontSize:'14px', border:'1px solid #fc8181' }}>⚠️ {err}</div>}
        <div style={{ marginTop:'16px' }}>
          <button type="submit" disabled={loading} style={{ width:'100%', padding:'12px', opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>{loading ? '🔄 Signing in...' : '🔓 Sign In'}</button>
        </div>
      </form>
    </div>
  )
}
