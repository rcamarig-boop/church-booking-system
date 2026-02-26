import React, { useEffect, useMemo, useState } from 'react';
import api from './api';

const SERVICE_OPTIONS = [
  'Counseling',
  'Baptism',
  'Wedding',
  'Blessing',
  'Funeral',
  'Christening'
];

const SERVICE_FORM_FIELDS = {
  Counseling: [
    { key: 'fullName', label: 'Full Name', required: true },
    { key: 'phone', label: 'Phone Number', required: true },
    { key: 'concern', label: 'Concern', required: true, textarea: true }
  ],
  Baptism: [
    { key: 'childName', label: 'Child Name', required: true },
    { key: 'birthDate', label: 'Birth Date', required: true, type: 'date' },
    { key: 'parentNames', label: 'Parent Names', required: true }
  ],
  Wedding: [
    { key: 'groomName', label: 'Groom Name', required: true },
    { key: 'brideName', label: 'Bride Name', required: true },
    { key: 'contactNumber', label: 'Contact Number', required: true }
  ],
  Blessing: [
    { key: 'personName', label: 'Person Name', required: true },
    { key: 'blessingType', label: 'Blessing Type', required: true },
    { key: 'notes', label: 'Notes', required: false, textarea: true }
  ],
  Funeral: [
    { key: 'deceasedName', label: 'Deceased Name', required: true },
    { key: 'deceasedBirthDate', label: 'Birth Date of Deceased', required: true, type: 'date' },
    { key: 'dateOfDeath', label: 'Date of Death', required: true, type: 'date' },
    { key: 'familyContact', label: 'Family Contact', required: true }
  ],
  Christening: [
    { key: 'childName', label: 'Child Name', required: true },
    { key: 'guardianName', label: 'Guardian Name', required: true },
    { key: 'contactNumber', label: 'Contact Number', required: true }
  ]
};

const NUMERIC_ONLY_FIELDS = new Set(['phone', 'contactNumber', 'familyContact']);

function defaultFormState(service) {
  const fields = SERVICE_FORM_FIELDS[service] || [];
  const state = {};
  fields.forEach(f => { state[f.key] = ''; });
  return state;
}

