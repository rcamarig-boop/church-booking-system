import axios from 'axios';

const DEFAULT_API_BASE = 'http://localhost:4000/api';
const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL ||
  (process.env.NODE_ENV === 'production' ? '/api' : DEFAULT_API_BASE);

const api = axios.create({
  baseURL: API_BASE_URL
});

export function setToken(token) {
  if (token)
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  else
    delete api.defaults.headers.common.Authorization;
}

export default {
  setToken,

  auth: {
    login: data => api.post('/auth/login', data),
    register: data => api.post('/auth/register', data)
  },

  bookings: {
    list: () => api.get('/bookings'),
    slots: () => api.get('/bookings/slots'),
    create: data => api.post('/bookings', data),
    update: (id, data) => api.put(`/bookings/${id}`, data),
    remove: id => api.delete(`/bookings/${id}`)
  },

  bookingRequests: {
    list: () => api.get('/booking-requests'),
    my: () => api.get('/booking-requests/my'),
    update: (id, data) => api.put(`/booking-requests/${id}`, data),
    approve: id => api.post(`/booking-requests/${id}/approve`),
    reject: id => api.post(`/booking-requests/${id}/reject`)
  },

  bookingRecords: {
    list: () => api.get('/booking-records')
  },

  events: {
    list: () => api.get('/events'),
    create: data => api.post('/events', data),
    update: (id, data) => api.put(`/events/${id}`, data),
    remove: id => api.delete(`/events/${id}`)
  },

  calendar: {
    get: () => api.get('/calendar'),
    update: data => api.post('/calendar', data)
  },

  users: {
    list: () => api.get('/users')
  }
};
