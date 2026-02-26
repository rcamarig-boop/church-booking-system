import React, { useCallback, useContext, useEffect, useState } from 'react';
import api from './api';
import { SocketContext } from './App';

const th = {
  padding: 8,
  border: '1px solid #ccc',
  textAlign: 'left',
};

const td = {
  padding: 8,
  border: '1px solid #ccc',
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

  const loadRequests = useCallback(async () => {
    try {
      const res = await api.bookingRequests.list();
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

  const handleEdit = async (request) => {
    const service = window.prompt('Service', request.service || '');
    if (service === null) return;
    const date = window.prompt('Date (YYYY-MM-DD)', request.date || '');
    if (date === null) return;
    const slot = window.prompt('Time slot (HH:MM, AM, or PM)', request.slot || '');
    if (slot === null) return;
    const detailsText = window.prompt(
      'Details JSON',
      JSON.stringify(request.details || {}, null, 2)
    );
    if (detailsText === null) return;

    let details = {};
    try {
      details = detailsText.trim() ? JSON.parse(detailsText) : {};
    } catch {
      setError('Invalid details JSON.');
      return;
    }

    try {
      setProcessingId(request.id);
      setError(null);
      await api.bookingRequests.update(request.id, { service, date, slot, details });
      await loadRequests();
      onDecision && onDecision();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to edit booking request.');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return <div>Loading booking requests...</div>;

  return (
    <div>
      <h2>Booking Request Panel</h2>
      {error && (
        <div style={{ marginBottom: 12, color: '#e53e3e' }}>{error}</div>
      )}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#eee' }}>
            <th style={th}>ID</th>
            <th style={th}>Name</th>
            <th style={th}>Email</th>
            <th style={th}>Service</th>
            <th style={th}>Date</th>
            <th style={th}>Slot</th>
            <th style={th}>Details</th>
            <th style={th}>Actions</th>
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
              <td style={td}>
                {r.details && typeof r.details === 'object'
                  ? Object.entries(r.details)
                      .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== '')
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(' | ')
                  : '-'}
              </td>
              <td style={td}>
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
              <td style={td} colSpan={8}>No pending booking requests.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
