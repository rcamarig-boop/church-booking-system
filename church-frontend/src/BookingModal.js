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

const palette = {
  stone: '#f8f4ec',
  ink: '#1f2a44',
  gold: '#d6ad60',
  accent: '#3b5b8a',
  wine: '#b0413e',
  mist: '#e7dfcf'
};

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

  const cardShadow = '0 14px 38px rgba(0,0,0,0.18)';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'radial-gradient(circle at 20% 20%, rgba(214,173,96,0.35), transparent 45%), radial-gradient(circle at 80% 30%, rgba(59,91,138,0.25), transparent 55%), rgba(0,0,0,0.35)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      padding: 12
    }}>
      <div style={{
        background: '#fff',
        padding: 24,
        borderRadius: 16,
        width: 'min(460px, 100%)',
        boxShadow: cardShadow,
        maxHeight: '90vh',
        overflowY: 'auto',
        border: `1px solid ${palette.mist}`
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ marginBottom: 0, color: palette.ink, display: 'flex', alignItems: 'center', gap: 8 }}>
            ✚ Booking for {date}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 20,
              cursor: 'pointer',
              color: '#9aa1b2'
            }}
            aria-label="Close booking modal"
          >
            ×
          </button>
        </div>

        {currentMode === 'list' && (
          <>
            <ul style={{ paddingLeft: 16, marginBottom: 16, color: palette.ink, lineHeight: 1.5 }}>
              {events.length === 0 && <li>No events</li>}
              {events.map((e, idx) => {
                const slotLabel = e.slot ?? e.time_slot ?? e.time ?? 'Time TBD';
                const serviceLabel = e.service ?? e.service_type ?? e.title ?? 'Booking';
                const isBooking =
                  e._type === 'booking' ||
                  (!!(e.slot ?? e.time_slot) && !!(e.service ?? e.service_type));
                const canCancelThis = canCancel && isBooking && e._isOwner && e.id;
                return (
                  <li key={e.id ?? `${slotLabel}-${serviceLabel}-${idx}`} style={{ marginBottom: 6 }}>
                    <strong>{slotLabel}</strong> · {serviceLabel}
                    {canCancelThis && (
                      <button
                        style={{
                          marginLeft: 8,
                          padding: '4px 8px',
                          background: palette.wine,
                          color: '#fff',
                          border: 'none',
                          borderRadius: 6,
                          cursor: 'pointer',
                          boxShadow: '0 4px 10px rgba(0,0,0,0.12)'
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
                padding: 14,
                borderRadius: 10,
                border: 'none',
                background: `linear-gradient(135deg, ${palette.accent}, ${palette.ink})`,
                color: '#ffffff',
                fontWeight: 700,
                cursor: 'pointer',
                marginBottom: 12,
                boxShadow: cardShadow
              }}
            >
              Request Booking
            </button>
          </>
        )}

        {currentMode === 'new' && (
          <>
            <div style={{
              display: 'grid',
              gap: 10,
              marginBottom: 12
            }}>
              <label style={{ color: palette.ink, fontWeight: 600 }}>Service</label>
              <select
                value={service}
                onChange={e => setService(e.target.value)}
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 8,
                  border: `1px solid ${palette.mist}`,
                  background: '#fff'
                }}
              >
                {SERVICE_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>

              <label style={{ color: palette.ink, fontWeight: 600 }}>Preferred Time</label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                step="1800"
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 8,
                  border: `1px solid ${palette.mist}`,
                  background: '#fff'
                }}
              />
            </div>

            {error && (
              <p style={{ color: palette.wine, marginBottom: 12 }}>
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
                padding: 14,
                borderRadius: 10,
                border: 'none',
                background: `linear-gradient(135deg, ${palette.gold}, ${palette.accent})`,
                color: palette.ink,
                fontWeight: 700,
                cursor: 'pointer',
                marginBottom: 12,
                boxShadow: cardShadow
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
            border: `1px solid ${palette.mist}`,
            background: '#fff',
            color: palette.ink,
            cursor: 'pointer'
          }}
        >
          Close
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
          zIndex: 1001,
          padding: 12
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 14,
            width: 'min(480px, 100%)',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: 20,
            boxShadow: cardShadow,
            border: `1px solid ${palette.mist}`
          }}>
            <h3 style={{ marginTop: 0, marginBottom: 12, color: palette.ink }}>{service} Form</h3>
            {serviceFields.map(field => (
              <div key={field.key} style={{ marginBottom: 10 }}>
                <label style={{ display: 'block', marginBottom: 6, color: palette.ink, fontWeight: 600 }}>
                  {field.label}{field.required ? ' *' : ''}
                </label>
                {field.textarea ? (
                  <textarea
                    value={serviceFormData[field.key] || ''}
                    onChange={e => setServiceFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                    rows={3}
                    style={{ width: '100%', padding: 10, border: `1px solid ${palette.mist}`, borderRadius: 8, background: '#fff' }}
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
                    style={{ width: '100%', padding: 10, border: `1px solid ${palette.mist}`, borderRadius: 8, background: '#fff' }}
                  />
                )}
              </div>
            ))}

            {error && <p style={{ color: palette.wine }}>{error}</p>}

            <button
              onClick={submit}
              style={{
                width: '100%',
                padding: 14,
                borderRadius: 10,
                border: 'none',
                background: `linear-gradient(135deg, ${palette.accent}, ${palette.ink})`,
                color: '#fff',
                fontWeight: 700,
                cursor: 'pointer',
                marginBottom: 10,
                boxShadow: cardShadow
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
                border: `1px solid ${palette.mist}`,
                background: palette.stone,
                color: palette.ink,
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
