import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { formatCurrency, getMonthName } from '../utils/formatters';
import { useAuth } from '../contexts/AuthContext';
import { getAllFixedCosts, getAllFixedCostsMonthly } from '../firebase/firestoreService';
import FixedCostForm from '../components/FixedCostForm';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0'];

function FixedCosts({ year }) {
  const { currentUser } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editServiceId, setEditServiceId] = useState(null);

  // Helper function for day suffix
  const getDaySuffix = (day) => {
    if (day >= 11 && day <= 13) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  const fetchData = async () => {
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
  };

  useEffect(() => {
    fetchData();
  }, [currentUser, year]);

  const handleFormSave = () => {
    fetchData();
  };

  const handleRowClick = (serviceId) => {
    setEditServiceId(serviceId);
    setEditModalOpen(true);
  };

  const handleEditModalClose = () => {
    setEditModalOpen(false);
    setEditServiceId(null);
    fetchData();
  };

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0 }}>Fixed Costs {year}</h1>
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
          {showForm ? 'Hide Form' : '+ Add Fixed Cost'}
        </button>
      </div>

      {showForm && <FixedCostForm onSave={handleFormSave} year={year || '2024-25'} />}

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
                <th>Frequency</th>
                <th className="currency">Cost</th>
                <th className="currency">Net Cost</th>
                <th className="currency">VAT</th>
                <th className="currency">Est. Annual Cost</th>
              </tr>
            </thead>
            <tbody>
              {data.breakdown.map((item, index) => {
                // Format frequency display
                let frequencyDisplay = 'Monthly';
                if (item.frequency === 'weekly') {
                  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                  frequencyDisplay = `Weekly (${days[item.dayOfWeek] || 'N/A'})`;
                } else if (item.frequency === 'monthly') {
                  frequencyDisplay = `Monthly (${item.dayOfMonth || 1}${getDaySuffix(item.dayOfMonth || 1)})`;
                } else if (item.frequency === 'yearly') {
                  frequencyDisplay = `Yearly (${item.yearlyDate || 'N/A'})`;
                }

                // Estimate annual cost based on frequency
                let estimatedAnnual = item.cost * 12;
                if (item.frequency === 'weekly') {
                  estimatedAnnual = item.cost * 52; // 52 weeks per year
                } else if (item.frequency === 'yearly') {
                  estimatedAnnual = item.cost;
                }

                // Check if includes VAT (default to true for backward compatibility)
                const includesVat = item.includesVat !== undefined ? item.includesVat : true;

                return (
                  <tr
                    key={index}
                    onClick={() => handleRowClick(item.id)}
                    style={{
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                      opacity: item.cancelled ? 0.6 : 1
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f7fafc';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '';
                    }}
                  >
                    <td>
                      {item.service}
                      {!includesVat && (
                        <span style={{
                          marginLeft: '0.5rem',
                          fontSize: '0.75rem',
                          backgroundColor: '#e6fffa',
                          color: '#047857',
                          padding: '0.125rem 0.375rem',
                          borderRadius: '3px',
                          fontWeight: '500'
                        }}>
                          VAT-exempt
                        </span>
                      )}
                      {item.cancelled && (
                        <span style={{
                          marginLeft: '0.5rem',
                          fontSize: '0.75rem',
                          backgroundColor: '#fed7d7',
                          color: '#c53030',
                          padding: '0.125rem 0.375rem',
                          borderRadius: '3px',
                          fontWeight: '500'
                        }}>
                          Cancelled {item.cancelledDate ? new Date(item.cancelledDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                        </span>
                      )}
                    </td>
                    <td>{frequencyDisplay}</td>
                    <td className="currency">{formatCurrency(item.cost)}</td>
                    <td className="currency">{formatCurrency(item.netCost)}</td>
                    <td className="currency">{formatCurrency(item.vat)}</td>
                    <td className="currency">{formatCurrency(estimatedAnnual)}</td>
                  </tr>
                );
              })}
              <tr style={{ fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>
                <td>TOTAL</td>
                <td></td>
                <td className="currency">{formatCurrency(totalCost)}</td>
                <td className="currency">{formatCurrency(totalNetCost)}</td>
                <td className="currency">{formatCurrency(totalVAT)}</td>
                <td className="currency">-</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ backgroundColor: '#fff3cd', border: '1px solid #ffc107', marginTop: '1rem' }}>
        <h3 style={{ marginTop: 0, color: '#856404' }}>💡 Note: Monthly Costs</h3>
        <p style={{ color: '#856404', marginBottom: 0 }}>
          Fixed costs are now calculated dynamically based on frequency (weekly/monthly/yearly).
          You can see the actual monthly totals including all frequencies in the <strong>Dashboard</strong> page
          under "Fixed Costs" for each month.
        </p>
      </div>

      <div className="card" style={{ backgroundColor: '#f7fafc', marginTop: '1rem' }}>
        <h3>Fixed Cost Services</h3>
        <ul style={{ lineHeight: '1.8', paddingLeft: '1.5rem' }}>
          {data.breakdown.map((item, index) => {
            // Determine frequency label
            let frequencyLabel = '/month';
            if (item.frequency === 'weekly') {
              const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
              frequencyLabel = `/week (${days[item.dayOfWeek] || 'N/A'})`;
            } else if (item.frequency === 'monthly') {
              frequencyLabel = `/month (${item.dayOfMonth || 1}${getDaySuffix(item.dayOfMonth || 1)})`;
            } else if (item.frequency === 'yearly') {
              const [month, day] = (item.yearlyDate || '01-01').split('-');
              const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              frequencyLabel = `/year (${monthNames[parseInt(month, 10) - 1]} ${parseInt(day, 10)}${getDaySuffix(parseInt(day, 10))})`;
            }

            return (
              <li key={index}>
                <strong>{item.service}:</strong> {formatCurrency(item.cost)}{frequencyLabel}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Edit Modal */}
      {editModalOpen && editServiceId && (
        <div
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
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleEditModalClose();
            }
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              maxWidth: '800px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto',
              padding: '1.5rem',
              position: 'relative'
            }}
          >
            <button
              onClick={handleEditModalClose}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: '#4a5568',
                padding: '0.5rem',
                lineHeight: 1
              }}
              aria-label="Close"
            >
              ×
            </button>
            <FixedCostForm
              onSave={handleEditModalClose}
              year={year || '2024-25'}
              initialServiceId={editServiceId}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default FixedCosts;
