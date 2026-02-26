import React, { useState } from 'react';
import api from './api';
import PageWrapper from './PageWrapper';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const submit = async () => {
    try {
      const res = await api.auth.login({ email, password });
      onLogin({ token: res.data.token, user: res.data.user });
    } catch (e) {
      setError(e.response?.data?.error || 'Login failed');
    }
  };

  return (
    <PageWrapper>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ marginBottom: 24 }}>Sign In</h1>

        <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />

        {error && <p style={{ color:'red' }}>{error}</p>}

        <button onClick={submit}>Sign In</button>
      </div>
    </PageWrapper>
  );
}
