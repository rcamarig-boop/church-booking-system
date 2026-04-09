import React, { useCallback, useContext, useEffect, useState } from 'react';
import api from './api';
import { SocketContext } from './App';
import { BOOKING_TIME_MAX, BOOKING_TIME_MIN, DATE_FIELD_KEYS, NAME_MAX_LENGTH, PHONE_FIELD_KEYS, NAME_FIELD_KEYS, getTomorrowIsoDate, getSixMonthsAheadIsoDate, isAllowedBookingTime, isBookingDateWithinSixMonths, sanitizeFieldValue } from './inputValidation';

const th = {
  padding: 8,
  border: '1px solid #ccc',
  textAlign: 'left',
};

const td = {
  padding: 8,
  border: '1px solid #ccc',
};

const actionsColStyle = {
  minWidth: 180,
  whiteSpace: 'nowrap'
};
const iconBtn = {
  width: 32,
  height: 32,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#fff',
  border: 'none',
  borderRadius: 999,
  cursor: 'pointer',
  boxShadow: '0 2px 8px rgba(0,0,0,0.12)'
};

const SERVICE_FIELDS = {
  counseling: ['fullName', 'phone', 'concern'],
  baptism: ['childName', 'birthDate', 'parentNames'],
  wedding: ['groomName', 'brideName', 'contactNumber'],
  blessing: ['personName', 'blessingType'],
  funeral: ['deceasedName', 'deceasedBirthDate', 'dateOfDeath', 'familyContact'],
  christening: ['childName', 'guardianName', 'contactNumber']
};

const NUMERIC_ONLY_FIELDS = new Set(['phone', 'contactNumber', 'familyContact']);
const CHAPEL_OPTIONS = ['Main Chapel', 'Side Chapel #1'];

const actionWrap = {
  display: 'flex',
  alignItems: 'center',
  gap: 8
};

function Icon({ kind }) {
  if (kind === 'edit') {
    return <span style={{ fontSize: 15, lineHeight: 1 }}>📄</span>;
  }
  if (kind === 'approve') {
    return <span style={{ fontSize: 14, fontWeight: 700, lineHeight: 1 }}>✓</span>;
  }
  return <span style={{ fontSize: 14, fontWeight: 700, lineHeight: 1 }}>✕</span>;
}

