import React, { useState, useEffect, useRef } from 'react';
import { saveOrUpdateFixedCost, getFixedCostById, deleteFixedCost } from '../firebase/firestoreService';
import { formatCurrency } from '../utils/formatters';
import { useAuth } from '../contexts/AuthContext';

function FixedCostForm({ onSave, initialServiceId = null, year = '2024-25' }) {
  const { currentUser } = useAuth();
  const serviceInputRef = useRef(null);
  const [formData, setFormData] = useState({
    service: '',
    cost: '',
    netCost: '',
    vat: '',
    frequency: 'monthly',
    dayOfWeek: '5', // For weekly: day of week (0-6)
    dayOfMonth: '1', // For monthly: day of month (1-31)
    yearlyDate: '', // For yearly: specific date (MM-DD format)
    includesVat: true // Whether cost includes VAT
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [existingRecord, setExistingRecord] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellationDate, setCancellationDate] = useState('');

  // Load existing record if editing
  useEffect(() => {
    const loadExisting = async () => {
      if (initialServiceId && currentUser) {
        const result = await getFixedCostById(currentUser.uid, year, initialServiceId);
        if (result.success && result.data) {
          setExistingRecord(result.data);
          setFormData({
            service: result.data.service || '',
            cost: result.data.cost ? result.data.cost.toFixed(2) : '',
            netCost: result.data.netCost ? result.data.netCost.toFixed(2) : '',
            vat: result.data.vat ? result.data.vat.toFixed(2) : '',
            frequency: result.data.frequency || 'monthly',
            dayOfWeek: result.data.dayOfWeek || '5',
            dayOfMonth: result.data.dayOfMonth || '1',
            yearlyDate: result.data.yearlyDate || '',
            includesVat: result.data.includesVat !== undefined ? result.data.includesVat : true
          });
          setMessage({ type: 'info', text: 'Editing existing fixed cost' });
        }
      }
    };
    loadExisting();
  }, [initialServiceId, currentUser, year]);

  // Focus service input when form loads
  useEffect(() => {
    if (serviceInputRef.current) {
      serviceInputRef.current.focus();
    }
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;

    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));

    // Auto-calculate net cost and VAT when cost or includesVat changes
    if (name === 'cost' || name === 'includesVat') {
      const cost = name === 'cost' ? (parseFloat(value) || 0) : (parseFloat(formData.cost) || 0);
      const includesVat = name === 'includesVat' ? checked : formData.includesVat;

      let netCost, vat;
      if (includesVat) {
        // Cost includes VAT: extract net cost and VAT
        netCost = cost / 1.2;
        vat = cost - netCost;
      } else {
        // Cost is VAT-exempt: no VAT to calculate
        netCost = cost;
        vat = 0;
      }

      setFormData(prev => ({
        ...prev,
        cost: cost > 0 ? cost.toFixed(2) : '',
        netCost: netCost > 0 ? netCost.toFixed(2) : '0.00',
        vat: vat.toFixed(2),
        includesVat
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (!currentUser) {
      setMessage({ type: 'error', text: 'You must be logged in to save fixed costs' });
      return;
    }

    setLoading(true);

    try {
      // Generate serviceId from service name if new, or use existing
      const serviceId = initialServiceId || formData.service.toLowerCase().replace(/[^a-z0-9]/g, '-');

      const dataToSave = {
        service: formData.service,
        cost: parseFloat(formData.cost),
        netCost: parseFloat(formData.netCost),
        vat: parseFloat(formData.vat),
        frequency: formData.frequency,
        includesVat: formData.includesVat
      };

      // Add frequency-specific fields
      if (formData.frequency === 'weekly') {
        dataToSave.dayOfWeek = parseInt(formData.dayOfWeek);
      } else if (formData.frequency === 'monthly') {
        dataToSave.dayOfMonth = parseInt(formData.dayOfMonth);
      } else if (formData.frequency === 'yearly') {
        dataToSave.yearlyDate = formData.yearlyDate; // Format: MM-DD
      }

      const result = await saveOrUpdateFixedCost(currentUser.uid, year, serviceId, dataToSave);

      if (result.success) {
        setMessage({
          type: 'success',
          text: existingRecord ? 'Fixed cost updated successfully!' : 'Fixed cost added successfully!'
        });

        // Call parent callback if provided
        if (onSave) {
          onSave();
        }

        // Reset form if adding new
        if (!initialServiceId) {
          setTimeout(() => {
            setFormData({
              service: '',
              cost: '',
              netCost: '',
              vat: '',
              frequency: 'monthly',
              dayOfWeek: '5',
              dayOfMonth: '1',
              yearlyDate: '',
              includesVat: true
            });
            setMessage({ type: '', text: '' });
            if (serviceInputRef.current) {
              serviceInputRef.current.focus();
            }
          }, 1500);
        }
      } else {
        setMessage({
          type: 'error',
          text: `Error: ${result.error}`
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: `Failed to save: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelClick = () => {
    setShowDeleteConfirm(false);
    setShowCancelModal(true);
    // Default to today's date
    setCancellationDate(new Date().toISOString().split('T')[0]);
  };

  const handleConfirmCancellation = async () => {
    if (!currentUser || !initialServiceId || !cancellationDate) return;

    setLoading(true);
    setShowCancelModal(false);

    try {
      // Update the fixed cost with cancellation date instead of deleting
      const dataToSave = {
        ...existingRecord,
        cancelledDate: cancellationDate,
        cancelled: true
      };

      const result = await saveOrUpdateFixedCost(currentUser.uid, year, initialServiceId, dataToSave);

      if (result.success) {
        setMessage({
          type: 'success',
          text: 'Fixed cost cancelled successfully!'
        });

        if (onSave) {
          onSave();
        }
      } else {
        setMessage({
          type: 'error',
          text: `Error: ${result.error}`
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: `Failed to cancel: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>{existingRecord ? 'Edit' : 'Add'} Fixed Cost</h2>

      {message.text && (
        <div style={{
          padding: '1rem',
          marginBottom: '1rem',
          borderRadius: '4px',
          backgroundColor: message.type === 'success' ? '#d4edda' :
                          message.type === 'error' ? '#f8d7da' : '#d1ecf1',
          color: message.type === 'success' ? '#155724' :
                 message.type === 'error' ? '#721c24' : '#0c5460',
          border: `1px solid ${message.type === 'success' ? '#c3e6cb' :
                                message.type === 'error' ? '#f5c6cb' : '#bee5eb'}`
        }}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>

          <div className="filter-group">
            <label>Service Name *</label>
            <input
              ref={serviceInputRef}
              type="text"
              name="service"
              value={formData.service}
              onChange={handleChange}
              required
              disabled={!!initialServiceId}
              placeholder="e.g., Rent, Insurance, Abbie's Pay"
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e0' }}
            />
          </div>

          <div className="filter-group">
            <label>Frequency *</label>
            <select
              name="frequency"
              value={formData.frequency}
              onChange={handleChange}
              required
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e0' }}
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          {formData.frequency === 'weekly' && (
            <div className="filter-group">
              <label>Day of Week *</label>
              <select
                name="dayOfWeek"
                value={formData.dayOfWeek}
                onChange={handleChange}
                required
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e0' }}
              >
                <option value="0">Sunday</option>
                <option value="1">Monday</option>
                <option value="2">Tuesday</option>
                <option value="3">Wednesday</option>
                <option value="4">Thursday</option>
                <option value="5">Friday</option>
                <option value="6">Saturday</option>
              </select>
            </div>
          )}

          {formData.frequency === 'monthly' && (
            <div className="filter-group">
              <label>Day of Month *</label>
              <select
                name="dayOfMonth"
                value={formData.dayOfMonth}
                onChange={handleChange}
                required
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e0' }}
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>
          )}

          {formData.frequency === 'yearly' && (
            <div className="filter-group">
              <label>Date (Month & Day) *</label>
              <input
                type="text"
                name="yearlyDate"
                value={formData.yearlyDate}
                onChange={handleChange}
                required
                placeholder="MM-DD (e.g., 01-15 for Jan 15th)"
                pattern="(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])"
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e0' }}
              />
              <small style={{ color: '#718096', fontSize: '0.875rem' }}>
                Format: MM-DD (e.g., 03-15 for March 15th)
              </small>
            </div>
          )}

          <div className="filter-group">
            <label>
              {formData.frequency === 'weekly' && 'Weekly '}
              {formData.frequency === 'monthly' && 'Monthly '}
              {formData.frequency === 'yearly' && 'Yearly '}
              Cost *
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#4a5568',
                fontWeight: '500',
                pointerEvents: 'none'
              }}>£</span>
              <input
                type="number"
                name="cost"
                value={formData.cost}
                onChange={handleChange}
                step="0.01"
                required
                placeholder="0.00"
                style={{ padding: '0.5rem 0.5rem 0.5rem 1.5rem', borderRadius: '4px', border: '1px solid #cbd5e0', width: '100%' }}
              />
            </div>
          </div>

          <div className="filter-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                name="includesVat"
                checked={formData.includesVat}
                onChange={handleChange}
                style={{ width: '1.25rem', height: '1.25rem', cursor: 'pointer' }}
              />
              <span>Includes VAT</span>
            </label>
            <small style={{ color: '#718096', fontSize: '0.875rem', display: 'block', marginTop: '0.25rem' }}>
              {formData.includesVat ? 'Cost includes 20% VAT' : 'Cost is VAT-exempt'}
            </small>
          </div>

          <div className="filter-group">
            <label>Net Cost (excl. VAT)</label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#4a5568',
                fontWeight: '500',
                pointerEvents: 'none'
              }}>£</span>
              <input
                type="number"
                name="netCost"
                value={formData.netCost}
                readOnly
                placeholder="Auto-calculated"
                style={{ padding: '0.5rem 0.5rem 0.5rem 1.5rem', borderRadius: '4px', border: '1px solid #cbd5e0', backgroundColor: '#f7fafc', width: '100%' }}
              />
            </div>
          </div>

          <div className="filter-group">
            <label>VAT</label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#4a5568',
                fontWeight: '500',
                pointerEvents: 'none'
              }}>£</span>
              <input
                type="number"
                name="vat"
                value={formData.vat}
                readOnly
                placeholder="Auto-calculated"
                style={{ padding: '0.5rem 0.5rem 0.5rem 1.5rem', borderRadius: '4px', border: '1px solid #cbd5e0', backgroundColor: '#f7fafc', width: '100%' }}
              />
            </div>
          </div>

        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '1rem', marginTop: '1.5rem', alignItems: 'center' }}>
          <div style={{ justifySelf: 'start' }}>
            {existingRecord && !existingRecord.cancelled && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={loading}
                style={{
                  padding: '0.75rem 2rem',
                  backgroundColor: loading ? '#cbd5e0' : '#e53e3e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: '500',
                  fontSize: '1rem'
                }}
              >
                Cancel Service
              </button>
            )}

            {existingRecord && existingRecord.cancelled && (
              <div style={{
                padding: '0.75rem 1rem',
                backgroundColor: '#fed7d7',
                color: '#c53030',
                borderRadius: '4px',
                fontWeight: '500'
              }}>
                Cancelled on {new Date(existingRecord.cancelledDate).toLocaleDateString('en-GB')}
              </div>
            )}
          </div>

          <div style={{ justifySelf: 'center' }}>
            {existingRecord && onSave && (
              <button
                type="button"
                onClick={onSave}
                disabled={loading}
                style={{
                  padding: '0.75rem 2rem',
                  backgroundColor: '#e2e8f0',
                  color: '#4a5568',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: '500',
                  fontSize: '1rem'
                }}
              >
                Close
              </button>
            )}
          </div>

          <div style={{ justifySelf: 'end' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '0.75rem 2rem',
                backgroundColor: loading ? '#cbd5e0' : '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: '500',
                fontSize: '1rem'
              }}
            >
              {loading ? 'Saving...' : (existingRecord ? 'Update' : 'Add Fixed Cost')}
            </button>
          </div>
        </div>
      </form>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
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
            zIndex: 1000
          }}
        >
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '8px',
            maxWidth: '450px',
            width: '90%'
          }}>
            <h2 style={{ marginTop: 0 }}>Cancel Fixed Cost</h2>
            <p>Are you sure you want to cancel "{formData.service}"?</p>
            <p style={{ fontSize: '0.875rem', color: '#718096', marginTop: '0.5rem' }}>
              This will mark the service as cancelled and it will stop being included in future calculations.
              Historical data will remain accurate up to the cancellation date.
            </p>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#e2e8f0',
                  color: '#4a5568',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Go Back
              </button>
              <button
                onClick={handleCancelClick}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#e53e3e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Date Modal */}
      {showCancelModal && (
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
            zIndex: 1001
          }}
        >
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '8px',
            maxWidth: '400px',
            width: '90%'
          }}>
            <h2 style={{ marginTop: 0 }}>When was this service cancelled?</h2>
            <p style={{ fontSize: '0.875rem', color: '#718096', marginBottom: '1rem' }}>
              Enter the date this fixed cost was cancelled. It will be included in calculations up to this date.
            </p>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Cancellation Date *
              </label>
              <input
                type="date"
                value={cancellationDate}
                onChange={(e) => setCancellationDate(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e0',
                  fontSize: '1rem'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCancelModal(false)}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#e2e8f0',
                  color: '#4a5568',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Back
              </button>
              <button
                onClick={handleConfirmCancellation}
                disabled={!cancellationDate}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: cancellationDate ? '#e53e3e' : '#cbd5e0',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: cancellationDate ? 'pointer' : 'not-allowed',
                  fontWeight: '500'
                }}
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FixedCostForm;
