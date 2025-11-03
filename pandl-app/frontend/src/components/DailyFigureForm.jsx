import React, { useState, useEffect } from 'react';
import { saveOrUpdateDailyFigure, getDailyFigureByDate } from '../firebase/firestoreService';
import { formatCurrency } from '../utils/formatters';

function DailyFigureForm({ onSave, initialDate = null }) {
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

  // Check if a record exists for the selected date
  useEffect(() => {
    const checkExisting = async () => {
      if (formData.date) {
        const result = await getDailyFigureByDate(formData.date);
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
  }, [formData.date]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Auto-calculate related fields
  const autoCalculate = () => {
    const grossTotal = parseFloat(formData.grossTotal) || 0;

    // Calculate Fee using exact spreadsheet formula: =SUM((B2*0.72)/1.2)
    const fee = (grossTotal * 0.72) / 1.2;

    // Calculate Abbie's Pay (£455.37 if Friday, otherwise 0)
    let abbiesPay = 0;
    if (formData.date) {
      const selectedDate = new Date(formData.date);
      const dayOfWeek = selectedDate.getDay(); // 0 = Sunday, 5 = Friday
      if (dayOfWeek === 5) { // Friday
        abbiesPay = 455.37;
      }
    }

    // Calculate Net Total (Gross Total / 1.2)
    const netTotal = grossTotal / 1.2;

    // Calculate Gross Income (Gross Total - Fee)
    const grossIncome = grossTotal - fee;

    // Calculate Net Income (Gross Income / 1.2)
    const netIncome = grossIncome / 1.2;

    // Calculate VAT (Gross Income - Net Income)
    const vat = grossIncome - netIncome;

    setFormData(prev => ({
      ...prev,
      fee: fee.toFixed(3),
      abbiesPay: abbiesPay.toFixed(2),
      netTotal: netTotal.toFixed(6),
      grossIncome: grossIncome.toFixed(4),
      netIncome: netIncome.toFixed(6),
      vat: vat.toFixed(6)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Convert string values to numbers
      const dataToSave = {
        grossTotal: parseFloat(formData.grossTotal) || 0,
        netTotal: parseFloat(formData.netTotal) || 0,
        fee: parseFloat(formData.fee) || 0,
        grossIncome: parseFloat(formData.grossIncome) || 0,
        netIncome: parseFloat(formData.netIncome) || 0,
        vat: parseFloat(formData.vat) || 0,
        abbiesPay: parseFloat(formData.abbiesPay) || 0
      };

      const result = await saveOrUpdateDailyFigure(formData.date, dataToSave);

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

          <div className="filter-group">
            <label>Fee (Auto-calculated)</label>
            <input
              type="number"
              name="fee"
              value={formData.fee}
              onChange={handleChange}
              step="0.01"
              placeholder="Auto-calculated"
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e0', backgroundColor: '#f7fafc' }}
            />
          </div>

          <div className="filter-group">
            <label>Abbie's Pay (£455.37 on Fridays)</label>
            <input
              type="number"
              name="abbiesPay"
              value={formData.abbiesPay}
              onChange={handleChange}
              step="0.01"
              placeholder="Auto-calculated"
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e0', backgroundColor: '#f7fafc' }}
            />
          </div>

        </div>

        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={autoCalculate}
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
            Auto-Calculate Values
          </button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1rem',
          marginTop: '1.5rem',
          padding: '1rem',
          backgroundColor: '#f7fafc',
          borderRadius: '4px'
        }}>
          <h3 style={{ gridColumn: '1 / -1', margin: 0, fontSize: '1rem', color: '#4a5568' }}>
            Calculated Values (or enter manually)
          </h3>

          <div className="filter-group">
            <label>Net Total</label>
            <input
              type="number"
              name="netTotal"
              value={formData.netTotal}
              onChange={handleChange}
              step="0.01"
              placeholder="Auto-calculated"
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e0' }}
            />
          </div>

          <div className="filter-group">
            <label>Gross Income</label>
            <input
              type="number"
              name="grossIncome"
              value={formData.grossIncome}
              onChange={handleChange}
              step="0.01"
              placeholder="Auto-calculated"
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e0' }}
            />
          </div>

          <div className="filter-group">
            <label>Net Income</label>
            <input
              type="number"
              name="netIncome"
              value={formData.netIncome}
              onChange={handleChange}
              step="0.01"
              placeholder="Auto-calculated"
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e0' }}
            />
          </div>

          <div className="filter-group">
            <label>VAT</label>
            <input
              type="number"
              name="vat"
              value={formData.vat}
              onChange={handleChange}
              step="0.01"
              placeholder="Auto-calculated"
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
            {loading ? 'Saving...' : existingRecord ? 'Update' : 'Save'} Daily Figure
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

        <div style={{
          marginTop: '1rem',
          padding: '0.75rem',
          backgroundColor: '#fef3c7',
          borderRadius: '4px',
          fontSize: '0.875rem'
        }}>
          <strong>Auto-calculate formulas:</strong>
          <ul style={{ marginTop: '0.5rem', marginBottom: 0, paddingLeft: '1.5rem' }}>
            <li><strong>Fee</strong> = (Gross Total × 0.72) ÷ 1.2</li>
            <li><strong>Abbie's Pay</strong> = £455.37 if Friday, otherwise £0</li>
            <li><strong>Net Total</strong> = Gross Total ÷ 1.2</li>
            <li><strong>Gross Income</strong> = Gross Total - Fee</li>
            <li><strong>Net Income</strong> = Gross Income ÷ 1.2</li>
            <li><strong>VAT</strong> = Gross Income - Net Income</li>
          </ul>
        </div>
      </form>
    </div>
  );
}

export default DailyFigureForm;