export default function AdminRequestPanel({ onDecision }) {
  const socket = useContext(SocketContext);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorSaving, setEditorSaving] = useState(false);
  const [editorError, setEditorError] = useState('');
  const [editingRequest, setEditingRequest] = useState(null);
  const [editorForm, setEditorForm] = useState({
    service: '',
    date: '',
    slot: '',
    details: ''
  });
  const [editorDetailsFields, setEditorDetailsFields] = useState({});
  const [editorChapel, setEditorChapel] = useState('');
  const [editorDetailsExtra, setEditorDetailsExtra] = useState('');

  const buildDetailsState = (service, detailsObj) => {
    const key = String(service || '').trim().toLowerCase();
    const fields = SERVICE_FIELDS[key] || [];
    const fieldValues = {};
    fields.forEach(f => {
      fieldValues[f] = detailsObj?.[f] ?? '';
    });
    const extras = {};
    if (detailsObj && typeof detailsObj === 'object') {
      Object.keys(detailsObj).forEach(k => {
        if (k === 'chapel') return;
        if (!fields.includes(k)) extras[k] = detailsObj[k];
      });
    }
    return {
      fieldValues,
      chapel: detailsObj?.chapel || '',
      extrasText: Object.keys(extras).length ? JSON.stringify(extras, null, 2) : ''
    };
  };

  const [hasMore, setHasMore] = useState(false);

  const loadRequests = useCallback(async () => {
    try {
      const res = await api.bookingRequests.list({
        limit: pageSize,
        offset: (page - 1) * pageSize
      });
      setRequests(res.data || []);
      setHasMore((res.data || []).length === pageSize);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load booking requests.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    if (!socket) return;
    socket.on('booking_request_created', loadRequests);
    socket.on('booking_request_updated', loadRequests);
    return () => {
      socket.off('booking_request_created', loadRequests);
      socket.off('booking_request_updated', loadRequests);
    };
  }, [socket, loadRequests]);

  const handleAction = async (requestId, action) => {
    try {
      setProcessingId(requestId);
      setError(null);
      if (action === 'approve') {
        await api.bookingRequests.approve(requestId);
      } else {
        await api.bookingRequests.reject(requestId);
      }
      await loadRequests();
      onDecision && onDecision();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to process booking request.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleEdit = (request) => {
    const detailsObj = request.details && typeof request.details === 'object' ? request.details : {};
    const { fieldValues, chapel, extrasText } = buildDetailsState(request.service, detailsObj);
    setEditingRequest(request);
    setEditorForm({
      service: request.service || '',
      date: request.date || '',
      slot: request.slot || '',
      details: JSON.stringify(request.details || {}, null, 2)
    });
    setEditorDetailsFields(fieldValues);
    setEditorChapel(chapel);
    setEditorDetailsExtra(extrasText);
    setEditorError('');
    setEditorOpen(true);
  };

  if (loading) return <div>Loading booking requests...</div>;


  return (
    <div>
      <h2 className="admin-request-title">Booking Request Panel</h2>
      {error && (
        <div style={{ marginBottom: 12, color: '#e53e3e' }}>{error}</div>
      )}
      {editorOpen && (
        <div
          className="admin-request-modal-overlay"
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.45)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 20,
            padding: 16
          }}
          onClick={() => {
            if (!editorSaving) {
              setEditorOpen(false);
              setEditingRequest(null);
              setEditorError('');
            }
          }}
        >
          <div
            className="admin-request-modal-card"
            style={{
              width: '100%',
              maxWidth: 620,
              background: '#fff',
              borderRadius: 16,
              padding: 20,
              border: '1px solid #e2e8f0',
              boxShadow: '0 20px 50px rgba(0,0,0,0.18)',
              maxHeight: 'calc(100vh - 32px)',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Edit Request</h3>
              <button
                onClick={() => {
                  if (editorSaving) return;
                  setEditorOpen(false);
                  setEditingRequest(null);
                  setEditorError('');
                }}
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  color: '#64748b',
                  fontWeight: 700,
                  padding: '4px 8px'
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6 }}>Chapel</label>
                <select
                  value={editorChapel}
                  onChange={(e) => setEditorChapel(e.target.value)}
                  style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff' }}
                >
                  <option value="">Select a chapel</option>
                  {CHAPEL_OPTIONS.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6 }}>Service</label>
                <input
                  type="text"
                  value={editorForm.service}
                  onChange={(e) => setEditorForm(f => ({ ...f, service: e.target.value }))}
                  style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 6 }}>Date</label>
                  <input
                    type="date"
                    value={editorForm.date}
                    onChange={(e) => setEditorForm(f => ({ ...f, date: e.target.value }))}
                    min={getTomorrowIsoDate()}
                    max={getSixMonthsAheadIsoDate()}
                    style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 6 }}>Preferred Time</label>
                  <input
                    type="time"
                    value={editorForm.slot}
                    onChange={(e) => setEditorForm(f => ({ ...f, slot: e.target.value }))}
                    step="1800"
                    min={BOOKING_TIME_MIN}
                    max={BOOKING_TIME_MAX}
                    style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6 }}>Service Details</label>
                {(() => {
                  const key = String(editorForm.service || '').trim().toLowerCase();
                  const fields = SERVICE_FIELDS[key] || [];
                  if (!fields.length) {
                    return <div style={{ color: '#718096' }}>No structured fields for this service.</div>;
                  }
                  return (
                    <div style={{ display: 'grid', gap: 10 }}>
                      {fields.map(field => (
                        <div key={field}>
                          <label style={{ display: 'block', marginBottom: 6, fontSize: 12 }}>
                            {field}
                          </label>
                          <input
                            type={DATE_FIELD_KEYS.has(field) ? 'date' : 'text'}
                            value={editorDetailsFields[field] || ''}
                            inputMode={PHONE_FIELD_KEYS.has(field) ? 'numeric' : undefined}
                            max={DATE_FIELD_KEYS.has(field) ? getTodayIsoDate() : undefined}
                            maxLength={PHONE_FIELD_KEYS.has(field) ? 11 : NAME_FIELD_KEYS.has(field) ? NAME_MAX_LENGTH : undefined}
                            onChange={(e) => setEditorDetailsFields(prev => ({ ...prev, [field]: sanitizeFieldValue(field, e.target.value) }))}
                            style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }}
                          />
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6 }}>Additional Details (optional JSON)</label>
                <textarea
                  rows={4}
                  value={editorDetailsExtra}
                  onChange={(e) => setEditorDetailsExtra(e.target.value)}
                  style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }}
                />
              </div>
              {editorError && (
                <div style={{ color: '#e53e3e', fontWeight: 600 }}>{editorError}</div>
              )}
              <div className="admin-request-modal-actions" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    if (editorSaving) return;
                    setEditorOpen(false);
                    setEditingRequest(null);
                    setEditorError('');
                  }}
                  style={{
                    background: '#e2e8f0',
                    color: '#1f2937',
                    borderRadius: 10,
                    padding: '8px 12px'
                  }}
                >
                  Cancel
                </button>
                <button
                  disabled={editorSaving}
                  onClick={async () => {
                    if (!editingRequest?.id) {
                      setEditorError('Missing request id.');
                      return;
                    }
                    if (!String(editorChapel || '').trim()) {
                      setEditorError('Chapel is required.');
                      return;
                    }
                    const key = String(editorForm.service || '').trim().toLowerCase();
                    const fields = SERVICE_FIELDS[key] || [];
                    for (const f of fields) {
                      const val = String(editorDetailsFields[f] || '').trim();
                      if (!val) {
                        setEditorError(`Missing required field: ${f}`);
                        return;
                      }
                      if (DATE_FIELD_KEYS.has(f) && isFutureIsoDate(val)) {
                        setEditorError(`${f} cannot be in the future.`);
                        return;
                      }
                      if (NUMERIC_ONLY_FIELDS.has(f) && !/^\d+$/.test(val)) {
                        setEditorError(`${f} must contain numbers only.`);
                        return;
                      }
                    }
                    if (!isBookingDateWithinSixMonths(editorForm.date)) {
                      setEditorError('Bookings must be scheduled between tomorrow and 6 months ahead.');
                      return;
                    }
                    if (!isAllowedBookingTime(editorForm.slot)) {
                      setEditorError('Preferred time must be between 8:00 AM and 6:00 PM in 30-minute intervals.');
                      return;
                    }
                    let extra = {};
                    try {
                      extra = editorDetailsExtra.trim() ? JSON.parse(editorDetailsExtra) : {};
                    } catch {
                      setEditorError('Additional details must be valid JSON.');
                      return;
                    }
                    const details = { chapel: editorChapel, ...extra, ...editorDetailsFields };
                    try {
                      setEditorSaving(true);
                      setEditorError('');
                      await api.bookingRequests.update(editingRequest.id, {
                        service: editorForm.service,
                        date: editorForm.date,
                        slot: editorForm.slot,
                        details
                      });
                      setEditorOpen(false);
                      setEditingRequest(null);
                      setEditorDetailsExtra('');
                      setEditorChapel('');
                      setEditorDetailsFields({});
                      await loadRequests();
                      onDecision && onDecision();
                    } catch (err) {
                      setEditorError(err.response?.data?.error || 'Failed to edit booking request.');
                    } finally {
                      setEditorSaving(false);
                    }
                  }}
                  style={{
                    background: '#3182ce',
                    color: '#fff',
                    borderRadius: 10,
                    padding: '8px 12px'
                  }}
                >
                  {editorSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="admin-request-table-wrap">
        <table className="admin-request-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#eee' }}>
            <th style={th}>ID</th>
            <th style={th}>Name</th>
            <th style={th}>Email</th>
            <th style={th}>Service</th>
            <th style={th}>Date</th>
            <th style={th}>Slot</th>
            <th style={th}>Place / Chapel</th>
            <th style={th}>Details</th>
            <th style={{ ...th, ...actionsColStyle }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {requests.map(r => (
            <tr key={r.id}>
              <td style={td}>{r.id}</td>
              <td style={td}>{r.name || '-'}</td>
              <td style={td}>{r.email || '-'}</td>
              <td style={td}>{r.service || '-'}</td>
              <td style={td}>{r.date || '-'}</td>
              <td style={td}>{r.slot || '-'}</td>
              <td style={td}>{r.chapel || r.details?.chapel || '-'}</td>
              <td style={td}>
                {r.details && typeof r.details === 'object'
                  ? Object.entries(r.details)
                      .filter(([k, v]) => k !== 'chapel' && v !== null && v !== undefined && String(v).trim() !== '')
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(' | ')
                  : '-'}
              </td>
              <td style={{ ...td, ...actionsColStyle }}>
                <div style={actionWrap}>
                  <button
                    title="Edit request"
                    aria-label="Edit request"
                    disabled={processingId === r.id}
                    onClick={() => handleEdit(r)}
                    style={{
                      ...iconBtn,
                      background: '#3182ce',
                      opacity: processingId === r.id ? 0.6 : 1
                    }}
                  >
                    <Icon kind="edit" />
                  </button>
                  <button
                    title="Approve request"
                    aria-label="Approve request"
                    disabled={processingId === r.id}
                    onClick={() => handleAction(r.id, 'approve')}
                    style={{
                      ...iconBtn,
                      background: '#38a169',
                      opacity: processingId === r.id ? 0.6 : 1
                    }}
                  >
                    <Icon kind="approve" />
                  </button>
                  <button
                    title="Reject request"
                    aria-label="Reject request"
                    disabled={processingId === r.id}
                    onClick={() => handleAction(r.id, 'reject')}
                    style={{
                      ...iconBtn,
                      background: '#e53e3e',
                      opacity: processingId === r.id ? 0.6 : 1
                    }}
                  >
                    <Icon kind="reject" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {requests.length === 0 && (
            <tr>
              <td style={td} colSpan={9}>No pending booking requests.</td>
            </tr>
          )}
        </tbody>
        </table>
      </div>
      <div className="admin-request-pagination" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, alignItems: 'center' }}>
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page <= 1}
          style={{ ...iconBtn, width: 90, height: 32, background: '#94a3b8' }}
        >
          Prev
        </button>
        <div style={{ color: '#4a5568', fontWeight: 600 }}>
          Page {page}
        </div>
        <button
          onClick={() => setPage(p => p + 1)}
          disabled={!hasMore}
          style={{ ...iconBtn, width: 90, height: 32, background: '#3182ce' }}
        >
          Next
        </button>
      </div>
    </div>
  );
}
