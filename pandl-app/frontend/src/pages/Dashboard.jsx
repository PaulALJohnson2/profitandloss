import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency, formatMonth } from '../utils/formatters';
import { useAuth } from '../contexts/AuthContext';
import { getAllMonthlySummaries, recalculateAllMonthlySummaries } from '../firebase/firestoreService';

function Dashboard({ year }) {
  const { currentUser } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recalculating, setRecalculating] = useState(false);

  const fetchData = async () => {
    if (!currentUser) {
      setError('User not authenticated');
      setLoading(false);
      return;
    }

    const result = await getAllMonthlySummaries(currentUser.uid, year || '2024-25');
    if (result.success) {
      setData(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [currentUser, year]);

  const handleRecalculate = async () => {
    if (!currentUser) return;

    setRecalculating(true);
    try {
      const result = await recalculateAllMonthlySummaries(currentUser.uid, year || '2024-25');
      if (result.success) {
        // Refresh the data
        await fetchData();
        alert('Monthly summaries recalculated successfully! Fixed costs now include all weekly, monthly, and yearly costs.');
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      alert(`Failed to recalculate: ${error.message}`);
    } finally {
      setRecalculating(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (!data || data.length === 0) return <div className="error">No data available</div>;

  // Calculate totals
  const totals = data.reduce((acc, month) => ({
    grossIncome: acc.grossIncome + (month.grossIncome || 0),
    netIncome: acc.netIncome + (month.netIncome || 0),
    wages: acc.wages + (month.wages || 0),
    fixedCosts: acc.fixedCosts + (month.fixedCosts || 0),
    sundries: acc.sundries + (month.sundries || 0),
    profit: acc.profit + (month.profit || 0)
  }), { grossIncome: 0, netIncome: 0, wages: 0, fixedCosts: 0, sundries: 0, profit: 0 });

  // Prepare chart data
  const chartData = data.map(month => ({
    month: formatMonth(month.month).split(' ')[0],
    'Gross Income': month.grossIncome,
    'Net Income': month.netIncome,
    'Profit': month.profit,
    'Wages': month.wages
  }));

  return (
    <div className="dashboard">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0 }}>Financial Overview {year}</h1>
        <button
          onClick={handleRecalculate}
          disabled={recalculating}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: recalculating ? '#cbd5e0' : '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: recalculating ? 'not-allowed' : 'pointer',
            fontWeight: '500',
            fontSize: '1rem'
          }}
        >
          {recalculating ? 'Recalculating...' : 'Recalculate Fixed Costs'}
        </button>
      </div>

      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-label">Total Gross Income</div>
          <div className="stat-value">{formatCurrency(totals.grossIncome)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Net Income</div>
          <div className="stat-value">{formatCurrency(totals.netIncome)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Wages</div>
          <div className="stat-value">{formatCurrency(totals.wages)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Fixed Costs</div>
          <div className="stat-value">{formatCurrency(totals.fixedCosts)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Profit</div>
          <div className={`stat-value ${totals.profit >= 0 ? 'positive' : 'negative'}`}>
            {formatCurrency(totals.profit)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Average Monthly Profit</div>
          <div className={`stat-value ${(totals.profit / data.length) >= 0 ? 'positive' : 'negative'}`}>
            {formatCurrency(totals.profit / data.length)}
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Monthly Summary</h2>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th className="currency">Gross Income</th>
                <th className="currency">Net Income</th>
                <th className="currency">Wages</th>
                <th className="currency">Fixed Costs</th>
                <th className="currency">Expenses</th>
                <th className="currency">Profit</th>
              </tr>
            </thead>
            <tbody>
              {data.map((month, index) => (
                <tr key={index}>
                  <td>{formatMonth(month.month)}</td>
                  <td className="currency">{formatCurrency(month.grossIncome)}</td>
                  <td className="currency">{formatCurrency(month.netIncome)}</td>
                  <td className="currency">{formatCurrency(month.wages)}</td>
                  <td className="currency">{formatCurrency(month.fixedCosts)}</td>
                  <td className="currency">{formatCurrency(month.sundries)}</td>
                  <td className={`currency ${month.profit >= 0 ? 'positive' : 'negative'}`}>
                    {formatCurrency(month.profit)}
                  </td>
                </tr>
              ))}
              <tr style={{ fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>
                <td>TOTAL</td>
                <td className="currency">{formatCurrency(totals.grossIncome)}</td>
                <td className="currency">{formatCurrency(totals.netIncome)}</td>
                <td className="currency">{formatCurrency(totals.wages)}</td>
                <td className="currency">{formatCurrency(totals.fixedCosts)}</td>
                <td className="currency">{formatCurrency(totals.sundries)}</td>
                <td className={`currency ${totals.profit >= 0 ? 'positive' : 'negative'}`}>
                  {formatCurrency(totals.profit)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2>Monthly Income & Profit Trend</h2>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => formatCurrency(value)} />
            <Legend />
            <Line type="monotone" dataKey="Gross Income" stroke="#8884d8" strokeWidth={2} />
            <Line type="monotone" dataKey="Net Income" stroke="#82ca9d" strokeWidth={2} />
            <Line type="monotone" dataKey="Profit" stroke="#ffc658" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h2>Monthly Expenses Breakdown</h2>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => formatCurrency(value)} />
            <Legend />
            <Bar dataKey="Wages" fill="#8884d8" />
            <Bar dataKey="Profit" fill="#82ca9d" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default Dashboard;
