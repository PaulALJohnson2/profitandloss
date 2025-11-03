import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { formatCurrency, getMonthName } from '../utils/formatters';
import { useAuth } from '../contexts/AuthContext';
import { getAllFixedCosts, getAllFixedCostsMonthly } from '../firebase/firestoreService';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0'];

function FixedCosts({ year }) {
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

      const [costsResult, monthlyResult] = await Promise.all([
        getAllFixedCosts(currentUser.uid, year || '2024-25'),
        getAllFixedCostsMonthly(currentUser.uid, year || '2024-25')
      ]);

      if (costsResult.success && monthlyResult.success) {
        setData({
          breakdown: costsResult.data,
          monthly: monthlyResult.data
        });
      } else {
        setError(costsResult.error || monthlyResult.error);
      }
      setLoading(false);
    }

    fetchData();
  }, [currentUser, year]);

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (!data || !data.breakdown) return <div className="error">No data available</div>;

  // Calculate totals
  const totalCost = data.breakdown.reduce((sum, item) => sum + (item.cost || 0), 0);
  const totalNetCost = data.breakdown.reduce((sum, item) => sum + (item.netCost || 0), 0);
  const totalVAT = data.breakdown.reduce((sum, item) => sum + (item.vat || 0), 0);

  // Prepare pie chart data
  const pieData = data.breakdown.map(item => ({
    name: item.service,
    value: item.cost
  }));

  return (
    <div className="fixed-costs">
      <h1>Fixed Costs {year}</h1>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Monthly Fixed Costs</div>
          <div className="stat-value">{formatCurrency(totalCost)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Net Cost</div>
          <div className="stat-value">{formatCurrency(totalNetCost)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">VAT</div>
          <div className="stat-value">{formatCurrency(totalVAT)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Annual Fixed Costs</div>
          <div className="stat-value">{formatCurrency(totalCost * 12)}</div>
        </div>
      </div>

      <div className="card">
        <h2>Cost Breakdown</h2>
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatCurrency(value)} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h2>Service Details</h2>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Service</th>
                <th className="currency">Cost</th>
                <th className="currency">Net Cost</th>
                <th className="currency">VAT</th>
                <th className="currency">Annual Cost</th>
              </tr>
            </thead>
            <tbody>
              {data.breakdown.map((item, index) => (
                <tr key={index}>
                  <td>{item.service}</td>
                  <td className="currency">{formatCurrency(item.cost)}</td>
                  <td className="currency">{formatCurrency(item.netCost)}</td>
                  <td className="currency">{formatCurrency(item.vat)}</td>
                  <td className="currency">{formatCurrency(item.cost * 12)}</td>
                </tr>
              ))}
              <tr style={{ fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>
                <td>TOTAL</td>
                <td className="currency">{formatCurrency(totalCost)}</td>
                <td className="currency">{formatCurrency(totalNetCost)}</td>
                <td className="currency">{formatCurrency(totalVAT)}</td>
                <td className="currency">{formatCurrency(totalCost * 12)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {data.monthly && data.monthly.length > 0 && (
        <div className="card">
          <h2>Monthly Fixed Costs Paid</h2>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th className="currency">Total Cost</th>
                </tr>
              </thead>
              <tbody>
                {data.monthly.map((item, index) => (
                  <tr key={index}>
                    <td>{getMonthName(item.month)}</td>
                    <td className="currency">{formatCurrency(item.totalCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card" style={{ backgroundColor: '#f7fafc', marginTop: '1rem' }}>
        <h3>Fixed Cost Services</h3>
        <ul style={{ lineHeight: '1.8', paddingLeft: '1.5rem' }}>
          {data.breakdown.map((item, index) => (
            <li key={index}>
              <strong>{item.service}:</strong> {formatCurrency(item.cost)}/month
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default FixedCosts;
