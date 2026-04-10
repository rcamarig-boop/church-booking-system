import React, { useState } from 'react';
import api from './api';
import { DATE_FIELD_KEYS, NAME_FIELD_KEYS, PHONE_FIELD_KEYS, NAME_MAX_LENGTH } from './inputValidation';

const SERVICE_FIELDS = {
  counseling: ['fullName', 'phone', 'concern'],
  baptism: ['childName', 'birthDate', 'motherName', 'fatherName'],
  wedding: ['groomName', 'brideName', 'contactNumber'],
  blessing: ['personName', 'blessingType', 'notes'],
  funeral: ['deceasedName', 'deceasedBirthDate', 'dateOfDeath', 'familyContact'],
  christening: ['childName', 'guardianName', 'contactNumber'],
  confessions: ['fullName', 'phone', 'frequencyOfConfession', 'confessionNotes'],
  'pastoral visits': ['fullName', 'phone', 'reasonForVisit', 'specialNeeds']
};

const NUMERIC_ONLY_FIELDS = new Set(['phone', 'contactNumber', 'familyContact']);

const humanizeLabel = (key) => {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
};

export default function MassServiceApplyModal({ service, isOpen, onClose, onApplied }) {
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !service) return null;

  const serviceKey = String(service.service_type || '').trim().toLowerCase();
  const fields = SERVICE_FIELDS[serviceKey] || [];

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    for (const field of fields) {
      const value = String(formData[field] || '').trim();
      if (!value) {
        setError(`${humanizeLabel(field)} is required`);
        return false;
      }
      if (DATE_FIELD_KEYS.has(field)) {
        const date = new Date(value);
        if (date > new Date()) {
          setError(`${humanizeLabel(field)} cannot be in the future`);
          return false;
        }
      }
      if (NUMERIC_ONLY_FIELDS.has(field) && !/^\d+$/.test(value)) {
        setError(`${humanizeLabel(field)} must contain numbers only`);
        return false;
      }
      if (NAME_FIELD_KEYS.has(field) && value.length > NAME_MAX_LENGTH) {
        setError(`${humanizeLabel(field)} must be ${NAME_MAX_LENGTH} characters or less`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      setError('');
      await api.massServices.apply(service.id, formData);
      onApplied?.();
      setFormData({});
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
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
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: 12,
          padding: 24,
          maxWidth: 500,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, color: '#1f2937' }}>
            Apply for {service.service_type}
          </h3>
          <button
            onClick={onClose}
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

        <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#f3f4f6', borderRadius: 8 }}>
          <div style={{ fontSize: 14, color: '#4b5563' }}>
            <strong>Date:</strong> {service.date} • <strong>Time:</strong> {service.time}
          </div>
          <div style={{ fontSize: 14, color: '#4b5563', marginTop: 4 }}>
            <strong>Chapel:</strong> {service.chapel}
          </div>
          {service.description && (
            <div style={{ fontSize: 14, color: '#4b5563', marginTop: 4 }}>
              {service.description}
            </div>
          )}
        </div>

        {error && (
          <div style={{
            marginBottom: 16,
            padding: 12,
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            borderRadius: 8,
            fontSize: 14
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
          {fields.map(field => (
            <div key={field}>
              <label style={{
                display: 'block',
                marginBottom: 6,
                fontWeight: 600,
                fontSize: 14,
                color: '#1f2937'
              }}>
                {humanizeLabel(field)} {field ? '*' : ''}
              </label>
              <input
                type={DATE_FIELD_KEYS.has(field) ? 'date' : 'text'}
                value={formData[field] || ''}
                onChange={e => handleChange(field, e.target.value)}
                inputMode={PHONE_FIELD_KEYS.has(field) ? 'numeric' : undefined}
                maxLength={PHONE_FIELD_KEYS.has(field) ? 11 : NAME_FIELD_KEYS.has(field) ? NAME_MAX_LENGTH : undefined}
                style={{
                  width: '100%',
                  padding: 10,
                  border: '1px solid #e5e7eb',
                  borderRadius: 6,
                  fontSize: 14,
                  fontFamily: 'inherit'
                }}
                placeholder={humanizeLabel(field)}
              />
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '10px 16px',
              backgroundColor: '#e5e7eb',
              color: '#1f2937',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              padding: '10px 16px',
              backgroundColor: loading ? '#9ca3af' : '#0284c7',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: 14
            }}
          >
            {loading ? 'Submitting...' : 'Submit Application'}
          </button>
        </div>
      </div>
    </div>
  );
}
