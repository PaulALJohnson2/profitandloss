import React, { useState, useEffect } from 'react';
import { saveOrUpdateDailyFigure, getDailyFigureByDate } from '../firebase/firestoreService';
import { formatCurrency } from '../utils/formatters';
import { useAuth } from '../contexts/AuthContext';

function DailyFigureForm({ onSave, initialDate = null, year = '2024-25' }) {
  const { currentUser } = useAuth();
  const today = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    date: initialDate || today,
    grossTotal: '',
    netTotal: '',
    fee: '',
    grossIncome: '',
    netIncome: '',
    vat: '',
    abbiesPay: ''
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [existingRecord, setExistingRecord] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [calculatedValues, setCalculatedValues] = useState(null);

  // Check if a record exists for the selected date
  useEffect(() => {
    const checkExisting = async () => {
      if (formData.date && currentUser) {
        const result = await getDailyFigureByDate(currentUser.uid, year, formData.date);
        if (result.success && result.data) {
          setExistingRecord(result.data);
          // Pre-fill form with existing data
          setFormData({
            date: result.data.date,
            grossTotal: result.data.grossTotal || '',
            netTotal: result.data.netTotal || '',
            fee: result.data.fee || '',
            grossIncome: result.data.grossIncome || '',
            netIncome: result.data.netIncome || '',
            vat: result.data.vat || '',
            abbiesPay: result.data.abbiesPay || ''
          });
          setMessage({ type: 'info', text: 'Existing record found - editing mode' });
        } else {
          setExistingRecord(null);
          setMessage({ type: '', text: '' });
        }
      }
    };
    checkExisting();
  }, [formData.date, currentUser, year]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Calculate all related fields
  const calculateValues = (grossTotal, date) => {
    const gross = parseFloat(grossTotal) || 0;

    // Calculate Fee using exact spreadsheet formula: =SUM((B2*0.72)/1.2)
    const fee = (gross * 0.72) / 1.2;

    // Calculate Abbie's Pay (£455.37 if Friday, otherwise 0)
    let abbiesPay = 0;
    if (date) {
      const selectedDate = new Date(date);
      const dayOfWeek = selectedDate.getDay(); // 0 = Sunday, 5 = Friday
      if (dayOfWeek === 5) { // Friday
        abbiesPay = 455.37;
      }
    }

    // Calculate Net Total (Gross Total / 1.2)
    const netTotal = gross / 1.2;

    // Calculate Gross Income (Gross Total - Fee)
    const grossIncome = gross - fee;

    // Calculate Net Income (Gross Income / 1.2)
    const netIncome = grossIncome / 1.2;

    // Calculate VAT (Gross Income - Net Income)
    const vat = grossIncome - netIncome;

    return {
      grossTotal: gross,
      fee: parseFloat(fee.toFixed(2)),
      abbiesPay: parseFloat(abbiesPay.toFixed(2)),
      netTotal: parseFloat(netTotal.toFixed(2)),
      grossIncome: parseFloat(grossIncome.toFixed(2)),
      netIncome: parseFloat(netIncome.toFixed(2)),
      vat: parseFloat(vat.toFixed(2))
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (!currentUser) {
      setMessage({ type: 'error', text: 'You must be logged in to save daily figures' });
      return;
    }

    // Calculate all values
    const calculated = calculateValues(formData.grossTotal, formData.date);
    setCalculatedValues(calculated);
    setShowConfirmation(true);
  };

  const handleConfirmSave = async () => {
    setLoading(true);
    setShowConfirmation(false);

    try {
      const result = await saveOrUpdateDailyFigure(currentUser.uid, year, formData.date, calculatedValues);

      if (result.success) {
        setMessage({
          type: 'success',
          text: existingRecord ? 'Daily figure updated successfully!' : 'Daily figure saved successfully!'
        });

        // Call parent callback if provided
        if (onSave) {
          onSave(formData.date);
        }

        // Reset form after a delay
        setTimeout(() => {
          setFormData({
            date: today,
            grossTotal: '',
            netTotal: '',
            fee: '',
            grossIncome: '',
            netIncome: '',
            vat: '',
            abbiesPay: ''
          });
          setMessage({ type: '', text: '' });
        }, 2000);
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

  return (
    <div className="card">
      <h2>{existingRecord ? 'Edit' : 'Add'} Daily Pub Figures</h2>

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
            <label>Date *</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e0' }}
            />
          </div>

          <div className="filter-group">
            <label>Gross Total *</label>
            <input
              type="number"
              name="grossTotal"
              value={formData.grossTotal}
              onChange={handleChange}
              step="0.01"
              required
              placeholder="0.00"
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e0' }}
            />
          </div>

        </div>

        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem' }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: loading ? '#ccc' : '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: '500',
              fontSize: '1rem'
            }}
          >
            {loading ? 'Saving...' : existingRecord ? 'Update Daily Figure' : 'Add Daily Figure'}
          </button>

          <button
            type="button"
            onClick={() => {
              setFormData({
                date: today,
                grossTotal: '',
                netTotal: '',
                fee: '',
                grossIncome: '',
                netIncome: '',
                vat: '',
                abbiesPay: ''
              });
              setMessage({ type: '', text: '' });
            }}
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
            Clear Form
          </button>
        </div>
      </form>

      {/* Confirmation Modal */}
      {showConfirmation && calculatedValues && (
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
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '8px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>
              {existingRecord ? 'Edit Daily Figures' : 'Add Daily Figures'}
            </h2>

            <p style={{ marginBottom: '1rem', color: '#4a5568' }}>
              Please review the calculated values before saving:
            </p>

            <div style={{
              backgroundColor: '#f7fafc',
              padding: '1rem',
              borderRadius: '4px',
              marginBottom: '1.5rem'
            }}>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', backgroundColor: 'white', borderRadius: '4px' }}>
                  <strong>Date:</strong>
                  <span>{formData.date}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', backgroundColor: 'white', borderRadius: '4px' }}>
                  <strong>Gross Total:</strong>
                  <span>{formatCurrency(calculatedValues.grossTotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', backgroundColor: '#e6fffa', borderRadius: '4px' }}>
                  <strong>Fee:</strong>
                  <span>{formatCurrency(calculatedValues.fee)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', backgroundColor: '#e6fffa', borderRadius: '4px' }}>
                  <strong>Net Total:</strong>
                  <span>{formatCurrency(calculatedValues.netTotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', backgroundColor: '#e6fffa', borderRadius: '4px' }}>
                  <strong>Gross Income:</strong>
                  <span>{formatCurrency(calculatedValues.grossIncome)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', backgroundColor: '#e6fffa', borderRadius: '4px' }}>
                  <strong>Net Income:</strong>
                  <span>{formatCurrency(calculatedValues.netIncome)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', backgroundColor: '#e6fffa', borderRadius: '4px' }}>
                  <strong>VAT:</strong>
                  <span>{formatCurrency(calculatedValues.vat)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', backgroundColor: '#e6fffa', borderRadius: '4px' }}>
                  <strong>Abbie's Pay:</strong>
                  <span>{formatCurrency(calculatedValues.abbiesPay)}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowConfirmation(false)}
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
                Cancel
              </button>
              <button
                onClick={handleConfirmSave}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#48bb78',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Confirm & Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DailyFigureForm;
