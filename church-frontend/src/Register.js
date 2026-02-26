import React, { useState } from 'react';
import api from './api';
import PageWrapper from './PageWrapper';

export default function Register({ onLogin }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const submit = async () => {
    try {
      const res = await api.auth.register({ name, email, password });
      onLogin({ token: res.data.token, user: res.data.user });
    } catch (e) {
      setError(e.response?.data?.error || 'Register failed');
    }
  };

  return (
    <PageWrapper>
      <div style={{ textAlign:'center' }}>
        <h1>Create Account</h1>
        <input placeholder="Name" value={name} onChange={e=>setName(e.target.value)} />
        <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
        {error && <p style={{color:'red'}}>{error}</p>}
        <button onClick={submit}>Register</button>
      </div>
    </PageWrapper>
  );
}
