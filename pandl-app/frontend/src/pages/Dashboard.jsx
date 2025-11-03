import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency, formatMonth } from '../utils/formatters';
import { useAuth } from '../contexts/AuthContext';
import { getAllMonthlySummaries } from '../firebase/firestoreService';

function Dashboard({ year }) {
  const { currentUser } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
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
    }

    fetchData();
  }, [currentUser, year]);

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (!data || data.length === 0) return <div className="error">No data available</div>;

  // Calculate totals
  const totals = data.reduce((acc, month) => ({
    grossIncome: acc.grossIncome + (month.grossIncome || 0),
    netIncome: acc.netIncome + (month.netIncome || 0),
    wages: acc.wages + (month.wages || 0),
    fixedCosts: acc.fixedCosts + (month.fixedCosts || 0),
    profit: acc.profit + (month.profit || 0)
  }), { grossIncome: 0, netIncome: 0, wages: 0, fixedCosts: 0, profit: 0 });

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
      <h1>Financial Overview {year}</h1>

      <div className="stats-grid">
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

      <div className="card">
        <h2>Monthly Summary</h2>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th className="currency">Gross Income</th>
                <th className="currency">Net Income</th>
                <th className="currency">Abbie Pay</th>
                <th className="currency">Wages</th>
                <th className="currency">Fixed Costs</th>
                <th className="currency">Sundries</th>
                <th className="currency">Profit</th>
              </tr>
            </thead>
            <tbody>
              {data.map((month, index) => (
                <tr key={index}>
                  <td>{formatMonth(month.month)}</td>
                  <td className="currency">{formatCurrency(month.grossIncome)}</td>
                  <td className="currency">{formatCurrency(month.netIncome)}</td>
                  <td className="currency">{formatCurrency(month.abbiePay)}</td>
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
                <td className="currency">{formatCurrency(data.reduce((sum, m) => sum + (m.abbiePay || 0), 0))}</td>
                <td className="currency">{formatCurrency(totals.wages)}</td>
                <td className="currency">{formatCurrency(totals.fixedCosts)}</td>
                <td className="currency">{formatCurrency(data.reduce((sum, m) => sum + (m.sundries || 0), 0))}</td>
                <td className={`currency ${totals.profit >= 0 ? 'positive' : 'negative'}`}>
                  {formatCurrency(totals.profit)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
