import axios from 'axios';

const DEFAULT_API_BASE = 'http://localhost:5000/api';
const rawBase =
  process.env.REACT_APP_API_BASE_URL ||
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://church-booking-api.railway.app/api'  // Update this to your deployed backend URL
    : DEFAULT_API_BASE);
const API_BASE_URL = rawBase.endsWith('/api') ? rawBase : `${rawBase.replace(/\/$/, '')}/api`;

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
    list: (params) => api.get('/bookings', { params }),
    slots: () => api.get('/bookings/slots'),
    create: data => api.post('/bookings', data),
    update: (id, data) => api.put(`/bookings/${id}`, data),
    remove: id => api.delete(`/bookings/${id}`)
  },

  bookingRequests: {
    list: (params) => api.get('/booking-requests', { params }),
    my: (params) => api.get('/booking-requests/my', { params }),
    count: (params) => api.get('/booking-requests/count', { params }),
    update: (id, data) => api.put(`/booking-requests/${id}`, data),
    approve: id => api.post(`/booking-requests/${id}/approve`),
    reject: id => api.post(`/booking-requests/${id}/reject`)
  },

  bookingRecords: {
    list: (params) => api.get('/booking-records', { params })
  },

  events: {
    list: (params) => api.get('/events', { params }),
    create: data => api.post('/events', data),
    update: (id, data) => api.put(`/events/${id}`, data),
    remove: id => api.delete(`/events/${id}`)
  },

  calendar: {
    get: () => api.get('/calendar'),
    update: data => api.post('/calendar', data)
  },

  concerns: {
    create: data => api.post('/concerns', data),
    list: (params) => api.get('/concerns', { params }),
    my: (params) => api.get('/concerns/my', { params }),
    count: (params) => api.get('/concerns/count', { params }),
    update: (id, data) => api.put(`/concerns/${id}`, data),
    close: (id) => api.put(`/concerns/${id}/close`),
    delete: (id) => api.delete(`/concerns/${id}`)
  },

  notifications: {
    list: (params) => api.get('/notifications', { params }),
    create: (data) => api.post('/notifications', data),
    markRead: (ids) => api.post('/notifications/read', { ids }),
    delete: (id) => api.delete(`/notifications/${id}`),
    clear: () => api.delete('/notifications')
  },

  users: {
    list: (params) => api.get('/users', { params }),
    updateMe: data => api.put('/users/me', data)
  }
};
