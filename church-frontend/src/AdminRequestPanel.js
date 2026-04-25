import React, { useCallback, useContext, useEffect, useState } from 'react';
import api from './api';
import { SocketContext } from './App';
import { BOOKING_TIME_MAX, BOOKING_TIME_MIN, DATE_FIELD_KEYS, NAME_MAX_LENGTH, PHONE_FIELD_KEYS, NAME_FIELD_KEYS, isAllowedBookingTime, isBookingDateWithinSixMonths, getTodayIsoDate, isFutureIsoDate } from './inputValidation';
import { useToast } from './ToastNotification';
import { STATUS_COLORS, HELP_TEXT } from './systemConstants';
import { StatusBadge } from './StatusComponents';
import { HelpIcon } from './HelpSystem';
import { QuickFilters, BulkActionsToolbar, SelectCheckbox } from './FormComponents';
import { ConfirmationDialog } from './StatusComponents';

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
  blessing: ['personName', 'blessingType', 'notes'],
  funeral: ['deceasedName', 'deceasedBirthDate', 'dateOfDeath', 'familyContact'],
  christening: ['childName', 'guardianName', 'contactNumber'],
  confessions: ['fullName', 'phone', 'frequencyOfConfession', 'confessionNotes'],
  'pastoral visits': ['fullName', 'phone', 'reasonForVisit', 'specialNeeds']
};

const NUMERIC_ONLY_FIELDS = new Set(['phone', 'contactNumber', 'familyContact']);
const BOOKING_SHARED_DETAIL_KEYS = new Set(['chapel', 'needsChairsTables', 'chairsCount', 'tablesCount']);
const CHAPEL_OPTIONS = ['Main Chapel', 'Side Chapel #1'];

const actionWrap = {
  display: 'flex',
  alignItems: 'center',
  gap: 8
};

function Icon({ kind }) {
  if (kind === 'edit') {
    return <span style={{ fontSize: 15, lineHeight: 1 }}>&#128196;</span>;
  }
  if (kind === 'approve') {
    return <span style={{ fontSize: 14, fontWeight: 700, lineHeight: 1 }}>&#10003;</span>;
  }
  return <span style={{ fontSize: 14, fontWeight: 700, lineHeight: 1 }}>&times;</span>;
}

const DETAIL_LABEL_OVERRIDES = {
  fullName: 'Full Name',
  childName: 'Child Name',
  parentNames: 'Parent Names',
  groomName: 'Groom Name',
  brideName: 'Bride Name',
  contactNumber: 'Contact Number',
  personName: 'Person Name',
  blessingType: 'Blessing Type',
  deceasedName: 'Deceased Name',
  deceasedBirthDate: 'Birth Date of Deceased',
  dateOfDeath: 'Date of Death',
  familyContact: 'Family Contact',
  guardianName: 'Guardian Name',
  frequencyOfConfession: 'Frequency of Confession',
  confessionNotes: 'Confession Notes',
  reasonForVisit: 'Reason for Visit',
  specialNeeds: 'Special Needs',
  notes: 'Notes',
  phone: 'Phone Number',
  chapel: 'Place / Chapel'
};

function humanizeDetailKey(key) {
  if (DETAIL_LABEL_OVERRIDES[key]) return DETAIL_LABEL_OVERRIDES[key];
  return String(key || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\b\w/g, ch => ch.toUpperCase())
    .trim();
}

function buildDetailEntries(request) {
  const detailsObj = request?.details && typeof request.details === 'object' ? request.details : {};
  const serviceKey = String(request?.service || '').trim().toLowerCase();
  const fields = SERVICE_FIELDS[serviceKey] || [];
  const entries = [];

  if (detailsObj.chapel) {
    entries.push({ label: 'Place / Chapel', value: String(detailsObj.chapel) });
  }

  if (detailsObj.needsChairsTables) {
    entries.push({
      label: 'Chairs / Tables',
      value: `${detailsObj.chairsCount || 0} chairs, ${detailsObj.tablesCount || 0} tables`
    });
  }

  fields.forEach((field) => {
    if (field === 'chapel') return;
    const value = detailsObj[field];
    if (value === undefined || value === null || String(value).trim() === '') return;
    entries.push({ label: humanizeDetailKey(field), value: String(value) });
  });

  Object.entries(detailsObj).forEach(([key, value]) => {
    if (BOOKING_SHARED_DETAIL_KEYS.has(key)) return;
    if (fields.includes(key)) return;
    if (value === undefined || value === null || String(value).trim() === '') return;
    entries.push({ label: humanizeDetailKey(key), value: String(value) });
  });

  return entries;
}

