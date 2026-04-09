import React, { useEffect, useMemo, useState } from 'react';
import api from './api';
import { DATE_FIELD_KEYS, NAME_MAX_LENGTH, PHONE_MAX_LENGTH, PHONE_FIELD_KEYS, NAME_FIELD_KEYS, BOOKING_LIMIT, BOOKING_TIME_MAX, BOOKING_TIME_MIN, isAllowedBookingTime, isBookingDateWithinSixMonths, isFutureIsoDate, sanitizeFieldValue, isValidNameValue, isValidPhoneValue, getTomorrowIsoDate, getSixMonthsAheadIsoDate } from './inputValidation';

const SERVICE_OPTIONS = [
  'Counseling',
  'Baptism',
  'Wedding',
  'Blessing',
  'Funeral',
  'Christening',
  'Confessions',
  'Pastoral Visits'
];

const CHAPEL_OPTIONS = [
  'Main Chapel',
  'Side Chapel #1'
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
  ],
  Confessions: [
    { key: 'fullName', label: 'Full Name', required: true },
    { key: 'phone', label: 'Phone Number', required: true },
    { key: 'frequencyOfConfession', label: 'Frequency of Confession', required: true },
    { key: 'confessionNotes', label: 'Topic or Concern (Optional)', required: false, textarea: true }
  ],
  'Pastoral Visits': [
    { key: 'fullName', label: 'Full Name', required: true },
    { key: 'phone', label: 'Phone Number', required: true },
    { key: 'reasonForVisit', label: 'Reason for Visit', required: true, textarea: true },
    { key: 'specialNeeds', label: 'Special Needs or Notes (Optional)', required: false, textarea: true }
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

function defaultFormState(service, previous = {}) {
  const fields = SERVICE_FORM_FIELDS[service] || [];
  const state = {
    chapel: previous.chapel || '',
    needsChairsTables: !!previous.needsChairsTables,
    chairsCount: previous.chairsCount || '',
    tablesCount: previous.tablesCount || ''
  };
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
  const [bookingUsage, setBookingUsage] = useState(null);
  const [showSubmitPreview, setShowSubmitPreview] = useState(false);
  const [draftSubmission, setDraftSubmission] = useState(null);

  const serviceFields = useMemo(
    () => SERVICE_FORM_FIELDS[service] || [],
    [service]
  );

  useEffect(() => {
    setCurrentMode(mode);
  }, [mode]);

  useEffect(() => {
    setServiceFormData(prev => defaultFormState(service, prev));
  }, [service]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await api.bookings.usage();
        if (alive) setBookingUsage(res.data || null);
      } catch {
        if (alive) setBookingUsage(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const validateServiceForm = () => {
    if (!isBookingDateWithinSixMonths(date)) {
      return 'Bookings must be scheduled between tomorrow and 6 months ahead';
    }
    if (!String(serviceFormData.chapel || '').trim()) {
      return 'Chapel is required';
    }

    if (serviceFormData.needsChairsTables) {
      const chairsCount = String(serviceFormData.chairsCount || '').trim();
      const tablesCount = String(serviceFormData.tablesCount || '').trim();

      if (!chairsCount) {
        return 'Chairs count is required when chairs and tables are needed';
      }
      if (!tablesCount) {
        return 'Tables count is required when chairs and tables are needed';
      }
      if (!/^\d+$/.test(chairsCount)) {
        return 'Chairs count must contain numbers only';
      }
      if (!/^\d+$/.test(tablesCount)) {
        return 'Tables count must contain numbers only';
      }
    }

    for (const field of serviceFields) {
      const value = serviceFormData[field.key];
      const strValue = String(value || '').trim();

      if (field.required && !strValue) {
        return `${field.label} is required`;
      }

      if (PHONE_FIELD_KEYS.has(field.key) && !isValidPhoneValue(strValue)) {
        return `${field.label} must contain exactly 11 digits`;
      }

      if (NAME_FIELD_KEYS.has(field.key) && !isValidNameValue(strValue)) {
        return `${field.label} must be 40 characters or fewer and use letters, spaces, apostrophes, or hyphens only`;
      }

      if (DATE_FIELD_KEYS.has(field.key) && isFutureIsoDate(strValue)) {
        return `${field.label} cannot be in the future`;
      }

      if (strValue && NUMERIC_ONLY_FIELDS.has(field.key) && !/^\d+$/.test(strValue)) {
        return `${field.label} must contain numbers only`;
      }
    }

    if (!isAllowedBookingTime(startTime)) {
      return 'Preferred time must be between 8:00 AM and 6:00 PM';
    }
    return null;
  };

  const buildSubmissionDraft = () => ({
    service,
    date,
    slot: startTime,
    details: serviceFormData,
    usage: bookingUsage
  });

  const submit = async () => {
    const formError = validateServiceForm();
    if (formError) {
      setError(formError);
      return;
    }

    try {
      const usageRes = await api.bookings.usage();
      const usage = usageRes.data || {};
      if (Number(usage.activeCount || 0) >= BOOKING_LIMIT) {
        const message = `You have reached the limit of ${BOOKING_LIMIT} active bookings or pending requests. Please cancel one before making a new request.`;
        setError(message);
        window.alert(message);
        return;
      }
      const nextDraft = buildSubmissionDraft();
      setDraftSubmission({ ...nextDraft, usage });
      setShowSubmitPreview(true);
      setError(null);
    } catch (e) {
      setError(
        e.response?.data?.error ||
        e.message ||
        'Booking request failed. Please check backend is running and try again.'
      );
    }
  };

  const confirmBookingSubmission = async () => {
    if (!draftSubmission) return;
    try {
      setError(null);
      const usage = draftSubmission.usage || bookingUsage || {};
      if (Number(usage.activeCount || 0) >= BOOKING_LIMIT) {
        const message = `You have reached the limit of ${BOOKING_LIMIT} active bookings or pending requests. Please cancel one before making a new request.`;
        setError(message);
        window.alert(message);
        return;
      }
      await api.bookings.create({
        service: draftSubmission.service,
        date: draftSubmission.date,
        slot: draftSubmission.slot,
        details: draftSubmission.details
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
    <div 
      className="booking-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'radial-gradient(circle at 20% 20%, rgba(214,173,96,0.35), transparent 45%), radial-gradient(circle at 80% 30%, rgba(59,91,138,0.25), transparent 55%), rgba(0,0,0,0.35)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        padding: 12
      }}>
      <div 
        className="booking-modal-content"
        style={{
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
              {events.length === 0 && <li>No events or bookings</li>}
              {events.map((e, idx) => {
                const slotLabel = e.slot ?? e.time_slot ?? e.time ?? 'Time TBD';
                const serviceLabel = e.service ?? e.service_type ?? e.title ?? 'Booking';
                const isBooking =
                  e._type === 'booking' ||
                  (!!(e.slot ?? e.time_slot) && !!(e.service ?? e.service_type));
                const canCancelThis = canCancel && isBooking && e._isOwner && e.id;
                const isOtherMemberBooking = isBooking && !e._isOwner;
                
                return (
                  <li 
                    key={e.id ?? `${slotLabel}-${serviceLabel}-${idx}`} 
                    style={{ 
                      marginBottom: 6,
                      padding: '8px 10px',
                      borderRadius: 6,
                      background: isOtherMemberBooking ? 'rgba(214,173,96,0.1)' : 'transparent',
                      border: isOtherMemberBooking ? `1px solid ${palette.gold}` : 'none'
                    }}
                  >
                    <strong>{slotLabel}</strong> · {serviceLabel}
                    {isOtherMemberBooking && (
                      <span style={{ 
                        marginLeft: 8, 
                        fontSize: 12, 
                        color: palette.gold,
                        fontWeight: 600 
                      }}>
                        (Member Booked)
                      </span>
                    )}
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
              className="dashboard-action-btn dashboard-action-btn--secondary"
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
              <label style={{ color: palette.ink, fontWeight: 600 }}>Chapel</label>
              <select
                value={serviceFormData.chapel || ''}
                onChange={e => setServiceFormData(prev => ({ ...prev, chapel: e.target.value }))}
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 8,
                  border: `1px solid ${palette.mist}`,
                  background: '#fff'
                }}
              >
                <option value="">Select a chapel</option>
                {CHAPEL_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>

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

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: palette.ink, fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={!!serviceFormData.needsChairsTables}
                  onChange={e => {
                    const checked = e.target.checked;
                    setError(null);
                    setServiceFormData(prev => ({
                      ...prev,
                      needsChairsTables: checked,
                      chairsCount: checked ? prev.chairsCount : '',
                      tablesCount: checked ? prev.tablesCount : ''
                    }));
                  }}
                  style={{ width: 16, height: 16, margin: 0 }}
                />
                Need chairs and tables?
              </label>

              {serviceFormData.needsChairsTables && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: 6, color: palette.ink, fontWeight: 600 }}>
                      Chairs Needed
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={serviceFormData.chairsCount || ''}
                      onChange={e => {
                        const nextValue = e.target.value;
                        if (nextValue && /[^0-9]/.test(nextValue)) {
                          setError('Chairs count must contain numbers only');
                          return;
                        }
                        setError(null);
                        setServiceFormData(prev => ({ ...prev, chairsCount: nextValue }));
                      }}
                      style={{
                        width: '100%',
                        padding: 12,
                        borderRadius: 8,
                        border: `1px solid ${palette.mist}`,
                        background: '#fff'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: 6, color: palette.ink, fontWeight: 600 }}>
                      Tables Needed
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={serviceFormData.tablesCount || ''}
                      onChange={e => {
                        const nextValue = e.target.value;
                        if (nextValue && /[^0-9]/.test(nextValue)) {
                          setError('Tables count must contain numbers only');
                          return;
                        }
                        setError(null);
                        setServiceFormData(prev => ({ ...prev, tablesCount: nextValue }));
                      }}
                      style={{
                        width: '100%',
                        padding: 12,
                        borderRadius: 8,
                        border: `1px solid ${palette.mist}`,
                        background: '#fff'
                      }}
                    />
                  </div>
                </div>
              )}

              <label style={{ color: palette.ink, fontWeight: 600 }}>Preferred Time</label>
              <div style={{ color: '#64748b', fontSize: 12, marginBottom: 6 }}>Select a time between 8:00 AM and 6:00 PM</div>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                step="1800"
                min={BOOKING_TIME_MIN}
                max={BOOKING_TIME_MAX}
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 8,
                  border: `1px solid ${palette.mist}`,
                  background: '#fff'
                }}
              />

              {bookingUsage && (
                <div style={{
                  fontSize: 12,
                  color: bookingUsage.activeCount >= BOOKING_LIMIT ? '#b0413e' : '#64748b',
                  background: bookingUsage.activeCount >= BOOKING_LIMIT ? '#fef2f2' : '#f8fafc',
                  border: `1px solid ${bookingUsage.activeCount >= BOOKING_LIMIT ? '#fecaca' : '#e2e8f0'}`,
                  borderRadius: 10,
                  padding: '8px 10px',
                  lineHeight: 1.4
                }}>
                  You have {bookingUsage.activeCount}/{BOOKING_LIMIT} active bookings or pending requests.
                </div>
              )}

              <div style={{ fontSize: 12, color: '#64748b', marginTop: -2 }}>
                Booking dates are open from {getTomorrowIsoDate()} to {getSixMonthsAheadIsoDate()}.
              </div>
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
                    type={field.type || (DATE_FIELD_KEYS.has(field.key) ? 'date' : 'text')}
                    value={serviceFormData[field.key] || ''}
                    inputMode={PHONE_FIELD_KEYS.has(field.key) ? 'numeric' : undefined}
                    maxLength={PHONE_FIELD_KEYS.has(field.key) ? PHONE_MAX_LENGTH : NAME_FIELD_KEYS.has(field.key) ? NAME_MAX_LENGTH : undefined}
                    max={DATE_FIELD_KEYS.has(field.key) ? getTodayIsoDate() : undefined}
                    onChange={e => {
                      const nextValue = sanitizeFieldValue(field.key, e.target.value);
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
              className="dashboard-action-btn dashboard-action-btn--primary"
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
              Send Booking Request
            </button>
            <button
              className="dashboard-action-btn dashboard-action-btn--secondary"
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

      {showSubmitPreview && draftSubmission && (
        <div
          className="church-review-overlay"
          onClick={() => setShowSubmitPreview(false)}
        >
          <div
            className="church-review-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="church-review-header">
              <div className="church-review-kicker">✦ Parish Booking</div>
              <button
                onClick={() => setShowSubmitPreview(false)}
                className="church-review-close"
                aria-label="Close booking preview"
              >
                ×
              </button>
            </div>

            <h3 className="church-review-title">Confirm Booking Details</h3>
            <div className="church-review-subtitle">
              Review the filled-out form below. You can go back and edit it, or confirm to send it to the parish office.
            </div>

            <div className="church-review-sheet">
              <div className="church-review-section">
                <div className="church-review-section-title">Booking Details</div>
                <div className="church-review-grid">
                  <div className="church-review-row">
                    <span className="church-review-label">Service</span>
                    <span className="church-review-value">{draftSubmission.service}</span>
                  </div>
                  <div className="church-review-row">
                    <span className="church-review-label">Date</span>
                    <span className="church-review-value">{draftSubmission.date}</span>
                  </div>
                  <div className="church-review-row">
                    <span className="church-review-label">Time</span>
                    <span className="church-review-value">{draftSubmission.slot}</span>
                  </div>
                  <div className="church-review-row">
                    <span className="church-review-label">Chapel</span>
                    <span className="church-review-value">{draftSubmission.details.chapel || '-'}</span>
                  </div>
                  <div className="church-review-row">
                    <span className="church-review-label">Chairs / Tables</span>
                    <span className="church-review-value">
                      {draftSubmission.details.needsChairsTables
                        ? `${draftSubmission.details.chairsCount || 0} chairs, ${draftSubmission.details.tablesCount || 0} tables`
                        : 'No'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="church-review-section">
                <div className="church-review-section-title">Filled Form Preview</div>
                <div className="church-review-grid">
                  {serviceFields.map((field) => (
                    <div key={field.key} className="church-review-row church-review-row--stacked">
                      <span className="church-review-label">{field.label}</span>
                      <span className="church-review-value">
                        {String(draftSubmission.details[field.key] || '-')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <p className="church-review-error">{error}</p>
            )}

            <div className="church-review-actions">
              <button
                onClick={() => setShowSubmitPreview(false)}
                className="church-review-btn church-review-btn--soft"
              >
                Edit
              </button>
              <button
                onClick={confirmBookingSubmission}
                className="church-review-btn church-review-btn--primary"
              >
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