export default function BookingModal({
  date,
  events = [],
  mode = 'list',
  onClose,
  onRequestNewBooking,
  onBooked,
  onCancelled,
  canCancel = false
}) {
  const [service, setService] = useState('Counseling');
  const [startTime, setStartTime] = useState('09:00');
  const [error, setError] = useState(null);
  const [currentMode, setCurrentMode] = useState(mode);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [serviceFormData, setServiceFormData] = useState(defaultFormState('Counseling'));

  const serviceFields = useMemo(
    () => SERVICE_FORM_FIELDS[service] || [],
    [service]
  );

  useEffect(() => {
    setCurrentMode(mode);
  }, [mode]);

  useEffect(() => {
    setServiceFormData(defaultFormState(service));
  }, [service]);

  const validateServiceForm = () => {
    for (const field of serviceFields) {
      const value = serviceFormData[field.key];
      const strValue = String(value || '').trim();

      if (field.required && !strValue) {
        return `${field.label} is required`;
      }

      if (strValue && NUMERIC_ONLY_FIELDS.has(field.key) && !/^\d+$/.test(strValue)) {
        return `${field.label} must contain numbers only`;
      }
    }
    return null;
  };

  const submit = async () => {
    const formError = validateServiceForm();
    if (formError) {
      setError(formError);
      return;
    }

    try {
      setError(null);
      await api.bookings.create({
        service,
        date,
        slot: startTime,
        details: serviceFormData
      });
      onBooked && onBooked();
      onClose();
    } catch (e) {
      setError(
        e.response?.data?.error ||
        e.message ||
        'Booking request failed. Please check backend is running and try again.'
      );
    }
  };

  const cancelBooking = async (bookingId) => {
    try {
      setError(null);
      await api.bookings.remove(bookingId);
      onCancelled && onCancelled();
      onClose();
    } catch (e) {
      setError(e.response?.data?.error || 'Cancel failed');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.35)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: '#fff',
        padding: 24,
        borderRadius: 12,
        width: 420,
        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <h3 style={{ marginBottom: 16 }}>{date}</h3>

        {currentMode === 'list' && (
          <>
            <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
              {events.length === 0 && <li>No events</li>}
              {events.map((e, idx) => {
                const slotLabel = e.slot ?? e.time_slot ?? e.time ?? 'Time TBD';
                const serviceLabel = e.service ?? e.service_type ?? e.title ?? 'Booking';
                const isBooking =
                  e._type === 'booking' ||
                  (!!(e.slot ?? e.time_slot) && !!(e.service ?? e.service_type));
                const canCancelThis = canCancel && isBooking && e._isOwner && e.id;
                return (
                  <li key={e.id ?? `${slotLabel}-${serviceLabel}-${idx}`}>
                    <strong>{slotLabel}</strong> - {serviceLabel}
                    {canCancelThis && (
                      <button
                        style={{
                          marginLeft: 8,
                          padding: '2px 6px',
                          background: '#f56565',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 4,
                          cursor: 'pointer'
                        }}
                        onClick={() => {
                          if (window.confirm('Cancel this booking?')) {
                            cancelBooking(e.id);
                          }
                        }}
                      >
                        Cancel
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>

            <button
              onClick={() => {
                setCurrentMode('new');
                onRequestNewBooking && onRequestNewBooking();
              }}
              style={{
                width: '100%',
                padding: 12,
                borderRadius: 8,
                border: 'none',
                background: '#667eea',
                color: '#ffffff',
                fontWeight: 600,
                cursor: 'pointer',
                marginBottom: 12
              }}
            >
              + Add
            </button>
          </>
        )}

        {currentMode === 'new' && (
          <>
            <select
              value={service}
              onChange={e => setService(e.target.value)}
              style={{
                width: '100%',
                padding: 12,
                marginBottom: 12,
                borderRadius: 6,
                border: '1px solid #cbd5e0'
              }}
            >
              {SERVICE_OPTIONS.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>

            <input
              type="time"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              step="1800"
              style={{
                width: '100%',
                padding: 12,
                marginBottom: 12,
                borderRadius: 6,
                border: '1px solid #cbd5e0'
              }}
            />

            {error && (
              <p style={{ color: 'red', marginBottom: 12 }}>
                {error}
              </p>
            )}

            <button
              onClick={() => {
                setError(null);
                setShowServiceForm(true);
              }}
              style={{
                width: '100%',
                padding: 12,
                borderRadius: 8,
                border: 'none',
                background: '#4c51bf',
                color: '#fff',
                fontWeight: 600,
                cursor: 'pointer',
                marginBottom: 12
              }}
            >
              Continue To Service Form
            </button>
          </>
        )}

        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: 12,
            borderRadius: 8,
            border: '1px solid #cbd5e0',
            background: '#fd0b0b',
            cursor: 'pointer'
          }}
        >
          Cancel
        </button>
      </div>

      {showServiceForm && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.45)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1001
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 12,
            width: 460,
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: 20
          }}>
            <h3 style={{ marginTop: 0, marginBottom: 12 }}>{service} Form</h3>
            {serviceFields.map(field => (
              <div key={field.key} style={{ marginBottom: 10 }}>
                <label style={{ display: 'block', marginBottom: 6 }}>
                  {field.label}{field.required ? ' *' : ''}
                </label>
                {field.textarea ? (
                  <textarea
                    value={serviceFormData[field.key] || ''}
                    onChange={e => setServiceFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                    rows={3}
                    style={{ width: '100%', padding: 10, border: '1px solid #cbd5e0', borderRadius: 6 }}
                  />
                ) : (
                  <input
                    type={field.type || 'text'}
                    value={serviceFormData[field.key] || ''}
                    inputMode={NUMERIC_ONLY_FIELDS.has(field.key) ? 'numeric' : undefined}
                    onChange={e => {
                      const nextValue = e.target.value;
                      if (NUMERIC_ONLY_FIELDS.has(field.key) && /[^0-9]/.test(nextValue)) {
                        setError(`${field.label} must contain numbers only`);
                        return;
                      }
                      setError(null);
                      setServiceFormData(prev => ({ ...prev, [field.key]: nextValue }));
                    }}
                    style={{ width: '100%', padding: 10, border: '1px solid #cbd5e0', borderRadius: 6 }}
                  />
                )}
              </div>
            ))}

            {error && <p style={{ color: 'red' }}>{error}</p>}

            <button
              onClick={submit}
              style={{
                width: '100%',
                padding: 12,
                borderRadius: 8,
                border: 'none',
                background: '#667eea',
                color: '#fff',
                fontWeight: 600,
                cursor: 'pointer',
                marginBottom: 10
              }}
            >
              Submit Request
            </button>
            <button
              onClick={() => setShowServiceForm(false)}
              style={{
                width: '100%',
                padding: 12,
                borderRadius: 8,
                border: '1px solid #cbd5e0',
                background: '#fc0404',
                cursor: 'pointer'
              }}
            >
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
