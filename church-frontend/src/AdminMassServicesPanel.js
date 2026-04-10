import React, { useEffect, useState, useCallback } from 'react';
import api from './api';
import { isAllowedBookingTime, isBookingDateWithinSixMonths } from './inputValidation';

const SERVICE_TYPES = ['Baptism', 'Wedding', 'Funeral', 'Christening', 'Blessing','Pastoral Visits', 'Confessions', 'Counseling'];
const CHAPEL_OPTIONS = ['Main Chapel', 'Side Chapel #1'];

const th = {
  padding: 10,
  border: '1px solid #e5e7eb',
  textAlign: 'left',
  background: '#f9fafb',
  fontWeight: 600,
};

const td = {
  padding: 10,
  border: '1px solid #e5e7eb',
};

export default function AdminMassServicesPanel() {
  const [massServices, setMassServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creatingService, setCreatingService] = useState(false);
  const [createError, setCreateError] = useState('');
  
  // Create form
  const [formServiceType, setFormServiceType] = useState(SERVICE_TYPES[0]);
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('10:00');
  const [formDescription, setFormDescription] = useState('');
  const [formChapel, setFormChapel] = useState(CHAPEL_OPTIONS[0]);
  const [formCapacity, setFormCapacity] = useState('');

  // Manage applications modal
  const [selectedService, setSelectedService] = useState(null);
  const [applications, setApplications] = useState([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [appModalOpen, setAppModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingAppId, setRejectingAppId] = useState(null);

  const loadMassServices = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.massServices.list({ filter: 'upcoming' });
      setMassServices(res.data || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load mass services');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMassServices();
  }, [loadMassServices]);

  const handleCreateService = async () => {
    try {
      setCreateError('');
      if (!formDate) {
        setCreateError('Date is required');
        return;
      }
      if (!isBookingDateWithinSixMonths(formDate)) {
        setCreateError('Date must be between tomorrow and 6 months ahead');
        return;
      }
      if (!isAllowedBookingTime(formTime)) {
        setCreateError('Time must be between 8:00 AM and 6:00 PM');
        return;
      }

      setCreatingService(true);
      await api.massServices.create({
        service_type: formServiceType,
        date: formDate,
        time: formTime,
        description: formDescription.trim(),
        chapel: formChapel,
        capacity: formCapacity ? Number(formCapacity) : null
      });

      // Reset form
      setFormServiceType(SERVICE_TYPES[0]);
      setFormDate('');
      setFormTime('10:00');
      setFormDescription('');
      setFormChapel(CHAPEL_OPTIONS[0]);
      setFormCapacity('');

      loadMassServices();
    } catch (err) {
      setCreateError(err.response?.data?.error || 'Failed to create mass service');
    } finally {
      setCreatingService(false);
    }
  };

  const loadApplications = async (service) => {
    try {
      setApplicationsLoading(true);
      const res = await api.massServices.getApplications(service.id);
      setApplications(res.data || []);
      setSelectedService(service);
      setAppModalOpen(true);
    } catch (err) {
      alert('Failed to load applications: ' + (err.response?.data?.error || err.message));
    } finally {
      setApplicationsLoading(false);
    }
  };

  const handleApproveApplication = async (appId) => {
    if (!window.confirm('Approve this application?')) return;
    try {
      await api.massServices.approveApplication(appId);
      loadApplications(selectedService); // Refresh
    } catch (err) {
      alert('Failed to approve: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleRejectApplication = async (appId) => {
    if (!rejectReason.trim() && !window.confirm('No reason provided. Reject anyway?')) return;
    try {
      await api.massServices.rejectApplication(appId, rejectReason.trim());
      setRejectingAppId(null);
      setRejectReason('');
      loadApplications(selectedService); // Refresh
    } catch (err) {
      alert('Failed to reject: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteService = async (serviceId) => {
    if (!window.confirm('Delete this mass service? This will also delete all associated applications.')) return;
    try {
      await api.massServices.remove(serviceId);
      loadMassServices();
    } catch (err) {
      alert('Failed to delete: ' + (err.response?.data?.error || err.message));
    }
  };

  if (loading) return <div>Loading mass services...</div>;

  return (
    <div>
      <h2 style={{ color: '#1f2937', marginBottom: 16, fontWeight: 800 }}>Mass Services Management</h2>

      {/* Create Service Form */}
      <div style={{
        marginBottom: 30,
        padding: 16,
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        backgroundColor: '#f9fafb'
      }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#1f2937' }}>Create New Mass Service</h3>
        
        {createError && (
          <div style={{
            marginBottom: 12,
            padding: 12,
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            borderRadius: 6,
            fontSize: 14
          }}>
            {createError}
          </div>
        )}

        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 14 }}>Service Type</label>
            <select
              value={formServiceType}
              onChange={e => setFormServiceType(e.target.value)}
              style={{
                width: '100%',
                padding: 8,
                border: '1px solid #d1d5db',
                borderRadius: 6,
                fontSize: 14
              }}
            >
              {SERVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 14 }}>Date</label>
            <input
              type="date"
              value={formDate}
              onChange={e => setFormDate(e.target.value)}
              style={{
                width: '100%',
                padding: 8,
                border: '1px solid #d1d5db',
                borderRadius: 6,
                fontSize: 14
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 14 }}>Time</label>
            <input
              type="time"
              value={formTime}
              onChange={e => setFormTime(e.target.value)}
              step="1800"
              min="08:00"
              max="18:00"
              style={{
                width: '100%',
                padding: 8,
                border: '1px solid #d1d5db',
                borderRadius: 6,
                fontSize: 14
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 14 }}>Chapel</label>
            <select
              value={formChapel}
              onChange={e => setFormChapel(e.target.value)}
              style={{
                width: '100%',
                padding: 8,
                border: '1px solid #d1d5db',
                borderRadius: 6,
                fontSize: 14
              }}
            >
              {CHAPEL_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 14 }}>Capacity (optional)</label>
            <input
              type="number"
              value={formCapacity}
              onChange={e => setFormCapacity(e.target.value)}
              min="1"
              style={{
                width: '100%',
                padding: 8,
                border: '1px solid #d1d5db',
                borderRadius: 6,
                fontSize: 14
              }}
              placeholder="e.g. 10"
            />
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 14 }}>Description (optional)</label>
            <textarea
              value={formDescription}
              onChange={e => setFormDescription(e.target.value)}
              style={{
                width: '100%',
                padding: 8,
                border: '1px solid #d1d5db',
                borderRadius: 6,
                fontSize: 14,
                minHeight: 60,
                fontFamily: 'inherit'
              }}
              placeholder="Service details..."
            />
          </div>
        </div>

        <button
          onClick={handleCreateService}
          disabled={creatingService}
          style={{
            marginTop: 12,
            padding: '10px 20px',
            backgroundColor: creatingService ? '#9ca3af' : '#0284c7',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: creatingService ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            fontSize: 14
          }}
        >
          {creatingService ? 'Creating...' : 'Create Mass Service'}
        </button>
      </div>

      {/* Mass Services List */}
      <div>
        <h3 style={{ marginBottom: 12, color: '#1f2937' }}>Upcoming Mass Services</h3>

        {error && (
          <div style={{
            marginBottom: 12,
            padding: 12,
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            borderRadius: 6
          }}>
            {error}
          </div>
        )}

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 30 }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb' }}>
              <th style={th}>ID</th>
              <th style={th}>Service Type</th>
              <th style={th}>Date</th>
              <th style={th}>Time</th>
              <th style={th}>Chapel</th>
              <th style={th}>Capacity</th>
              <th style={th}>Applications</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {massServices.map(service => (
              <tr key={service.id}>
                <td style={td}>{service.id}</td>
                <td style={td}>{service.service_type}</td>
                <td style={td}>{service.date}</td>
                <td style={td}>{service.time}</td>
                <td style={td}>{service.chapel}</td>
                <td style={td}>{service.capacity || '—'}</td>
                <td style={td}>
                  <button
                    onClick={() => loadApplications(service)}
                    style={{
                      padding: '6px 10px',
                      backgroundColor: '#3b82f6',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 600
                    }}
                  >
                    View
                  </button>
                </td>
                <td style={td}>
                  <button
                    onClick={() => handleDeleteService(service.id)}
                    style={{
                      padding: '6px 10px',
                      backgroundColor: '#ef4444',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 600
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {massServices.length === 0 && (
              <tr>
                <td style={td} colSpan={8} align="center">No mass services yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Applications Modal */}
      {appModalOpen && selectedService && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 16
        }}
        onClick={() => setAppModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: 12,
              padding: 24,
              maxWidth: 700,
              width: '100%',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, color: '#1f2937' }}>
                Applications for {selectedService.service_type}
              </h3>
              <button
                onClick={() => setAppModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 24,
                  cursor: 'pointer',
                  color: '#9ca3af'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{
              marginBottom: 16,
              padding: 12,
              backgroundColor: '#f3f4f6',
              borderRadius: 8,
              fontSize: 14
            }}>
              <strong>Date:</strong> {selectedService.date} • <strong>Time:</strong> {selectedService.time} • 
              <strong> Chapel:</strong> {selectedService.chapel}
            </div>

            {applicationsLoading ? (
              <div>Loading applications...</div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {applications.length === 0 ? (
                  <div style={{ color: '#6b7280' }}>No applications yet.</div>
                ) : (
                  applications.map(app => (
                    <div key={app.id} style={{
                      padding: 12,
                      border: `1px solid ${app.status === 'pending' ? '#fbbf24' : app.status === 'approved' ? '#10b981' : '#ef4444'}`,
                      borderRadius: 8,
                      backgroundColor: app.status === 'pending' ? '#fffbeb' : app.status === 'approved' ? '#f0fdf4' : '#fef2f2'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                        <div>
                          <div style={{ fontWeight: 600, color: '#1f2937' }}>
                            Application #{app.id} - <span style={{ textTransform: 'uppercase', fontSize: 12 }}>{app.status}</span>
                          </div>
                          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                            Applied: {new Date(app.applied_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      {/* Display form data */}
                      <div style={{ backgroundColor: '#fff', padding: 8, borderRadius: 6, marginBottom: 12, fontSize: 13 }}>
                        {app.form_data && Object.entries(app.form_data).map(([key, value]) => (
                          <div key={key} style={{ marginBottom: 4, paddingBottom: 4, borderBottom: '1px solid #f3f4f6' }}>
                            <strong>{key}:</strong> {String(value)}
                          </div>
                        ))}
                      </div>

                      {app.status === 'pending' && (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => handleApproveApplication(app.id)}
                            style={{
                              flex: 1,
                              padding: '8px 12px',
                              backgroundColor: '#10b981',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 6,
                              cursor: 'pointer',
                              fontWeight: 600,
                              fontSize: 14
                            }}
                          >
                            ✓ Approve
                          </button>
                          <button
                            onClick={() => setRejectingAppId(rejectingAppId === app.id ? null : app.id)}
                            style={{
                              flex: 1,
                              padding: '8px 12px',
                              backgroundColor: '#ef4444',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 6,
                              cursor: 'pointer',
                              fontWeight: 600,
                              fontSize: 14
                            }}
                          >
                            ✕ Reject
                          </button>
                        </div>
                      )}

                      {rejectingAppId === app.id && (
                        <div style={{ marginTop: 12 }}>
                          <textarea
                            placeholder="Rejection reason (optional)"
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                            style={{
                              width: '100%',
                              padding: 8,
                              border: '1px solid #d1d5db',
                              borderRadius: 6,
                              fontSize: 13,
                              marginBottom: 8,
                              minHeight: 60,
                              fontFamily: 'inherit'
                            }}
                          />
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              onClick={() => handleRejectApplication(app.id)}
                              style={{
                                flex: 1,
                                padding: '6px 10px',
                                backgroundColor: '#dc2626',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 6,
                                cursor: 'pointer',
                                fontWeight: 600,
                                fontSize: 12
                              }}
                            >
                              Confirm Reject
                            </button>
                            <button
                              onClick={() => setRejectingAppId(null)}
                              style={{
                                flex: 1,
                                padding: '6px 10px',
                                backgroundColor: '#e5e7eb',
                                color: '#1f2937',
                                border: 'none',
                                borderRadius: 6,
                                cursor: 'pointer',
                                fontWeight: 600,
                                fontSize: 12
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
