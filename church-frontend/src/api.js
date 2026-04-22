import axios from 'axios';

const DEFAULT_API_BASE = 'http://localhost:5000/api';
const DEFAULT_PRODUCTION_APP_URL = 'https://church-booking-system.onrender.com';
const rawBase =
  process.env.REACT_APP_API_BASE_URL ||
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === 'production'
    ? DEFAULT_PRODUCTION_APP_URL
    : DEFAULT_API_BASE);
const API_BASE_URL = rawBase.endsWith('/api') ? rawBase : `${rawBase.replace(/\/$/, '')}/api`;

const api = axios.create({
  baseURL: API_BASE_URL
});

// Retry logic for rate-limited (429) responses
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    if (
      error.response &&
      error.response.status === 429 &&
      config &&
      !config._retryCount
    ) {
      config._retryCount = 0;
    }

    if (
      error.response &&
      error.response.status === 429 &&
      config &&
      config._retryCount < 3
    ) {
      config._retryCount += 1;
      // Use Retry-After header if available, otherwise exponential backoff
      const retryAfter = error.response.headers['retry-after'];
      const delay = retryAfter
        ? Number(retryAfter) * 1000
        : Math.min(1000 * Math.pow(2, config._retryCount - 1), 10000);

      await new Promise((resolve) => setTimeout(resolve, delay));
      return api(config);
    }

    // Attach a user-friendly message for rate limit errors
    if (error.response && error.response.status === 429) {
      error.userMessage =
        'You are making too many requests. Please wait a moment and try again.';
    }

    return Promise.reject(error);
  }
);

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
    usage: () => api.get('/bookings/usage'),
    create: data => api.post('/bookings', data),
    update: (id, data) => api.put(`/bookings/${id}`, data),
    remove: id => api.delete(`/bookings/${id}`)
  },

  bookingRequests: {
    list: (params) => api.get('/booking-requests', { params }),
    my: (params) => api.get('/booking-requests/my', { params }),
    count: (params) => api.get('/booking-requests/count', { params }),
    get: (id) => api.get(`/booking-requests/${id}`),
    update: (id, data) => api.put(`/booking-requests/${id}`, data),
    checkConflicts: (id) => api.get(`/booking-requests/${id}/conflicts`),
    approve: id => api.post(`/booking-requests/${id}/approve`),
    reject: id => api.post(`/booking-requests/${id}/reject`)
  },

  bookingRecords: {
  list: (params) => api.get('/booking-records', { params }),
  delete: (id) => api.delete(`/admin/booking-records/${id}`),
  deleteAll: () => api.delete('/admin/booking-records/all')
  },

  bookingEditProposals: {
    my: () => api.get('/booking-edit-proposals/my'),
    respond: (id, data) => api.post(`/booking-edit-proposals/${id}/respond`, data)
  },

  bookingRequestEditProposals: {
    my: () => api.get('/booking-request-edit-proposals/my'),
    respond: (id, data) => api.post(`/booking-request-edit-proposals/${id}/respond`, data)
  },

  admin: {
  deleteActivityLogs: () => api.delete('/admin/activity-logs'),
  getInviteCodes: () => api.get('/admin/invite-codes'),
  addInviteCode: (code) => api.post('/admin/invite-codes', { code }),
  deleteInviteCode: (code) => api.delete(`/admin/invite-codes/${code}`),
  updateInviteCode: (oldCode, newCode) => api.put(`/admin/invite-codes/${oldCode}`, { newCode })
  },

  events: {
    list: (params) => api.get('/events', { params }),
    create: data => api.post('/events', data),
    update: (id, data) => api.put(`/events/${id}`, data),
    remove: id => api.delete(`/events/${id}`)
  },

  massServices: {
    list: (params) => api.get('/mass-services', { params }),
    create: data => api.post('/mass-services', data),
    update: (id, data) => api.put(`/mass-services/${id}`, data),
    remove: id => api.delete(`/mass-services/${id}`),
    getApplications: (id, params) => api.get(`/mass-services/${id}/applications`, { params }),
    apply: (id, formData) => api.post(`/mass-services/${id}/apply`, { form_data: formData }),
    approveApplication: (appId) => api.post(`/mass-services/applications/${appId}/approve`),
    rejectApplication: (appId, reason) => api.post(`/mass-services/applications/${appId}/reject`, { reason }),
    cancelApplication: (appId, reason) => api.post(`/mass-services/applications/${appId}/cancel`, { reason }),
    getMyApplications: () => api.get('/mass-services/my-applications')
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
    usage: () => api.get('/concerns/usage'),
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
    updateMe: data => api.put('/users/me', data),
    verifyEmail: (id) => api.put(`/users/${id}/verify-email`),
    resetPassword: (id, newPassword) => api.put(`/users/${id}/reset-password`, { newPassword }),
    updateRole: (id, role) => api.put(`/users/${id}/role`, { role }),
    delete: (id) => api.delete(`/users/${id}`)
  }
};
