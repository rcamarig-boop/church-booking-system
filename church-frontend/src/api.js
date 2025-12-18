import axios from 'axios';

const api = axios.create({
  baseURL: 'https://church-booking-system.onrender.com',
  headers: { 'Content-Type': 'application/json' },
});

export default {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  bookings: {
    list: () => api.get('/bookings'),
    create: (data) => api.post('/bookings', data),
  },
  calendar: {
    get: () => api.get('/calendar'),
  },
  events: {
    list: () => api.get('/events'),
    create: (data) => api.post('/events', data),
    delete: (id) => api.delete(`/events/${id}`),
  },
  users: {
    deleteMe: () => api.delete('/users/me'),
  },
};
