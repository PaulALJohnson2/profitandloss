import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency, getMonthName } from '../utils/formatters';
import { useAuth } from '../contexts/AuthContext';
import { getAllWages } from '../firebase/firestoreService';
import { getFiscalYearMonths } from '../utils/fiscalYearUtils';

function Wages({ year }) {
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

      const result = await getAllWages(currentUser.uid, year || '2024-25');
      if (result.success) {
        // Get all fiscal year months in correct order
        const fiscalYearMonths = getFiscalYearMonths(year || '2024-25');

        // Create a map of existing data
        const dataMap = new Map();
        result.data.forEach(item => {
          dataMap.set(item.month, item);
        });

        // Fill in all months, using existing data or zeros
        const sortedData = fiscalYearMonths.map(month => {
          if (dataMap.has(month)) {
            return dataMap.get(month);
          } else {
            return {
              month,
              netOut: 0,
              invoices: 0,
              hmrc: 0,
              nest: 0,
              deductions: 0,
              total: 0
            };
          }
        });

        setData(sortedData);
      } else {
        setError(result.error);
      }
      setLoading(false);
    }

    fetchData();
  }, [currentUser, year]);

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
      <h1>Wages Breakdown {year}</h1>

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
                <tr key={index}>
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
    </div>
  );
}

export default Wages;
