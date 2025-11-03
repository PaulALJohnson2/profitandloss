import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { saveOrUpdateWages } from '../firebase/firestoreService';

function WagesImport({ year = '2024-25', onImportComplete }) {
  const { currentUser } = useAuth();
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const parseCsvData = (csvText) => {
    const lines = csvText.split('\n');
    const wagesData = [];
    let currentMonth = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Check for month headers
      if (line.includes('Month') && line.includes('Ending')) {
        // Extract month from header like "Month 1 - Ending 30 April, 2025"
        const monthMatch = line.match(/Ending \d+ (\w+), \d+/);
        if (monthMatch) {
          currentMonth = monthMatch[1]; // e.g., "April"
        }
      }

      // Check for TOTAL rows
      if (line.startsWith('TOTAL') && currentMonth) {
        // Parse the total row
        const parts = line.split(',');

        // Remove quotes and commas from numbers
        const cleanNumber = (str) => {
          if (!str) return 0;
          return parseFloat(str.replace(/"/g, '').replace(/,/g, '')) || 0;
        };

        // Extract values based on CSV structure
        // Format: Name,Surname,Gross Pay,Taxable gross,Tax,NIC-able gross,Employee NICs,Student + Postgrad Loan deduction,Net pay,Take-home pay,Employer NICs,Employer pension,Cost to employer
        const tax = cleanNumber(parts[4]);
        const employeeNICs = cleanNumber(parts[6]);
        const takeHomePay = cleanNumber(parts[9]);
        const employerNICs = cleanNumber(parts[10]);
        const employerPension = cleanNumber(parts[11]);
        const costToEmployer = cleanNumber(parts[12]);

        // Calculate HMRC total (Tax + Employee NICs + Employer NICs)
        const hmrc = tax + employeeNICs + employerNICs;

        wagesData.push({
          month: currentMonth,
          netOut: takeHomePay,
          invoices: 0, // Not in CSV
          hmrc: hmrc,
          nest: employerPension,
          deductions: 0, // Not in CSV
          total: costToEmployer
        });
      }
    }

    return wagesData;
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setImporting(true);
    setError(null);
    setResult(null);

    try {
      const text = await file.text();
      const wagesData = parseCsvData(text);

      if (wagesData.length === 0) {
        throw new Error('No wage data found in CSV file');
      }

      // Upload to Firebase
      let successCount = 0;
      let failCount = 0;

      for (const wage of wagesData) {
        const uploadResult = await saveOrUpdateWages(
          currentUser.uid,
          year,
          wage.month,
          wage
        );

        if (uploadResult.success) {
          successCount++;
        } else {
          failCount++;
          console.error(`Failed to upload ${wage.month}:`, uploadResult.error);
        }
      }

      setResult({
        total: wagesData.length,
        success: successCount,
        failed: failCount,
        data: wagesData
      });

      if (onImportComplete) {
        onImportComplete();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="card" style={{ marginBottom: '2rem' }}>
      <h2>Import Wages from CSV</h2>
      <p style={{ color: '#718096', marginBottom: '1rem' }}>
        Upload your accountant's payroll summary CSV file to automatically import wage data.
      </p>

      <div style={{ marginBottom: '1rem' }}>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          disabled={importing}
          style={{
            padding: '0.5rem',
            border: '1px solid #cbd5e0',
            borderRadius: '4px',
            fontSize: '1rem'
          }}
        />
      </div>

      {importing && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#bee3f8',
          color: '#2c5282',
          borderRadius: '4px',
          marginBottom: '1rem'
        }}>
          ⏳ Importing wages data...
        </div>
      )}

      {error && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#fed7d7',
          color: '#c53030',
          borderRadius: '4px',
          marginBottom: '1rem'
        }}>
          ❌ Error: {error}
        </div>
      )}

      {result && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#c6f6d5',
          color: '#22543d',
          borderRadius: '4px',
          marginBottom: '1rem'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
            ✅ Import Complete!
          </div>
          <div>Successfully imported {result.success} of {result.total} months</div>
          {result.failed > 0 && <div style={{ color: '#c53030' }}>Failed: {result.failed}</div>}

          <div style={{ marginTop: '1rem' }}>
            <strong>Imported months:</strong>
            <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
              {result.data.map((wage, idx) => (
                <li key={idx}>
                  {wage.month}: £{wage.netOut.toFixed(2)} (Net Out), £{wage.total.toFixed(2)} (Total)
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div style={{
        padding: '1rem',
        backgroundColor: '#f7fafc',
        borderRadius: '4px',
        fontSize: '0.875rem',
        color: '#4a5568'
      }}>
        <strong>CSV Format:</strong>
        <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
          <li><strong>Net Out</strong> = Take-home pay (column 10)</li>
          <li><strong>HMRC</strong> = Tax + Employee NICs + Employer NICs</li>
          <li><strong>Nest</strong> = Employer pension</li>
          <li><strong>Total</strong> = Cost to employer</li>
        </ul>
      </div>
    </div>
  );
}

export default WagesImport;
