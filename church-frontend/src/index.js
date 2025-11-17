import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
// set runtime background image so CRA doesn't attempt to resolve public asset in CSS
const fallback = "https://images.unsplash.com/photo-1509395176047-4a66953fd231?auto=format&fit=crop&w=1400&q=80";
const publicBg = (process.env.PUBLIC_URL || '') + '/login-bg.jpg';
document.body.style.backgroundImage = `url('${publicBg}'), url('${fallback}')`;
document.body.style.backgroundPosition = 'center';
document.body.style.backgroundSize = 'cover';
document.body.style.backgroundRepeat = 'no-repeat';
document.body.style.minHeight = '100vh';
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
