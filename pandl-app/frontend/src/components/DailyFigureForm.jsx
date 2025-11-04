import React, { useState, useEffect, useRef } from 'react';
import { saveOrUpdateDailyFigure, getDailyFigureByDate } from '../firebase/firestoreService';
import { formatCurrency } from '../utils/formatters';
import { useAuth } from '../contexts/AuthContext';
import { isDateInFiscalYear, getFiscalYearDates, isPastFiscalYearEnd } from '../utils/fiscalYearUtils';

function DailyFigureForm({ onSave, initialDate = null, year = '2024-25', allData = [], autoAdvance = true }) {
  const { currentUser } = useAuth();
  const modalRef = useRef(null);
  const grossTotalInputRef = useRef(null);
  const today = new Date().toISOString().split('T')[0];

  // Determine the default date to use
  const getDefaultDate = () => {
    if (initialDate) {
      return initialDate;
    }
    // If fiscal year is complete, default to first day of that year
    if (isPastFiscalYearEnd(year)) {
      const fiscalYearDates = getFiscalYearDates(year);
      return fiscalYearDates.startDate.toISOString().split('T')[0];
    }
    return today;
  };

  const defaultDate = getDefaultDate();

  // Find the next empty date (excluding December 25th and noTrade days)
  const findNextEmptyDate = (currentData) => {
    // Create a map of dates to their figure data
    const dateMap = new Map(currentData.map(figure => [figure.date, figure]));

    // Get fiscal year date range
    const fiscalYearDates = getFiscalYearDates(year);
    const startDate = new Date(fiscalYearDates.startDate);
    const endDate = new Date(fiscalYearDates.endDate);
    const todayDate = new Date(today);

    // Find the earliest date without a figure or with 0.00 (excluding December 25th and noTrade days)
    let currentDate = new Date(startDate);
    const maxDate = todayDate < endDate ? todayDate : endDate;

    while (currentDate <= maxDate) {
      const dateString = currentDate.toISOString().split('T')[0];
      const month = currentDate.getMonth() + 1; // 0-indexed, so +1
      const day = currentDate.getDate();

      // Skip December 25th (month 12, day 25)
      const isDecember25 = month === 12 && day === 25;

      // Get the figure for this date
      const figure = dateMap.get(dateString);
      const grossTotal = figure?.grossTotal || 0;
      const isNoTrade = figure?.noTrade || false;

      // If this date doesn't have a figure or has 0.00, isn't December 25th, and isn't marked as noTrade, use it
      if (grossTotal === 0 && !isDecember25 && !isNoTrade) {
        return dateString;
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // If all dates are filled, return today
    return today;
  };

  // Format date as "Monday 3rd November"
  const formatDateDisplay = (dateString) => {
    const date = new Date(dateString + 'T00:00:00');
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const dayName = days[date.getDay()];
    const day = date.getDate();
    const month = months[date.getMonth()];

    // Add ordinal suffix (1st, 2nd, 3rd, 4th, etc.)
    const getOrdinal = (n) => {
      const s = ['th', 'st', 'nd', 'rd'];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    return `${dayName} ${getOrdinal(day)} ${month}`;
  };

  const [formData, setFormData] = useState({
    date: defaultDate,
    grossTotal: '',
    netTotal: '',
    fee: '',
    grossIncome: '',
    netIncome: '',
    vat: '',
    abbiesPay: '',
    noTrade: false
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [existingRecord, setExistingRecord] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [calculatedValues, setCalculatedValues] = useState(null);
  const [dateValidation, setDateValidation] = useState({ isValid: true, message: '' });

  // Validate date against fiscal year
  useEffect(() => {
    if (formData.date && year) {
      const dateIsValid = isDateInFiscalYear(formData.date, year);
      if (!dateIsValid) {
        const { startDate, endDate } = getFiscalYearDates(year);
        const startDateStr = startDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        const endDateStr = endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        setDateValidation({
          isValid: false,
          message: `Date must be within the fiscal year (${startDateStr} - ${endDateStr})`
        });
      } else {
        setDateValidation({ isValid: true, message: '' });
      }
    }
  }, [formData.date, year]);

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
            abbiesPay: result.data.abbiesPay || '',
            noTrade: result.data.noTrade || false
          });
          const statusText = result.data.noTrade ? 'Existing record found - NO TRADE day' : 'Existing record found - editing mode';
          setMessage({ type: 'info', text: statusText });
        } else {
          setExistingRecord(null);
          setMessage({ type: '', text: '' });
        }
      }
    };
    checkExisting();
  }, [formData.date, currentUser, year]);

  // Focus modal when it opens
  useEffect(() => {
    if (showConfirmation && modalRef.current) {
      modalRef.current.focus();
    }
  }, [showConfirmation]);

  // Focus gross total input when form loads
  useEffect(() => {
    if (grossTotalInputRef.current) {
      grossTotalInputRef.current.focus();
    }
  }, []);

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

    // Validate date is within fiscal year
    if (!dateValidation.isValid) {
      setMessage({ type: 'error', text: dateValidation.message });
      return;
    }

    // Calculate all values
    const calculated = calculateValues(formData.grossTotal, formData.date);
    setCalculatedValues(calculated);
    setShowConfirmation(true);
  };

  const handleNoTrade = async () => {
    setMessage({ type: '', text: '' });

    if (!currentUser) {
      setMessage({ type: 'error', text: 'You must be logged in to save daily figures' });
      return;
    }

    // Validate date is within fiscal year
    if (!dateValidation.isValid) {
      setMessage({ type: 'error', text: dateValidation.message });
      return;
    }

    // Set all values to zero and mark as no trade
    const noTradeValues = {
      grossTotal: 0,
      fee: 0,
      abbiesPay: 0,
      netTotal: 0,
      grossIncome: 0,
      netIncome: 0,
      vat: 0,
      noTrade: true
    };
    setCalculatedValues(noTradeValues);
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

        // Create updated data array with the new/updated record
        const updatedData = [...allData];
        const existingIndex = updatedData.findIndex(d => d.date === formData.date);
        const savedRecord = { ...calculatedValues, date: formData.date };

        if (existingIndex >= 0) {
          updatedData[existingIndex] = savedRecord;
        } else {
          updatedData.push(savedRecord);
        }

        // Call parent callback if provided
        if (onSave) {
          onSave(formData.date);
        }

        // If autoAdvance is enabled, move to next empty date
        if (autoAdvance) {
          // Find next empty date (never past today)
          const nextDate = findNextEmptyDate(updatedData);

          // Move to next empty date and focus input
          setTimeout(() => {
            setFormData({
              date: nextDate,
              grossTotal: '',
              netTotal: '',
              fee: '',
              grossIncome: '',
              netIncome: '',
              vat: '',
              abbiesPay: '',
              noTrade: false
            });
            setMessage({ type: '', text: '' });

            // Focus the gross total input field
            if (grossTotalInputRef.current) {
              grossTotalInputRef.current.focus();
            }
          }, 500);
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
              style={{
                padding: '0.5rem',
                borderRadius: '4px',
                border: dateValidation.isValid ? '1px solid #cbd5e0' : '2px solid #f56565'
              }}
            />
            {!dateValidation.isValid && (
              <div style={{
                color: '#c53030',
                fontSize: '0.875rem',
                marginTop: '0.25rem'
              }}>
                {dateValidation.message}
              </div>
            )}
          </div>

          <div className="filter-group">
            <label>Gross Total *</label>
            <input
              ref={grossTotalInputRef}
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

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'space-between' }}>
          <button
            type="button"
            onClick={handleNoTrade}
            disabled={loading || !dateValidation.isValid}
            style={{
              padding: '0.75rem 2rem',
              backgroundColor: loading || !dateValidation.isValid ? '#cbd5e0' : '#e53e3e',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading || !dateValidation.isValid ? 'not-allowed' : 'pointer',
              fontWeight: '500',
              fontSize: '1rem'
            }}
          >
            No Trade
          </button>

          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading || !dateValidation.isValid}
            style={{
              padding: '0.75rem 2rem',
              backgroundColor: loading || !dateValidation.isValid ? '#cbd5e0' : '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading || !dateValidation.isValid ? 'not-allowed' : 'pointer',
              fontWeight: '500',
              fontSize: '1rem'
            }}
          >
            {loading ? 'Saving...' : (existingRecord ? 'Update Figure' : 'Save Figure')}
          </button>
        </div>
      </form>

      {/* Confirmation Modal */}
      {showConfirmation && calculatedValues && (
        <div
          ref={modalRef}
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
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleConfirmSave();
            } else if (e.key === 'Escape') {
              setShowConfirmation(false);
            }
          }}
          tabIndex={-1}
        >
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
              {calculatedValues.noTrade ? 'Mark as NO TRADE Day' : (existingRecord ? 'Edit Daily Figures' : 'Add Daily Figures')}
            </h2>

            {calculatedValues.noTrade && (
              <div style={{
                padding: '0.75rem',
                backgroundColor: '#fed7d7',
                color: '#c53030',
                borderRadius: '4px',
                marginBottom: '1rem',
                fontWeight: '500',
                textAlign: 'center'
              }}>
                This will mark the pub as closed for trading on this date
              </div>
            )}

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
                  <span>{formatDateDisplay(formData.date)}</span>
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
