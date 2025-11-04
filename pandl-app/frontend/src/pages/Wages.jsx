import React, { useState, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency, getMonthName } from '../utils/formatters';
import { useAuth } from '../contexts/AuthContext';
import { getAllWages, saveOrUpdateWages } from '../firebase/firestoreService';
import { getFiscalYearMonths } from '../utils/fiscalYearUtils';
import WagesForm from '../components/WagesForm';
import WagesImport from '../components/WagesImport';

function Wages({ year }) {
  const { currentUser } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMonth, setEditingMonth] = useState(null);
  const [editingValues, setEditingValues] = useState({});
  const [currentField, setCurrentField] = useState('netOut');

  const inputRefs = {
    netOut: useRef(null),
    invoices: useRef(null),
    hmrc: useRef(null),
    nest: useRef(null),
    deductions: useRef(null)
  };

  useEffect(() => {
    async function fetchData() {
      if (!currentUser) {
        setError('User not authenticated');
        setLoading(false);
        return;
      }

      const result = await getAllWages(currentUser.uid, year || '2024-25');
      if (result.success) {
        // Define fiscal year month order by name
        const fiscalYearMonthOrder = [
          'October', 'November', 'December',
          'January', 'February', 'March',
          'April', 'May', 'June',
          'July', 'August', 'September'
        ];

        // Sort the data by fiscal year month order
        const sortedData = result.data.sort((a, b) => {
          const monthA = a.month || a.id;
          const monthB = b.month || b.id;

          let indexA = fiscalYearMonthOrder.indexOf(monthA);
          let indexB = fiscalYearMonthOrder.indexOf(monthB);

          // If still not found, default to end of list
          if (indexA === -1) indexA = 999;
          if (indexB === -1) indexB = 999;

          return indexA - indexB;
        });

        setData(sortedData);
      } else {
        setError(result.error);
      }
      setLoading(false);
    }

    fetchData();
  }, [currentUser, year]);

  // Get the next available month (first month without netOut data)
  const getNextAvailableMonth = () => {
    const fiscalYearMonthOrder = [
      'October', 'November', 'December',
      'January', 'February', 'March',
      'April', 'May', 'June',
      'July', 'August', 'September'
    ];

    // Get list of months that have netOut data (not 0 or empty)
    const monthsWithNetOut = new Set();
    data.forEach(d => {
      if ((d.netOut || 0) > 0) {
        monthsWithNetOut.add(d.month || d.id);
      }
    });

    // Find first month without netOut amount
    for (const month of fiscalYearMonthOrder) {
      if (!monthsWithNetOut.has(month)) {
        return month;
      }
    }

    // If all months have netOut data, default to October
    return 'October';
  };

  const refreshData = async () => {
    if (currentUser) {
      const result = await getAllWages(currentUser.uid, year || '2024-25');
      if (result.success) {
        const fiscalYearMonthOrder = [
          'October', 'November', 'December',
          'January', 'February', 'March',
          'April', 'May', 'June',
          'July', 'August', 'September'
        ];

        const sortedData = result.data.sort((a, b) => {
          const monthA = a.month || a.id;
          const monthB = b.month || b.id;
          let indexA = fiscalYearMonthOrder.indexOf(monthA);
          let indexB = fiscalYearMonthOrder.indexOf(monthB);
          if (indexA === -1) indexA = 999;
          if (indexB === -1) indexB = 999;
          return indexA - indexB;
        });

        setData(sortedData);
      }
    }
  };

  const handleFormSave = () => {
    refreshData();
    setShowForm(false);
  };

  const handleImportComplete = () => {
    refreshData();
    setShowImport(false);
  };

  // Helper function to round to 2 decimal places
  const roundTo2Decimals = (num) => {
    return Math.round((parseFloat(num) || 0) * 100) / 100;
  };

  const handleRowClick = (monthData) => {
    setEditingMonth(monthData);
    setEditingValues({
      netOut: roundTo2Decimals(monthData.netOut),
      invoices: roundTo2Decimals(monthData.invoices),
      hmrc: roundTo2Decimals(monthData.hmrc),
      nest: roundTo2Decimals(monthData.nest),
      deductions: roundTo2Decimals(monthData.deductions)
    });
    setCurrentField('netOut');
    setShowEditModal(true);
  };

  const handleFieldChange = (field, value) => {
    setEditingValues(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleKeyDown = (e, currentFieldName) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const fields = ['netOut', 'invoices', 'hmrc', 'nest', 'deductions'];
      const currentIndex = fields.indexOf(currentFieldName);

      if (currentIndex < fields.length - 1) {
        // Move to next field
        const nextField = fields[currentIndex + 1];
        setCurrentField(nextField);
        setTimeout(() => inputRefs[nextField].current?.focus(), 0);
      }
      // Don't auto-save on last field, user clicks Update button
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleCancelEdit = () => {
    setShowEditModal(false);
    setEditingMonth(null);
    setEditingValues({});
  };

  const handleUpdate = async () => {
    if (!editingMonth) return;

    const netOut = roundTo2Decimals(editingValues.netOut);
    const invoices = roundTo2Decimals(editingValues.invoices);
    const hmrc = roundTo2Decimals(editingValues.hmrc);
    const nest = roundTo2Decimals(editingValues.nest);
    const deductions = roundTo2Decimals(editingValues.deductions);
    const total = roundTo2Decimals(netOut + invoices + hmrc + nest + deductions);

    const updatedData = {
      netOut,
      invoices,
      hmrc,
      nest,
      deductions,
      total
    };

    await saveOrUpdateWages(
      currentUser.uid,
      year || '2024-25',
      editingMonth.month,
      updatedData
    );

    setShowEditModal(false);
    setEditingMonth(null);
    setEditingValues({});
    refreshData();
  };

  // Auto-focus when modal opens
  useEffect(() => {
    if (showEditModal && currentField && inputRefs[currentField]?.current) {
      inputRefs[currentField].current.focus();
    }
  }, [showEditModal, currentField]);

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  // Calculate totals
  const totals = data.reduce((acc, month) => ({
    netOut: acc.netOut + (month.netOut || 0),
    invoices: acc.invoices + (month.invoices || 0),
    hmrc: acc.hmrc + (month.hmrc || 0),
    nest: acc.nest + (month.nest || 0),
    deductions: acc.deductions + (month.deductions || 0),
    total: acc.total + (month.total || 0)
  }), { netOut: 0, invoices: 0, hmrc: 0, nest: 0, deductions: 0, total: 0 });

  // Prepare chart data
  const chartData = data.map(month => ({
    month: getMonthName(month.month),
    'Net Out': month.netOut,
    'HMRC': Math.abs(month.hmrc || 0),
    'Nest': month.nest,
    'Total': month.total
  }));

  return (
    <div className="wages">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0 }}>Wages Breakdown {year}</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={() => {
              setShowImport(!showImport);
              setShowForm(false);
            }}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#48bb78',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            {showImport ? 'Hide Import' : '📁 Import CSV'}
          </button>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setShowImport(false);
            }}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            {showForm ? 'Hide Form' : '+ Add Monthly Wages'}
          </button>
        </div>
      </div>

      {showImport && <WagesImport year={year || '2024-25'} onImportComplete={handleImportComplete} />}

      {showForm && <WagesForm onSave={handleFormSave} year={year || '2024-25'} initialMonth={getNextAvailableMonth()} />}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Net Out</div>
          <div className="stat-value">{formatCurrency(totals.netOut)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Invoices</div>
          <div className="stat-value">{formatCurrency(totals.invoices)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total HMRC</div>
          <div className={`stat-value ${totals.hmrc >= 0 ? 'negative' : 'positive'}`}>
            {formatCurrency(totals.hmrc)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Nest</div>
          <div className="stat-value">{formatCurrency(totals.nest)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Deductions</div>
          <div className="stat-value">{formatCurrency(totals.deductions)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Wages</div>
          <div className="stat-value">{formatCurrency(totals.total)}</div>
        </div>
      </div>

      <div className="card">
        <h2>Monthly Wages Breakdown</h2>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => formatCurrency(value)} />
            <Legend />
            <Bar dataKey="Net Out" fill="#8884d8" />
            <Bar dataKey="HMRC" fill="#82ca9d" />
            <Bar dataKey="Nest" fill="#ffc658" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h2>Monthly Wages Details</h2>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th className="currency">Net Out</th>
                <th className="currency">Invoices</th>
                <th className="currency">HMRC</th>
                <th className="currency">Nest</th>
                <th className="currency">Deductions</th>
                <th className="currency">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.map((month, index) => (
                <tr
                  key={index}
                  onClick={() => handleRowClick(month)}
                  style={{
                    cursor: 'pointer'
                  }}
                >
                  <td>{getMonthName(month.month)}</td>
                  <td className="currency">{formatCurrency(month.netOut)}</td>
                  <td className="currency">{formatCurrency(month.invoices)}</td>
                  <td className={`currency ${month.hmrc >= 0 ? 'negative' : 'positive'}`}>
                    {formatCurrency(month.hmrc)}
                  </td>
                  <td className="currency">{formatCurrency(month.nest)}</td>
                  <td className="currency">{formatCurrency(month.deductions)}</td>
                  <td className="currency">{formatCurrency(month.total)}</td>
                </tr>
              ))}
              <tr style={{ fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>
                <td>TOTAL</td>
                <td className="currency">{formatCurrency(totals.netOut)}</td>
                <td className="currency">{formatCurrency(totals.invoices)}</td>
                <td className={`currency ${totals.hmrc >= 0 ? 'negative' : 'positive'}`}>
                  {formatCurrency(totals.hmrc)}
                </td>
                <td className="currency">{formatCurrency(totals.nest)}</td>
                <td className="currency">{formatCurrency(totals.deductions)}</td>
                <td className="currency">{formatCurrency(totals.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ backgroundColor: '#f7fafc', marginTop: '1rem' }}>
        <h3>About Wages</h3>
        <p>
          <strong>Net Out:</strong> Base wages paid to staff<br />
          <strong>Invoices:</strong> Additional invoiced amounts<br />
          <strong>HMRC:</strong> Tax adjustments (negative values are refunds)<br />
          <strong>Nest:</strong> Pension contributions<br />
          <strong>Deductions:</strong> Other wage deductions<br />
          <strong>Total:</strong> Final wage amount paid
        </p>
      </div>

      {/* Edit Modal */}
      {showEditModal && editingMonth && (
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
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            minWidth: '500px',
            maxWidth: '600px'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>
              Edit Wages for {getMonthName(editingMonth.month)}
            </h3>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Net Out (£)
                </label>
                <input
                  ref={inputRefs.netOut}
                  type="number"
                  step="0.01"
                  value={editingValues.netOut}
                  onChange={(e) => handleFieldChange('netOut', e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, 'netOut')}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #cbd5e0',
                    borderRadius: '4px',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Invoices (without VAT) (£)
                </label>
                <input
                  ref={inputRefs.invoices}
                  type="number"
                  step="0.01"
                  value={editingValues.invoices}
                  onChange={(e) => handleFieldChange('invoices', e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, 'invoices')}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #cbd5e0',
                    borderRadius: '4px',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  HMRC (£)
                </label>
                <input
                  ref={inputRefs.hmrc}
                  type="number"
                  step="0.01"
                  value={editingValues.hmrc}
                  onChange={(e) => handleFieldChange('hmrc', e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, 'hmrc')}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #cbd5e0',
                    borderRadius: '4px',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Nest (£)
                </label>
                <input
                  ref={inputRefs.nest}
                  type="number"
                  step="0.01"
                  value={editingValues.nest}
                  onChange={(e) => handleFieldChange('nest', e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, 'nest')}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #cbd5e0',
                    borderRadius: '4px',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Deductions (£)
                </label>
                <input
                  ref={inputRefs.deductions}
                  type="number"
                  step="0.01"
                  value={editingValues.deductions}
                  onChange={(e) => handleFieldChange('deductions', e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, 'deductions')}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #cbd5e0',
                    borderRadius: '4px',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <div style={{
                padding: '1rem',
                backgroundColor: '#f7fafc',
                borderRadius: '4px',
                marginTop: '1rem'
              }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                  Total: {formatCurrency(
                    roundTo2Decimals(
                      (parseFloat(editingValues.netOut) || 0) +
                      (parseFloat(editingValues.invoices) || 0) +
                      (parseFloat(editingValues.hmrc) || 0) +
                      (parseFloat(editingValues.nest) || 0) +
                      (parseFloat(editingValues.deductions) || 0)
                    )
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={handleCancelEdit}
                style={{
                  padding: '0.75rem 2rem',
                  backgroundColor: '#e2e8f0',
                  color: '#4a5568',
                  border: '1px solid #cbd5e0',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '500'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                style={{
                  padding: '0.75rem 2rem',
                  backgroundColor: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '500'
                }}
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Wages;
