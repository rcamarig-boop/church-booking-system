import axios from 'axios';
const API = 'http://localhost:4000/api';
const client = axios.create({ baseURL: API });
export default {
  setToken: (t) => { client.defaults.headers.common['Authorization'] = t ? `Bearer ${t}` : ''; },
  client,
  login: (data) => client.post('/auth/login', data),
  register: (data) => client.post('/auth/register', data),
  bookings: {
    list: () => client.get('/bookings'),
    create: (data) => client.post('/bookings', data),
    delete: (id) => client.delete(`/bookings/${id}`)
  },
  bookingRequests: {
    submit: (data) => client.post('/booking-requests', data),
    list: () => client.get('/booking-requests'),
    approve: (id) => client.patch(`/booking-requests/${id}`, { status: 'approved' }),
    reject: (id) => client.patch(`/booking-requests/${id}`, { status: 'rejected' })
  },
  calendar: {
    get: () => client.get('/calendar'),
    config: (d) => client.post('/calendar/config', d)
  },
  events: {
    list: () => client.get('/events'),
    create: (data) => client.post('/events', data),
    delete: (id) => client.delete(`/events/${id}`)
  },
  users: { 
    list: () => client.get('/users'),
    delete: (id) => client.delete(`/users/${id}`),
    deleteMe: () => client.delete('/users/me')
  }
};
