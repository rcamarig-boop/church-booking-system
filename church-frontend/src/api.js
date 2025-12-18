// api.js
import axios from 'axios';

const API = 'http://localhost:4000/api'; // Change to deployed URL
const client = axios.create({ baseURL: API });

const setToken = (token) => {
  client.defaults.headers.common['Authorization'] = token ? `Bearer ${token}` : '';
};

export default {
  client,
  setToken,
  auth: {
    login: (data) => client.post('/auth/login', data),
    register: (data) => client.post('/auth/register', data)
  },
  bookings: {
    list: () => client.get('/bookings'),
    create: (data) => client.post('/bookings', data),
    cancel: (id) => client.delete(`/bookings/${id}`)
  },
  users: {
    list: () => client.get('/users'),
    delete: (id) => client.delete(`/users/${id}`),
    deleteMe: () => client.delete('/users/me')
  },
  calendar: {
    get: () => client.get('/calendar_config'),
    config: (data) => client.post('/calendar/config', data)
  }
};
