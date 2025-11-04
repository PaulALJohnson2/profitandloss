import React, { useState, useEffect, useRef } from 'react';
import { saveOrUpdateWages, getWagesByMonth } from '../firebase/firestoreService';
import { formatCurrency } from '../utils/formatters';
import { useAuth } from '../contexts/AuthContext';

function WagesForm({ onSave, year = '2024-25', initialMonth = 'October' }) {
  const { currentUser } = useAuth();

  // Refs for input fields
  const netOutRef = useRef(null);
  const invoicesRef = useRef(null);
  const hmrcRef = useRef(null);
  const nestRef = useRef(null);

  // Define fiscal year month order
  const fiscalYearMonths = [
    'October', 'November', 'December',
    'January', 'February', 'March',
    'April', 'May', 'June',
    'July', 'August', 'September'
  ];

  const [formData, setFormData] = useState({
    month: initialMonth,
    netOut: '',
    invoices: '',
    hmrc: '',
    nest: ''
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [existingRecord, setExistingRecord] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Update month when initialMonth changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      month: initialMonth
    }));
  }, [initialMonth]);

  // Check if wages exist for the selected month
  useEffect(() => {
    const checkExisting = async () => {
      if (formData.month && currentUser) {
        const result = await getWagesByMonth(currentUser.uid, year, formData.month);
        if (result.success && result.data) {
          setExistingRecord(result.data);
          // Pre-fill form with existing data
          setFormData({
            month: formData.month,
            netOut: result.data.netOut || '',
            invoices: result.data.invoices || '',
            hmrc: result.data.hmrc || '',
            nest: result.data.nest || ''
          });
          setMessage({ type: 'info', text: 'Existing record found - editing mode' });
        } else {
          setExistingRecord(null);
          setMessage({ type: '', text: '' });
          // Reset fields except month
          setFormData(prev => ({
            month: prev.month,
            netOut: '',
            invoices: '',
            hmrc: '',
            nest: ''
          }));
        }
      }
    };
    checkExisting();
  }, [formData.month, currentUser, year]);

  // Auto-focus netOut field when form opens
  useEffect(() => {
    if (netOutRef.current) {
      netOutRef.current.focus();
    }
  }, []);

  // Handle Enter key to move to next field
  const handleKeyDown = (e, nextRef) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (nextRef && nextRef.current) {
        nextRef.current.focus();
      } else {
        // On last field, submit the form
        handleSubmit(e);
      }
    }
  };

  // Helper function to round to 2 decimal places
  const roundTo2Decimals = (num) => {
    return Math.round((parseFloat(num) || 0) * 100) / 100;
  };

  // Calculate total
  const calculateTotal = () => {
    const netOut = parseFloat(formData.netOut) || 0;
    const invoices = parseFloat(formData.invoices) || 0;
    const hmrc = parseFloat(formData.hmrc) || 0;
    const nest = parseFloat(formData.nest) || 0;

    return roundTo2Decimals(netOut + invoices + hmrc + nest);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentUser) {
      setError('User not authenticated');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const wagesData = {
        netOut: roundTo2Decimals(formData.netOut),
        invoices: roundTo2Decimals(formData.invoices),
        hmrc: roundTo2Decimals(formData.hmrc),
        nest: roundTo2Decimals(formData.nest),
        total: calculateTotal()
      };

      const result = await saveOrUpdateWages(
        currentUser.uid,
        year,
        formData.month,
        wagesData
      );

      if (result.success) {
        setShowConfirmation(true);
        setTimeout(() => {
          setShowConfirmation(false);
          // Reset form
          setFormData({
            month: formData.month,
            netOut: '',
            invoices: '',
            hmrc: '',
            nest: ''
          });
          if (onSave) onSave();
        }, 1500);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card" style={{ marginBottom: '2rem' }}>
      <h2>Enter Monthly Wages</h2>

      {message.text && message.type === 'info' && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#bee3f8',
          color: '#2c5282',
          borderRadius: '4px',
          marginBottom: '1rem',
          fontWeight: '500'
        }}>
          ℹ️ {message.text}
        </div>
      )}

      {error && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#fed7d7',
          color: '#c53030',
          borderRadius: '4px',
          marginBottom: '1rem'
        }}>
          {error}
        </div>
      )}

      {showConfirmation && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#c6f6d5',
          color: '#22543d',
          borderRadius: '4px',
          marginBottom: '1rem'
        }}>
          ✓ Wages saved successfully!
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Month
            </label>
            <select
              name="month"
              value={formData.month}
              onChange={handleInputChange}
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #cbd5e0',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
            >
              {fiscalYearMonths.map(month => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Net Out (£)
            </label>
            <input
              ref={netOutRef}
              type="number"
              name="netOut"
              value={formData.netOut}
              onChange={handleInputChange}
              onKeyDown={(e) => handleKeyDown(e, invoicesRef)}
              step="0.01"
              placeholder="0.00"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #cbd5e0',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Invoices (without VAT) (£)
            </label>
            <input
              ref={invoicesRef}
              type="number"
              name="invoices"
              value={formData.invoices}
              onChange={handleInputChange}
              onKeyDown={(e) => handleKeyDown(e, hmrcRef)}
              step="0.01"
              placeholder="0.00"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #cbd5e0',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              HMRC (£)
            </label>
            <input
              ref={hmrcRef}
              type="number"
              name="hmrc"
              value={formData.hmrc}
              onChange={handleInputChange}
              onKeyDown={(e) => handleKeyDown(e, nestRef)}
              step="0.01"
              placeholder="0.00"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #cbd5e0',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
            />
            <small style={{ color: '#718096' }}>Negative for refunds</small>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Nest (£)
            </label>
            <input
              ref={nestRef}
              type="number"
              name="nest"
              value={formData.nest}
              onChange={handleInputChange}
              onKeyDown={(e) => handleKeyDown(e, null)}
              step="0.01"
              placeholder="0.00"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #cbd5e0',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
            />
          </div>
        </div>

        <div style={{
          padding: '1rem',
          backgroundColor: '#f7fafc',
          borderRadius: '4px',
          marginBottom: '1rem'
        }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
            Total: {formatCurrency(calculateTotal())}
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          style={{
            padding: '0.75rem 2rem',
            backgroundColor: saving ? '#cbd5e0' : '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
            fontWeight: '500'
          }}
        >
          {saving ? 'Saving...' : 'Save Wages'}
        </button>
      </form>
    </div>
  );
}

export default WagesForm;
