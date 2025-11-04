import React, { useState, useEffect } from 'react';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useAuth } from '../contexts/AuthContext';
import { getAllSundries } from '../firebase/firestoreService';

function Sundries({ year }) {
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

      const result = await getAllSundries(currentUser.uid, year || '2024-25');
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

  // Calculate totals
  const totals = data.reduce((acc, item) => ({
    amount: acc.amount + (item.amount || 0),
    vat: acc.vat + (item.vat || 0),
    net: acc.net + (item.net || 0)
  }), { amount: 0, vat: 0, net: 0 });

  return (
    <div className="sundries">
      <h1>Expenses {year}</h1>

      {data.length === 0 ? (
        <div className="card">
          <h2>No Expenses Recorded</h2>
          <p>There are currently no expenses recorded for this financial year.</p>
        </div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Total Amount</div>
              <div className="stat-value">{formatCurrency(totals.amount)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total VAT</div>
              <div className="stat-value">{formatCurrency(totals.vat)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Net</div>
              <div className="stat-value">{formatCurrency(totals.net)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Number of Items</div>
              <div className="stat-value">{data.length}</div>
            </div>
          </div>

          <div className="card">
            <h2>Expense Details</h2>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th className="currency">Amount</th>
                    <th className="currency">VAT</th>
                    <th className="currency">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item, index) => (
                    <tr key={index}>
                      <td>{formatDate(item.date)}</td>
                      <td className="currency">{formatCurrency(item.amount)}</td>
                      <td className="currency">{formatCurrency(item.vat)}</td>
                      <td className="currency">{formatCurrency(item.net)}</td>
                    </tr>
                  ))}
                  <tr style={{ fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>
                    <td>TOTAL</td>
                    <td className="currency">{formatCurrency(totals.amount)}</td>
                    <td className="currency">{formatCurrency(totals.vat)}</td>
                    <td className="currency">{formatCurrency(totals.net)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <div className="card" style={{ backgroundColor: '#f7fafc', marginTop: '1rem' }}>
        <h3>About Expenses</h3>
        <p>
          Expenses are miscellaneous costs that don't fall into regular categories like wages or fixed costs.
          These might include one-off purchases, repairs, or other irregular expenses.
        </p>
      </div>
    </div>
  );
}

export default Sundries;
