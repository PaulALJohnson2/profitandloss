import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { getAllYears, getAllMonthlySummaries, recalculateAllMonthlySummaries } from '../firebase/firestoreService';
import { formatCurrency } from '../utils/formatters';
import { getFiscalYearMonths } from '../utils/fiscalYearUtils';

function YearOnYear({ year }) {
  const { currentUser } = useAuth();
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYears, setSelectedYears] = useState([]);
  const [yearData, setYearData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recalculating, setRecalculating] = useState(false);

  // Fetch available years
  useEffect(() => {
    const fetchYears = async () => {
      if (!currentUser) return;

      const result = await getAllYears(currentUser.uid);
      if (result.success) {
        setAvailableYears(result.data);
        // Select the two most recent years by default
        const defaultYears = result.data.slice(0, 2);
        setSelectedYears(defaultYears);
      } else {
        setError(result.error);
      }
    };

    fetchYears();
  }, [currentUser]);

  // Fetch data for selected years
  useEffect(() => {
    const fetchYearData = async () => {
      if (!currentUser || selectedYears.length === 0) return;

      setLoading(true);
      const data = {};

      for (const year of selectedYears) {
        const result = await getAllMonthlySummaries(currentUser.uid, year);
        if (result.success) {
          // Check if summaries are empty or all zeros
          const hasData = result.data.length > 0 && result.data.some(m =>
            (m.netIncome || 0) > 0 || (m.profit || 0) > 0 || (m.wages || 0) > 0
          );

          // If no monthly summaries exist or they're all zeros, try to recalculate them
          if (!hasData) {
            console.log(`No data found for ${year}, attempting to recalculate...`);
            await recalculateAllMonthlySummaries(currentUser.uid, year);

            // Fetch again after recalculation
            const retryResult = await getAllMonthlySummaries(currentUser.uid, year);
            if (retryResult.success) {
              data[year] = retryResult.data;
            }
          } else {
            data[year] = result.data;
          }
        }
      }

      setYearData(data);
      setLoading(false);
    };

    fetchYearData();
  }, [currentUser, selectedYears]);

  const toggleYearSelection = (year) => {
    if (selectedYears.includes(year)) {
      setSelectedYears(selectedYears.filter(y => y !== year));
    } else {
      setSelectedYears([...selectedYears, year]);
    }
  };

  const handleRecalculateAll = async () => {
    if (!currentUser || selectedYears.length === 0) return;

    setRecalculating(true);
    try {
      for (const year of selectedYears) {
        console.log(`Recalculating monthly summaries for ${year}...`);
        await recalculateAllMonthlySummaries(currentUser.uid, year);
      }

      // Refresh data after recalculation
      const data = {};
      for (const year of selectedYears) {
        const result = await getAllMonthlySummaries(currentUser.uid, year);
        if (result.success) {
          data[year] = result.data;
        }
      }
      setYearData(data);
      console.log('Recalculation complete!');
    } catch (err) {
      console.error('Error recalculating:', err);
      setError('Failed to recalculate monthly summaries');
    } finally {
      setRecalculating(false);
    }
  };

  // Calculate annual totals for each year
  const calculateAnnualTotals = (summaries) => {
    return summaries.reduce((acc, month) => ({
      grossIncome: acc.grossIncome + (month.grossIncome || 0),
      netIncome: acc.netIncome + (month.netIncome || 0),
      abbiePay: acc.abbiePay + (month.abbiePay || 0),
      wages: acc.wages + (month.wages || 0),
      fixedCosts: acc.fixedCosts + (month.fixedCosts || 0),
      sundries: acc.sundries + (month.sundries || 0),
      vat: acc.vat + (month.vat || 0),
      profit: acc.profit + (month.profit || 0)
    }), {
      grossIncome: 0,
      netIncome: 0,
      abbiePay: 0,
      wages: 0,
      fixedCosts: 0,
      sundries: 0,
      vat: 0,
      profit: 0
    });
  };

  // Prepare chart data
  const prepareChartData = () => {
    if (selectedYears.length === 0) return [];

    // Get all months for the first selected year as baseline
    const baseYear = selectedYears[0];
    const months = getFiscalYearMonths(baseYear);

    return months.map((month, index) => {
      const monthName = new Date(month + '-01').toLocaleDateString('en-GB', { month: 'short' });
      const dataPoint = { month: monthName };

      selectedYears.forEach(year => {
        const yearMonths = getFiscalYearMonths(year);
        const correspondingMonth = yearMonths[index];
        const monthData = yearData[year]?.find(m => m.month === correspondingMonth);

        dataPoint[`${year}_netIncome`] = monthData?.netIncome || 0;
        dataPoint[`${year}_profit`] = monthData?.profit || 0;
        dataPoint[`${year}_costs`] = (monthData?.wages || 0) + (monthData?.fixedCosts || 0) + (monthData?.sundries || 0) + (monthData?.abbiePay || 0);
      });

      return dataPoint;
    });
  };

  const chartData = prepareChartData();

  // Calculate percentage change
  const calculateChange = (current, previous) => {
    if (!previous || previous === 0) return null;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  if (loading) return <div className="loading">Loading year-on-year data...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  const annualTotals = {};
  selectedYears.forEach(year => {
    if (yearData[year]) {
      annualTotals[year] = calculateAnnualTotals(yearData[year]);
    }
  });

  // Get comparison data (most recent vs previous)
  const sortedYears = [...selectedYears].sort().reverse();
  const currentYearData = sortedYears[0] ? annualTotals[sortedYears[0]] : null;
  const previousYearData = sortedYears[1] ? annualTotals[sortedYears[1]] : null;

  const colors = ['#667eea', '#f56565', '#48bb78', '#ed8936', '#9f7aea', '#38b2ac'];

  return (
    <div className="year-on-year">
      <h1>Year-on-Year Comparison</h1>

      {/* Year Selection */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0 }}>Select Years to Compare</h2>
          {selectedYears.length > 0 && (
            <button
              onClick={handleRecalculateAll}
              disabled={recalculating}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: recalculating ? '#cbd5e0' : '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: recalculating ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem'
              }}
            >
              {recalculating ? 'Recalculating...' : 'Recalculate Data'}
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {availableYears.map(year => (
            <label key={year} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={selectedYears.includes(year)}
                onChange={() => toggleYearSelection(year)}
                style={{ cursor: 'pointer' }}
              />
              <span style={{ fontWeight: selectedYears.includes(year) ? 'bold' : 'normal' }}>
                {year.split('-')[0]}/{year.split('-')[1]}
              </span>
            </label>
          ))}
        </div>
      </div>

      {selectedYears.length === 0 && (
        <div className="card">
          <p style={{ textAlign: 'center', color: '#666' }}>Please select at least one year to compare.</p>
        </div>
      )}

      {selectedYears.length > 0 && (
        <>
          {/* High-Level Comparison Cards */}
          {sortedYears.length >= 2 && currentYearData && previousYearData && (
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">Net Income</div>
                <div className="stat-value">{formatCurrency(currentYearData.netIncome)}</div>
                <div style={{ fontSize: '0.9rem', color: currentYearData.netIncome >= previousYearData.netIncome ? '#48bb78' : '#f56565' }}>
                  {calculateChange(currentYearData.netIncome, previousYearData.netIncome) !== null && (
                    <>
                      {currentYearData.netIncome >= previousYearData.netIncome ? '↑' : '↓'}
                      {Math.abs(calculateChange(currentYearData.netIncome, previousYearData.netIncome))}% vs {sortedYears[1]}
                    </>
                  )}
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-label">Total Costs</div>
                <div className="stat-value">
                  {formatCurrency(currentYearData.wages + currentYearData.fixedCosts + currentYearData.sundries + currentYearData.abbiePay)}
                </div>
                <div style={{ fontSize: '0.9rem', color: (currentYearData.wages + currentYearData.fixedCosts + currentYearData.sundries + currentYearData.abbiePay) <= (previousYearData.wages + previousYearData.fixedCosts + previousYearData.sundries + previousYearData.abbiePay) ? '#48bb78' : '#f56565' }}>
                  {calculateChange(
                    currentYearData.wages + currentYearData.fixedCosts + currentYearData.sundries + currentYearData.abbiePay,
                    previousYearData.wages + previousYearData.fixedCosts + previousYearData.sundries + previousYearData.abbiePay
                  ) !== null && (
                    <>
                      {(currentYearData.wages + currentYearData.fixedCosts + currentYearData.sundries + currentYearData.abbiePay) <= (previousYearData.wages + previousYearData.fixedCosts + previousYearData.sundries + previousYearData.abbiePay) ? '↓' : '↑'}
                      {Math.abs(calculateChange(
                        currentYearData.wages + currentYearData.fixedCosts + currentYearData.sundries + currentYearData.abbiePay,
                        previousYearData.wages + previousYearData.fixedCosts + previousYearData.sundries + previousYearData.abbiePay
                      ))}% vs {sortedYears[1]}
                    </>
                  )}
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-label">Total Profit</div>
                <div className="stat-value">{formatCurrency(currentYearData.profit)}</div>
                <div style={{ fontSize: '0.9rem', color: currentYearData.profit >= previousYearData.profit ? '#48bb78' : '#f56565' }}>
                  {calculateChange(currentYearData.profit, previousYearData.profit) !== null && (
                    <>
                      {currentYearData.profit >= previousYearData.profit ? '↑' : '↓'}
                      {Math.abs(calculateChange(currentYearData.profit, previousYearData.profit))}% vs {sortedYears[1]}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Annual Totals Table */}
          <div className="card">
            <h2>Annual Totals Comparison</h2>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Metric</th>
                    {sortedYears.map(year => (
                      <th key={year} className="currency">{year.split('-')[0]}/{year.split('-')[1]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Gross Income</strong></td>
                    {sortedYears.map(year => (
                      <td key={year} className="currency">{formatCurrency(annualTotals[year]?.grossIncome || 0)}</td>
                    ))}
                  </tr>
                  <tr>
                    <td><strong>Net Income</strong></td>
                    {sortedYears.map(year => (
                      <td key={year} className="currency">{formatCurrency(annualTotals[year]?.netIncome || 0)}</td>
                    ))}
                  </tr>
                  <tr>
                    <td><strong>VAT</strong></td>
                    {sortedYears.map(year => (
                      <td key={year} className="currency">{formatCurrency(annualTotals[year]?.vat || 0)}</td>
                    ))}
                  </tr>
                  <tr style={{ backgroundColor: '#f7fafc' }}>
                    <td><strong>Abbie's Pay</strong></td>
                    {sortedYears.map(year => (
                      <td key={year} className="currency">{formatCurrency(annualTotals[year]?.abbiePay || 0)}</td>
                    ))}
                  </tr>
                  <tr style={{ backgroundColor: '#f7fafc' }}>
                    <td><strong>Wages</strong></td>
                    {sortedYears.map(year => (
                      <td key={year} className="currency">{formatCurrency(annualTotals[year]?.wages || 0)}</td>
                    ))}
                  </tr>
                  <tr style={{ backgroundColor: '#f7fafc' }}>
                    <td><strong>Fixed Costs</strong></td>
                    {sortedYears.map(year => (
                      <td key={year} className="currency">{formatCurrency(annualTotals[year]?.fixedCosts || 0)}</td>
                    ))}
                  </tr>
                  <tr style={{ backgroundColor: '#f7fafc' }}>
                    <td><strong>Expenses</strong></td>
                    {sortedYears.map(year => (
                      <td key={year} className="currency">{formatCurrency(annualTotals[year]?.sundries || 0)}</td>
                    ))}
                  </tr>
                  <tr style={{ backgroundColor: '#e6fffa', fontWeight: 'bold' }}>
                    <td><strong>Total Profit</strong></td>
                    {sortedYears.map(year => (
                      <td key={year} className="currency" style={{ fontWeight: 'bold' }}>
                        {formatCurrency(annualTotals[year]?.profit || 0)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Net Income Comparison Chart */}
          <div className="card">
            <h2>Monthly Net Income Comparison</h2>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                {selectedYears.map((year, index) => (
                  <Line
                    key={year}
                    type="monotone"
                    dataKey={`${year}_netIncome`}
                    name={`${year.split('-')[0]}/${year.split('-')[1]} Net Income`}
                    stroke={colors[index % colors.length]}
                    strokeWidth={2}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Profit Comparison Chart */}
          <div className="card">
            <h2>Monthly Profit Comparison</h2>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                {selectedYears.map((year, index) => (
                  <Bar
                    key={year}
                    dataKey={`${year}_profit`}
                    name={`${year.split('-')[0]}/${year.split('-')[1]} Profit`}
                    fill={colors[index % colors.length]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Costs Comparison Chart */}
          <div className="card">
            <h2>Monthly Total Costs Comparison</h2>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                {selectedYears.map((year, index) => (
                  <Line
                    key={year}
                    type="monotone"
                    dataKey={`${year}_costs`}
                    name={`${year.split('-')[0]}/${year.split('-')[1]} Total Costs`}
                    stroke={colors[index % colors.length]}
                    strokeWidth={2}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly Details Table */}
          <div className="card">
            <h2>Month-by-Month Comparison</h2>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Month</th>
                    {sortedYears.map(year => (
                      <th key={year} colSpan="3" style={{ textAlign: 'center', backgroundColor: '#f7fafc' }}>
                        {year.split('-')[0]}/{year.split('-')[1]}
                      </th>
                    ))}
                  </tr>
                  <tr>
                    <th></th>
                    {sortedYears.map(year => (
                      <React.Fragment key={year}>
                        <th className="currency">Net Income</th>
                        <th className="currency">Costs</th>
                        <th className="currency">Profit</th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((row, index) => (
                    <tr key={index}>
                      <td><strong>{row.month}</strong></td>
                      {sortedYears.map(year => (
                        <React.Fragment key={year}>
                          <td className="currency">{formatCurrency(row[`${year}_netIncome`] || 0)}</td>
                          <td className="currency">{formatCurrency(row[`${year}_costs`] || 0)}</td>
                          <td className="currency">{formatCurrency(row[`${year}_profit`] || 0)}</td>
                        </React.Fragment>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default YearOnYear;
