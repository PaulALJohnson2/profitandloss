import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useAuth } from '../contexts/AuthContext';
import { getAllVAT } from '../firebase/firestoreService';

function VAT({ year }) {
  const { currentUser } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      if (!currentUser) {
        setError('User not authenticated');
        setLoading(false);
        return;
      }

      const result = await getAllVAT(currentUser.uid, year || '2024-25');
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error);
      }
      setLoading(false);
    }

    fetchData();
  }, [currentUser, year]);

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (!data || data.length === 0) return <div className="error">No data available</div>;

  // Calculate totals
  const totals = data.reduce((acc, period) => ({
    hmrcAmount: acc.hmrcAmount + (period.hmrcAmount || 0),
    marstonsAmount: acc.marstonsAmount + (period.marstonsAmount || 0),
    difference: acc.difference + (period.difference || 0)
  }), { hmrcAmount: 0, marstonsAmount: 0, difference: 0 });

  // Prepare chart data
  const chartData = data.map((period, index) => ({
    period: `Q${index + 1}`,
    'HMRC Amount': period.hmrcAmount,
    'Marstons Amount': period.marstonsAmount,
    'Difference': Math.abs(period.difference)
  }));

  return (
    <div className="vat">
      <h1>VAT Returns {year}</h1>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total HMRC VAT</div>
          <div className="stat-value">{formatCurrency(totals.hmrcAmount)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Marstons VAT</div>
          <div className="stat-value">{formatCurrency(totals.marstonsAmount)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Difference</div>
          <div className={`stat-value ${totals.difference >= 0 ? 'positive' : 'negative'}`}>
            {formatCurrency(totals.difference)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">VAT Periods</div>
          <div className="stat-value">{data.length}</div>
        </div>
      </div>

      <div className="card">
        <h2>VAT Comparison by Period</h2>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" />
            <YAxis />
            <Tooltip formatter={(value) => formatCurrency(value)} />
            <Legend />
            <Bar dataKey="HMRC Amount" fill="#8884d8" />
            <Bar dataKey="Marstons Amount" fill="#82ca9d" />
            <Bar dataKey="Difference" fill="#ffc658" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h2>VAT Return Details</h2>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Start Date</th>
                <th>End Date</th>
                <th className="currency">HMRC Amount</th>
                <th className="currency">Marstons Amount</th>
                <th className="currency">Difference</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((period, index) => (
                <tr key={index}>
                  <td>{formatDate(period.startDate)}</td>
                  <td>{formatDate(period.endDate)}</td>
                  <td className="currency">{formatCurrency(period.hmrcAmount)}</td>
                  <td className="currency">{formatCurrency(period.marstonsAmount)}</td>
                  <td className={`currency ${period.difference >= 0 ? 'positive' : 'negative'}`}>
                    {formatCurrency(period.difference)}
                  </td>
                  <td>
                    {period.difference === 0 ? (
                      <span style={{ color: '#48bb78', fontWeight: 'bold' }}>Matched</span>
                    ) : period.difference > 0 ? (
                      <span style={{ color: '#f56565' }}>HMRC Higher</span>
                    ) : (
                      <span style={{ color: '#ed8936' }}>Marstons Higher</span>
                    )}
                  </td>
                </tr>
              ))}
              <tr style={{ fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>
                <td colSpan="2">TOTAL</td>
                <td className="currency">{formatCurrency(totals.hmrcAmount)}</td>
                <td className="currency">{formatCurrency(totals.marstonsAmount)}</td>
                <td className={`currency ${totals.difference >= 0 ? 'positive' : 'negative'}`}>
                  {formatCurrency(totals.difference)}
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ backgroundColor: '#f7fafc', marginTop: '1rem' }}>
        <h3>About VAT Returns</h3>
        <p>
          VAT returns are submitted quarterly. This page compares the VAT amounts declared to HMRC versus the VAT calculated from Marstons (supplier) records.
        </p>
        <p style={{ marginTop: '0.5rem' }}>
          <strong>Difference:</strong> A positive difference means HMRC amount is higher, negative means Marstons amount is higher. Ideally these should match.
        </p>
      </div>
    </div>
  );
}

export default VAT;
