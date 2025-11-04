import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { saveOrUpdateWages } from '../firebase/firestoreService';

function WagesImport({ year = '2024-25', onImportComplete }) {
  const { currentUser } = useAuth();
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [uploading, setUploading] = useState(false);

  const parseCsvData = (csvText) => {
    const lines = csvText.split('\n');
    const wagesData = [];
    let currentMonth = null;

    // Helper to parse CSV line respecting quotes
    const parseCsvLine = (line) => {
      const result = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current);
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current);
      return result;
    };

    // Remove quotes and commas from numbers
    const cleanNumber = (str) => {
      if (!str) return 0;
      return parseFloat(str.replace(/"/g, '').replace(/,/g, '')) || 0;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Check for summary sections (skip these)
      if (line.includes('Summary') || line.includes('Months') && line.includes('to')) {
        currentMonth = null; // Reset to avoid picking up summary totals
        continue;
      }

      // Check for month headers
      if (line.includes('Month') && line.includes('Ending')) {
        // Extract month from header like "Month 1 - Ending 30 April, 2025"
        const monthMatch = line.match(/Ending \d+ (\w+), \d+/);
        if (monthMatch) {
          currentMonth = monthMatch[1]; // e.g., "April"
        }
      }

      // Check for TOTAL rows (but only if we have a current month set)
      if (line.startsWith('TOTAL') && currentMonth) {
        // Parse the total row properly
        const parts = parseCsvLine(line);

        // Extract values based on CSV structure
        // Format: Name,Surname,Gross Pay,Taxable gross,Tax,NIC-able gross,Employee NICs,Student + Postgrad Loan deduction,Net pay,Take-home pay,Employer NICs,Employer pension,Cost to employer
        // Index:   0    1       2          3             4    5             6             7                                 8        9            10            11                12
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

        console.log(`Parsed ${currentMonth}:`, {
          tax,
          employeeNICs,
          employerNICs,
          takeHomePay,
          employerPension,
          costToEmployer,
          hmrc
        });
      }
    }

    return wagesData;
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setImporting(true);
    setError(null);
    setResult(null);
    setPreviewData(null);

    try {
      const text = await file.text();
      const wagesData = parseCsvData(text);

      if (wagesData.length === 0) {
        throw new Error('No wage data found in CSV file');
      }

      // Show preview
      setPreviewData(wagesData);
    } catch (err) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  const handleUpload = async () => {
    if (!previewData) return;

    setUploading(true);
    setError(null);

    try {
      // Upload to Firebase
      let successCount = 0;
      let failCount = 0;

      for (const wage of previewData) {
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
        total: previewData.length,
        success: successCount,
        failed: failCount,
        data: previewData
      });

      setPreviewData(null);

      if (onImportComplete) {
        onImportComplete();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
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
          onChange={handleFileSelect}
          disabled={importing || uploading}
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
          ⏳ Reading CSV file...
        </div>
      )}

      {uploading && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#bee3f8',
          color: '#2c5282',
          borderRadius: '4px',
          marginBottom: '1rem'
        }}>
          ⏳ Uploading wages data to Firebase...
        </div>
      )}

      {previewData && !uploading && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#fff5e6',
          border: '2px solid #f6ad55',
          borderRadius: '4px',
          marginBottom: '1rem'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '1.1rem' }}>
            📋 Preview - Ready to Upload
          </div>
          <div style={{ marginBottom: '1rem' }}>
            Found {previewData.length} months of wage data. Review below and click Upload to save.
          </div>

          <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '1rem' }}>
            <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f7fafc', borderBottom: '2px solid #cbd5e0' }}>
                  <th style={{ padding: '0.5rem', textAlign: 'left' }}>Month</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>Net Out</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>HMRC</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>Nest</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {previewData.map((wage, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.5rem' }}><strong>{wage.month}</strong></td>
                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>£{wage.netOut.toFixed(2)}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>£{wage.hmrc.toFixed(2)}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>£{wage.nest.toFixed(2)}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right' }}><strong>£{wage.total.toFixed(2)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={handleUpload}
              style={{
                padding: '0.75rem 2rem',
                backgroundColor: '#48bb78',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 'bold'
              }}
            >
              Upload
            </button>
            <button
              onClick={() => setPreviewData(null)}
              style={{
                padding: '0.75rem 2rem',
                backgroundColor: '#e2e8f0',
                color: '#4a5568',
                border: '1px solid #cbd5e0',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              Cancel
            </button>
          </div>
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
