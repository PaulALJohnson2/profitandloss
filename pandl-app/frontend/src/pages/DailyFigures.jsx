import React, { useState, useEffect } from 'react';
import { formatCurrency, formatDate } from '../utils/formatters';
import DailyFigureForm from '../components/DailyFigureForm';
import { useAuth } from '../contexts/AuthContext';
import { getAllDailyFigures } from '../firebase/firestoreService';

function DailyFigures({ year }) {
  const { currentUser } = useAuth();
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState('2024-10-01');
  const [endDate, setEndDate] = useState('2025-09-30');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchData();
  }, [currentUser, startDate, endDate]);

  const fetchData = async () => {
    if (!currentUser) {
      setError('User not authenticated');
      setLoading(false);
      return;
    }

    const result = await getAllDailyFigures(currentUser.uid, year || '2024-25', startDate, endDate);
    if (result.success) {
      setData(result.data);
      setFilteredData(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const handleFilter = () => {
    fetchData();
  };

  const handleFormSave = () => {
    // Refresh the data after saving
    fetchData();
    setShowForm(false);
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  // Calculate totals
  const totals = filteredData.reduce((acc, day) => ({
    grossTotal: acc.grossTotal + (day.grossTotal || 0),
    netTotal: acc.netTotal + (day.netTotal || 0),
    fee: acc.fee + (day.fee || 0),
    grossIncome: acc.grossIncome + (day.grossIncome || 0),
    netIncome: acc.netIncome + (day.netIncome || 0),
    vat: acc.vat + (day.vat || 0),
    abbiesPay: acc.abbiesPay + (day.abbiesPay || 0)
  }), { grossTotal: 0, netTotal: 0, fee: 0, grossIncome: 0, netIncome: 0, vat: 0, abbiesPay: 0 });

  return (
    <div className="daily-figures">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0 }}>Daily Pub Figures {year}</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: showForm ? '#e2e8f0' : '#667eea',
            color: showForm ? '#4a5568' : 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: '500',
            fontSize: '1rem'
          }}
        >
          {showForm ? 'Hide Form' : '+ Add Daily Figure'}
        </button>
      </div>

      {showForm && <DailyFigureForm onSave={handleFormSave} />}

      <div className="card">
        <div className="filters">
          <div className="filter-group">
            <label>Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label>End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <button onClick={handleFilter} style={{
            padding: '0.5rem 1.5rem',
            backgroundColor: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginTop: 'auto'
          }}>
            Apply Filter
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Gross</div>
          <div className="stat-value">{formatCurrency(totals.grossTotal)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Net</div>
          <div className="stat-value">{formatCurrency(totals.netTotal)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Fees</div>
          <div className="stat-value">{formatCurrency(totals.fee)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total VAT</div>
          <div className="stat-value">{formatCurrency(totals.vat)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Gross Income</div>
          <div className="stat-value">{formatCurrency(totals.grossIncome)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Net Income</div>
          <div className="stat-value">{formatCurrency(totals.netIncome)}</div>
        </div>
      </div>

      <div className="card">
        <h2>Daily Records ({filteredData.length} days)</h2>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th className="currency">Gross Total</th>
                <th className="currency">Net Total</th>
                <th className="currency">Fee</th>
                <th className="currency">Gross Income</th>
                <th className="currency">Net Income</th>
                <th className="currency">VAT</th>
                <th className="currency">Abbie's Pay</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((day, index) => (
                <tr key={index}>
                  <td>{formatDate(day.date)}</td>
                  <td className="currency">{formatCurrency(day.grossTotal)}</td>
                  <td className="currency">{formatCurrency(day.netTotal)}</td>
                  <td className="currency">{formatCurrency(day.fee)}</td>
                  <td className="currency">{formatCurrency(day.grossIncome)}</td>
                  <td className="currency">{formatCurrency(day.netIncome)}</td>
                  <td className="currency">{formatCurrency(day.vat)}</td>
                  <td className="currency">{formatCurrency(day.abbiesPay)}</td>
                </tr>
              ))}
              <tr style={{ fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>
                <td>TOTAL</td>
                <td className="currency">{formatCurrency(totals.grossTotal)}</td>
                <td className="currency">{formatCurrency(totals.netTotal)}</td>
                <td className="currency">{formatCurrency(totals.fee)}</td>
                <td className="currency">{formatCurrency(totals.grossIncome)}</td>
                <td className="currency">{formatCurrency(totals.netIncome)}</td>
                <td className="currency">{formatCurrency(totals.vat)}</td>
                <td className="currency">{formatCurrency(totals.abbiesPay)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default DailyFigures;
