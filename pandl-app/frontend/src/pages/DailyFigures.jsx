import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { formatCurrency, formatDate } from '../utils/formatters';
import DailyFigureForm from '../components/DailyFigureForm';
import { useAuth } from '../contexts/AuthContext';
import { getAllDailyFigures } from '../firebase/firestoreService';
import { getFiscalYearDates, isPastFiscalYearEnd, getFiscalYearMonths } from '../utils/fiscalYearUtils';

function DailyFigures({ year }) {
  const { currentUser } = useAuth();
  const location = useLocation();
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Calculate fiscal year dates dynamically
  const fiscalYearDates = getFiscalYearDates(year || '2024-25');
  const defaultStartDate = fiscalYearDates.startDate.toISOString().split('T')[0];
  const defaultEndDate = fiscalYearDates.endDate.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [showForm, setShowForm] = useState(location.state?.openForm || false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editDate, setEditDate] = useState(null);

  // Update date filters when year changes
  useEffect(() => {
    const dates = getFiscalYearDates(year || '2024-25');
    const newStartDate = dates.startDate.toISOString().split('T')[0];
    const newEndDate = dates.endDate.toISOString().split('T')[0];
    setStartDate(newStartDate);
    setEndDate(newEndDate);
  }, [year]);

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
    // Don't close the form - let it advance to next date automatically
    fetchData();
  };

  const handleRowClick = (date) => {
    setEditDate(date);
    setEditModalOpen(true);
  };

  const handleEditModalClose = () => {
    setEditModalOpen(false);
    setEditDate(null);
    fetchData(); // Refresh data after editing
  };

  const handleMonthFilter = (monthString) => {
    // monthString is in format "YYYY-MM"
    const [yearNum, monthNum] = monthString.split('-');
    // Get the last day of the month
    const lastDay = new Date(parseInt(yearNum), parseInt(monthNum), 0).getDate();
    const monthStart = `${monthString}-01`;
    const monthEnd = `${monthString}-${String(lastDay).padStart(2, '0')}`;

    setStartDate(monthStart);
    setEndDate(monthEnd);

    // No need to call fetchData() - the useEffect will handle it automatically
  };

  const handleResetFilter = () => {
    const fiscalYearDates = getFiscalYearDates(year || '2024-25');
    setStartDate(fiscalYearDates.startDate.toISOString().split('T')[0]);
    setEndDate(fiscalYearDates.endDate.toISOString().split('T')[0]);
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  // Check if fiscal year is complete
  const isFiscalYearComplete = isPastFiscalYearEnd(year || '2024-25');

  // Get the default date for the form
  const getDefaultFormDate = () => {
    // Create a map of dates to their figure data
    const dateMap = new Map(data.map(figure => [figure.date, figure]));

    // Get fiscal year date range
    const fiscalYearDates = getFiscalYearDates(year || '2024-25');
    const startDate = new Date(fiscalYearDates.startDate);
    const endDate = new Date(fiscalYearDates.endDate);

    // Find the earliest date without a figure or with 0.00 (excluding December 25th and noTrade days)
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
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

    // If all dates are filled, default to today (for current year) or first day (for past years)
    if (isFiscalYearComplete) {
      return fiscalYearDates.startDate.toISOString().split('T')[0];
    }
    return null; // null defaults to today
  };

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
          {showForm ? 'Hide Form' : (isFiscalYearComplete ? 'Edit Past Figure' : '+ Add Daily Figure')}
        </button>
      </div>

      {showForm && <DailyFigureForm onSave={handleFormSave} year={year || '2024-25'} initialDate={getDefaultFormDate()} allData={data} />}

      <div className="card">
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
          {/* Month Quick Filters */}
          <div style={{ flex: '1', minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Quick Filter by Month</label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0.5rem'
            }}>
              {getFiscalYearMonths(year || '2024-25').map(month => {
                const monthDate = new Date(month + '-01');
                const monthName = monthDate.toLocaleDateString('en-GB', { month: 'short' });
                const isActive = startDate.startsWith(month);

                return (
                  <button
                    key={month}
                    onClick={() => handleMonthFilter(month)}
                    style={{
                      padding: '0.5rem',
                      backgroundColor: isActive ? '#667eea' : '#f7fafc',
                      color: isActive ? 'white' : '#4a5568',
                      border: isActive ? 'none' : '1px solid #e2e8f0',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: isActive ? '600' : '500',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.target.style.backgroundColor = '#edf2f7';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.target.style.backgroundColor = '#f7fafc';
                      }
                    }}
                  >
                    {monthName}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date Range Filters */}
          <div style={{ flex: '1', minWidth: '300px' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Custom Date Range</label>
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
              <button onClick={handleResetFilter} style={{
                padding: '0.5rem 1.5rem',
                backgroundColor: '#e2e8f0',
                color: '#4a5568',
                border: '1px solid #cbd5e0',
                borderRadius: '4px',
                cursor: 'pointer',
                marginTop: 'auto'
              }}>
                Reset Filter
              </button>
            </div>
          </div>
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
                <tr
                  key={index}
                  onClick={() => handleRowClick(day.date)}
                  style={{
                    cursor: 'pointer',
                    backgroundColor: day.noTrade ? '#fed7d7' : undefined,
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!day.noTrade) {
                      e.currentTarget.style.backgroundColor = '#f7fafc';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!day.noTrade) {
                      e.currentTarget.style.backgroundColor = '';
                    }
                  }}
                >
                  <td>
                    {formatDate(day.date)}
                    {day.noTrade && (
                      <span style={{
                        marginLeft: '0.5rem',
                        padding: '0.25rem 0.5rem',
                        backgroundColor: '#e53e3e',
                        color: 'white',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: '600'
                      }}>
                        NO TRADE
                      </span>
                    )}
                  </td>
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

      {/* Edit Modal */}
      {editModalOpen && editDate && (
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
            // Close modal if clicking on backdrop
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
            <DailyFigureForm
              onSave={handleEditModalClose}
              year={year || '2024-25'}
              initialDate={editDate}
              allData={data}
              autoAdvance={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default DailyFigures;