export default function AdminRequestPanel({ onDecision }) {
  const socket = useContext(SocketContext);
  const { addToast } = useToast();
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
  const [editorLoading, setEditorLoading] = useState(false);
  const [editorForm, setEditorForm] = useState({
    service: '',
    date: '',
    slot: '',
    details: ''
  });
  const [editorDetailsFields, setEditorDetailsFields] = useState({});
  const [editorChapel, setEditorChapel] = useState('');
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [conflictData, setConflictData] = useState(null);
  const [pendingApprovalId, setPendingApprovalId] = useState(null);
  
  // New UX state
  const [selectedRequestIds, setSelectedRequestIds] = useState(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [requestView, setRequestView] = useState('active');

  // Bulk action handlers
  const handleSelectAll = () => {
    if (selectedRequestIds.size === paginatedRequests.length) {
      setSelectedRequestIds(new Set());
    } else {
      setSelectedRequestIds(new Set(paginatedRequests.map(r => r.id)));
    }
  };

  const handleSelectOne = (id) => {
    const newSet = new Set(selectedRequestIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedRequestIds(newSet);
  };

  const handleBulkApprove = async () => {
    setDeleteConfirm({ action: 'bulk-approve', count: selectedRequestIds.size });
  };

  const handleBulkReject = async () => {
    setDeleteConfirm({ action: 'bulk-reject', count: selectedRequestIds.size });
  };

  const confirmBulkAction = async () => {
    const action = deleteConfirm.action;
    const ids = Array.from(selectedRequestIds);
    try {
      setProcessingId('bulk');
      for (const id of ids) {
        if (action === 'bulk-approve') {
          await api.bookingRequests.approve(id);
        } else if (action === 'bulk-reject') {
          await api.bookingRequests.reject(id);
        }
      }
      await loadRequests();
      setSelectedRequestIds(new Set());
      addToast(`${ids.length} request(s) ${action === 'bulk-approve' ? 'approved' : 'rejected'} successfully!`, 'success');
      onDecision && onDecision();
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to process bulk action.';
      addToast(errorMsg, 'error');
    } finally {
      setProcessingId(null);
      setDeleteConfirm(null);
    }
  };

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
      chapel: detailsObj?.chapel || ''
    };
  };

  const requestReviewSummary = React.useMemo(() => {
    if (!editingRequest) return [];
    const detailsObj = editingRequest.details && typeof editingRequest.details === 'object'
      ? editingRequest.details
      : {};
    const key = String(editingRequest.service || '').trim().toLowerCase();
    const fields = SERVICE_FIELDS[key] || [];
    const rows = [
      { label: 'Request ID', value: editingRequest.id || '-' },
      { label: 'Name', value: editingRequest.name || '-' },
      { label: 'Email', value: editingRequest.email || '-' },
      { label: 'Service', value: editingRequest.service || '-' },
      { label: 'Date', value: editingRequest.date || '-' },
      { label: 'Time', value: editingRequest.slot || '-' }
    ];

    if (detailsObj.chapel) {
      rows.push({ label: 'Place / Chapel', value: detailsObj.chapel });
    }

    fields.forEach((field) => {
      if (field === 'chapel') return;
      const value = detailsObj[field];
      if (value === undefined || value === null || String(value).trim() === '') return;
      rows.push({ label: field, value: String(value) });
    });

    Object.entries(detailsObj).forEach(([keyName, value]) => {
      if (BOOKING_SHARED_DETAIL_KEYS.has(keyName)) return;
      if (fields.includes(keyName)) return;
      if (value === undefined || value === null || String(value).trim() === '') return;
      rows.push({ label: keyName, value: String(value) });
    });

    return rows;
  }, [editingRequest]);

  const [hasMore, setHasMore] = useState(false);

  const loadRequests = useCallback(async () => {
    try {
      const res = await api.bookingRequests.list({
        limit: 1000,
        offset: 0
      });
      setRequests(res.data || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load booking requests.');
    } finally {
      setLoading(false);
    }
  }, []);

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
        // Check for conflicts first
        const conflictRes = await api.bookingRequests.checkConflicts(requestId);
        if (conflictRes.data.hasConflicts) {
          // Show conflict modal
          setConflictData(conflictRes.data);
          setPendingApprovalId(requestId);
          setConflictModalOpen(true);
          setProcessingId(null);
          return;
        }
        // No conflicts, proceed with approval
        await api.bookingRequests.approve(requestId);
        addToast('Request approved successfully!', 'success');
      } else {
        await api.bookingRequests.reject(requestId);
        addToast('Request rejected.', 'success');
      }
      await loadRequests();
      onDecision && onDecision();
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to process booking request.';
      setError(errorMsg);
      addToast(errorMsg, 'error');
      setProcessingId(null);
    }
  };

  const handleConfirmApprovalWithConflict = async () => {
    try {
      setProcessingId(pendingApprovalId);
      setConflictModalOpen(false);
      setConflictData(null);
      await api.bookingRequests.approve(pendingApprovalId);
      await loadRequests();
      setPendingApprovalId(null);
      addToast('Request approved successfully!', 'success');
      onDecision && onDecision();
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to approve booking request.';
      setError(errorMsg);
      addToast(errorMsg, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleEdit = async (request) => {
    setEditorLoading(true);
    setEditorError('');
    try {
      const res = await api.bookingRequests.get(request.id);
      const freshRequest = res.data || request;
      const detailsObj = freshRequest.details && typeof freshRequest.details === 'object' ? freshRequest.details : {};
      const { fieldValues, chapel } = buildDetailsState(freshRequest.service, detailsObj);
      setEditingRequest(freshRequest);
      setEditorForm({
        service: freshRequest.service || '',
        date: freshRequest.date || '',
        slot: freshRequest.slot || '',
        details: JSON.stringify(freshRequest.details || {}, null, 2)
      });
      setEditorDetailsFields(fieldValues);
      setEditorChapel(chapel);
      setEditorOpen(true);
    } catch (err) {
      const fallback = request;
      const detailsObj = fallback.details && typeof fallback.details === 'object' ? fallback.details : {};
      const { fieldValues, chapel } = buildDetailsState(fallback.service, detailsObj);
      setEditingRequest(fallback);
      setEditorForm({
        service: fallback.service || '',
        date: fallback.date || '',
        slot: fallback.slot || '',
        details: JSON.stringify(fallback.details || {}, null, 2)
      });
      setEditorDetailsFields(fieldValues);
      setEditorChapel(chapel);
      setEditorError(err.response?.data?.error || 'Failed to load booking request.');
      setEditorOpen(true);
    } finally {
      setEditorLoading(false);
    }
  };

  const isPastDateTime = (date, time) => {
    if (!date) return false;
    const base = time ? `${date}T${time}` : `${date}T23:59`;
    const dt = new Date(base);
    if (Number.isNaN(dt.getTime())) {
      const dayOnly = new Date(`${date}T23:59`);
      return dayOnly < new Date();
    }
    return dt < new Date();
  };

  const activeRequests = React.useMemo(
    () => requests.filter((request) => String(request.status || 'pending').toLowerCase() === 'pending' && !isPastDateTime(request.date, request.slot)),
    [requests]
  );

  const historyRequests = React.useMemo(
    () => requests.filter((request) => String(request.status || 'pending').toLowerCase() !== 'pending' || isPastDateTime(request.date, request.slot)),
    [requests]
  );

  const visibleRequests = requestView === 'history' ? historyRequests : activeRequests;
  const paginatedRequests = visibleRequests.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setHasMore(page * pageSize < visibleRequests.length);
  }, [page, pageSize, visibleRequests]);

  useEffect(() => {
    setPage(1);
    setSelectedRequestIds(new Set());
  }, [requestView, requests]);

  if (loading) return <div>Loading booking requests...</div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <h2 className="admin-request-title" style={{ margin: 0 }}>Booking Request Panel</h2>
        <HelpIcon 
          title="Booking Requests Help"
          description={HELP_TEXT.requests}
          steps={[
            'Review pending booking requests from members',
            'Check for date/time conflicts with green warning',
            'Use bulk actions to approve/reject multiple requests',
            'Edit time or chapel if needed before approval'
          ]}
        />
      </div>
      {error && (
        <div style={{ marginBottom: 12, color: '#e53e3e', padding: 12, borderRadius: 8, background: '#fee2e2' }}>{error}</div>
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
                &times;
              </button>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              {editorLoading && (
                <div style={{ color: '#64748b', fontSize: 14 }}>Loading request details...</div>
              )}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, background: '#fbfaf7' }}>
                <div style={{ fontWeight: 800, marginBottom: 8, color: '#1f2937' }}>Original Request</div>
                <div style={{ display: 'grid', gap: 6, color: '#4a5568', fontSize: 14 }}>
                  {requestReviewSummary.map(item => (
                    <div key={item.label}>
                      <strong>{item.label}:</strong> {item.value}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 700, color: '#1f2937' }}>Submitted Service Details</label>
                <div style={{ display: 'grid', gap: 8 }}>
                  {(() => {
                    const key = String(editorForm.service || '').trim().toLowerCase();
                    const fields = SERVICE_FIELDS[key] || [];
                    if (!fields.length) {
                      return <div style={{ color: '#718096' }}>No structured fields for this service.</div>;
                    }
                    return fields.map(field => (
                      <div key={field} style={{ display: 'grid', gap: 4 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>{field}</div>
                        <div style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', minHeight: 40 }}>
                          {editorDetailsFields[field] ? String(editorDetailsFields[field]) : '-'}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
              <div style={{ border: '1px solid rgba(214,173,96,0.35)', borderRadius: 12, padding: 12, background: 'rgba(248,244,236,0.72)' }}>
                <div style={{ fontWeight: 800, marginBottom: 8, color: '#1f2937' }}>Editable Fields</div>
                <div style={{ color: '#4a5568', fontSize: 14, lineHeight: 1.5 }}>
                  Only the place / chapel and the time can be changed. Everything else is read-only for review.
                </div>
              </div>
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
                  disabled
                  style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 6 }}>Date</label>
                  <input
                    type="date"
                    value={editorForm.date}
                    disabled
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
                            readOnly
                            style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569' }}
                          />
                        </div>
                      ))}
                    </div>
                  );
                })()}
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
                      setEditorError('Preferred time must be between 8:00 AM and 6:00 PM.');
                      return;
                    }
                    try {
                      setEditorSaving(true);
                      setEditorError('');
                      const originalDetails = editingRequest.details && typeof editingRequest.details === 'object'
                        ? editingRequest.details
                        : {};
                      await api.bookingRequests.update(editingRequest.id, {
                        service: editorForm.service,
                        date: editorForm.date,
                        slot: editorForm.slot,
                        details: {
                          ...originalDetails,
                          chapel: editorChapel
                        }
                      });
                      setEditorOpen(false);
                      setEditingRequest(null);
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
      
      {/* Quick Filters */}
      <QuickFilters 
        filters={[
          { label: `Active (${activeRequests.length})`, value: 'active', active: requestView === 'active', onClick: () => setRequestView('active') },
          { label: `History (${historyRequests.length})`, value: 'history', active: requestView === 'history', onClick: () => setRequestView('history') },
        ]}
      />

      {requestView === 'history' && (
        <div style={{ marginBottom: 12 }}>
          <StatusBadge status="pending" label="Expired requests are kept here" />
          <div style={{ marginTop: 8, color: '#64748b', fontSize: 13, lineHeight: 1.5 }}>
            History includes approved and rejected requests, plus pending requests whose scheduled date or time already passed before they were reviewed.
          </div>
        </div>
      )}

      {/* Bulk Actions Toolbar */}
      {requestView === 'active' && selectedRequestIds.size > 0 && (
        <BulkActionsToolbar
          selectedCount={selectedRequestIds.size}
          onSelectAll={handleSelectAll}
          allSelected={paginatedRequests.length > 0 && selectedRequestIds.size === paginatedRequests.length}
          onApprove={handleBulkApprove}
          onReject={handleBulkReject}
          onClear={() => setSelectedRequestIds(new Set())}
        />
      )}

      {/* Confirmation Dialog for Bulk Actions */}
      {deleteConfirm && (
        <ConfirmationDialog
          title={deleteConfirm.action === 'bulk-approve' ? 'Approve Multiple Requests?' : 'Reject Multiple Requests?'}
          message={`Are you sure you want to ${deleteConfirm.action === 'bulk-approve' ? 'approve' : 'reject'} ${deleteConfirm.count} request(s)?`}
          isDangerous={deleteConfirm.action === 'bulk-reject'}
          onConfirm={confirmBulkAction}
          onCancel={() => setDeleteConfirm(null)}
          confirmText={deleteConfirm.action === 'bulk-approve' ? 'Approve All' : 'Reject All'}
          loading={processingId === 'bulk'}
        />
      )}
      
      <div className="admin-request-table-wrap">
        <table className="admin-request-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#eee' }}>
            <th style={{ ...th, width: 40, padding: 8, textAlign: 'center' }}>
              {requestView === 'active' ? (
                <SelectCheckbox 
                  checked={paginatedRequests.length > 0 && selectedRequestIds.size === paginatedRequests.length}
                  onChange={handleSelectAll}
                />
              ) : null}
            </th>
            <th style={th}>ID</th>
            <th style={th}>Name</th>
            <th style={th}>Email</th>
            <th style={th}>Service</th>
            <th style={th}>Date</th>
            <th style={th}>Slot</th>
            <th style={th}>Place / Chapel</th>
            <th style={th}>Status</th>
            <th style={th}>Details</th>
            <th style={{ ...th, ...actionsColStyle }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {paginatedRequests.map(r => (
            (() => {
              const detailEntries = buildDetailEntries(r);
              const normalizedStatus = String(r.status || 'pending').toLowerCase();
              const isHistoricalPending = normalizedStatus === 'pending' && isPastDateTime(r.date, r.slot);
              return (
            <tr key={r.id} style={{ background: selectedRequestIds.has(r.id) ? '#f0f4ff' : undefined }}>
              <td style={{ ...td, textAlign: 'center', width: 40 }}>
                {requestView === 'active' ? (
                  <SelectCheckbox 
                    checked={selectedRequestIds.has(r.id)}
                    onChange={() => handleSelectOne(r.id)}
                  />
                ) : null}
              </td>
              <td style={td}>{r.id}</td>
              <td style={td}>{r.name || '-'}</td>
              <td style={td}>{r.email || '-'}</td>
              <td style={td}>{r.service || '-'}</td>
              <td style={td}>{r.date || '-'}</td>
              <td style={td}>{r.slot || '-'}</td>
              <td style={td}>{r.chapel || r.details?.chapel || '-'}</td>
              <td style={td}>
                <StatusBadge status={isHistoricalPending ? 'pending' : normalizedStatus} label={isHistoricalPending ? 'Expired' : undefined} />
              </td>
              <td style={{ ...td, minWidth: 280 }}>
                {detailEntries.length ? (
                  <div style={{ display: 'grid', gap: 4, lineHeight: 1.35 }}>
                    {detailEntries.map((item) => (
                      <div key={`${r.id}-${item.label}`} style={{ wordBreak: 'break-word' }}>
                        <strong>{item.label}:</strong> {item.value}
                      </div>
                    ))}
                  </div>
                ) : (
                  '-'
                )}
              </td>
              <td style={{ ...td, ...actionsColStyle }}>
                {requestView === 'active' ? (
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
                ) : (
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Archived</span>
                )}
              </td>
            </tr>
              );
            })()
          ))}
          {paginatedRequests.length === 0 && (
            <tr>
              <td style={td} colSpan={11}>
                {requestView === 'history' ? 'No request history yet.' : 'No active booking requests.'}
              </td>
            </tr>
          )}
        </tbody>
        </table>
      </div>

      {/* Conflict Warning Modal */}
      {conflictModalOpen && conflictData && (
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
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: 8,
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
            maxWidth: 700,
            maxHeight: '80vh',
            overflow: 'auto',
            padding: 30
          }}>
            <h2 style={{ color: '#d97706', marginTop: 0, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
              ✦¸⚠️ Booking Conflict Warning
            </h2>
            
            <p style={{ color: '#555', marginBottom: 20, lineHeight: 1.6 }}>
              There's already an accepted booking at the same <strong>date and time</strong>. Please review both bookings before proceeding:
            </p>

            {/* Booking Request Being Accepted */}
            <div style={{ 
              padding: 15, 
              backgroundColor: '#e0f2fe', 
              borderLeft: '4px solid #0284c7',
              borderRadius: 4,
              marginBottom: 20
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#0c4a6e' }}>✦ Booking Request (Being Accepted)</h4>
              <table style={{ width: '100%', fontSize: 14, lineHeight: 1.8 }}>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 600, width: '35%', color: '#333' }}>Service:</td>
                    <td style={{ color: '#555' }}>{conflictData.requestData.service}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600, color: '#333' }}>Date:</td>
                    <td style={{ color: '#555' }}>{conflictData.requestData.date}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600, color: '#333' }}>Time:</td>
                    <td style={{ color: '#555' }}>{conflictData.requestData.slot}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600, color: '#333' }}>Name:</td>
                    <td style={{ color: '#555' }}>{conflictData.requestData.name}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600, color: '#333' }}>Chapel:</td>
                    <td style={{ color: '#555' }}>{conflictData.requestData.details?.chapel || '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Existing Bookings */}
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#dc2626' }}>✦ Existing Booking(s) - Same Date & Time</h4>
              {conflictData.conflictingBookings.map((booking, idx) => (
                <div key={idx} style={{ 
                  padding: 15, 
                  backgroundColor: '#fee2e2', 
                  borderLeft: '4px solid #dc2626',
                  borderRadius: 4,
                  marginBottom: 10
                }}>
                  <table style={{ width: '100%', fontSize: 14, lineHeight: 1.8 }}>
                    <tbody>
                      <tr>
                        <td style={{ fontWeight: 600, width: '35%', color: '#333' }}>Service:</td>
                        <td style={{ color: '#555' }}>{booking.service}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 600, color: '#333' }}>Date:</td>
                        <td style={{ color: '#555' }}>{booking.date}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 600, color: '#333' }}>Time:</td>
                        <td style={{ color: '#555' }}>{booking.slot}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 600, color: '#333' }}>Name:</td>
                        <td style={{ color: '#555' }}>{booking.name}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 600, color: '#333' }}>Email:</td>
                        <td style={{ color: '#555' }}>{booking.email || '-'}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 600, color: '#333' }}>Chapel:</td>
                        <td style={{ color: '#555' }}>{booking.details?.chapel || '-'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ))}
            </div>

            {/* Warning Message */}
            <div style={{ 
              padding: 12, 
              backgroundColor: '#fef3c7', 
              borderLeft: '4px solid #f59e0b',
              borderRadius: 4,
              marginBottom: 20,
              color: '#78350f',
              fontSize: 14
            }}>
              <strong>⚠️ Action Required:</strong> These bookings have the same date and time. Please verify if this is intentional.
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setConflictModalOpen(false);
                  setConflictData(null);
                  setPendingApprovalId(null);
                  setProcessingId(null);
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#e5e7eb',
                  color: '#333',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 14
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmApprovalWithConflict}
                disabled={processingId === pendingApprovalId}
                style={{
                  padding: '10px 20px',
                  backgroundColor: processingId === pendingApprovalId ? '#9ca3af' : '#dc2626',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: processingId === pendingApprovalId ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: 14
                }}
              >
                {processingId === pendingApprovalId ? 'Approving...' : 'Approve Anyway'}
              </button>
            </div>
          </div>
        </div>
      )}

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

