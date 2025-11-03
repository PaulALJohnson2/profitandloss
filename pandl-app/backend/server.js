import express from 'express';
import cors from 'cors';
import xlsx from 'xlsx';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Path to the Excel file
const EXCEL_PATH = '/Users/pauljohnson/Downloads/P&L 24_25.xlsx';

// Helper function to convert Excel dates
function excelDateToJSDate(serial) {
  if (typeof serial === 'number') {
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    return date_info.toISOString().split('T')[0];
  }
  return serial;
}

// Read and parse the Excel file
function readExcelData() {
  try {
    const workbook = xlsx.readFile(EXCEL_PATH);
    const data = {};

    // Read Monthly Summary - Include all 12 months (Oct-Sep), even with zero values
    const monthlySheet = workbook.Sheets['Monthly Summary'];
    const monthlyData = xlsx.utils.sheet_to_json(monthlySheet, { header: 1 });
    data.monthlySummary = monthlyData.slice(1, 13).map(row => ({
      month: excelDateToJSDate(row[0]),
      grossIncome: row[1] || 0,
      netIncome: row[2] || 0,
      abbiePay: row[3] || 0,
      wages: row[4] || 0,
      fixedCosts: row[5] || 0,
      sundries: row[6] || 0,
      profit: row[7] || 0
    })).filter(row => row.month); // Keep all months that have a date, including those with zero values

    // Read Daily Pub Figures - Include all days through September 30th
    const dailySheet = workbook.Sheets['Daily Pub Figures'];
    const dailyData = xlsx.utils.sheet_to_json(dailySheet, { header: 1 });
    let dailyFigures = dailyData.slice(1).map(row => ({
      date: excelDateToJSDate(row[0]),
      grossTotal: row[1] || 0,
      netTotal: row[2] || 0,
      fee: row[3] || 0,
      grossIncome: row[4] || 0,
      netIncome: row[5] || 0,
      vat: row[6] || 0,
      abbiesPay: row[7] || 0
    })).filter(row => row.date);

    // Fill in missing dates through September 30th of the financial year
    if (dailyFigures.length > 0) {
      const lastDate = new Date(dailyFigures[dailyFigures.length - 1].date);
      const endOfYear = new Date(lastDate.getFullYear(), 8, 30, 23, 59, 59); // September 30th end of day

      // If last date is in September and before the 30th, fill in the remaining days
      if (lastDate.getMonth() === 8 && lastDate.getDate() <= 30) {
        const currentDate = new Date(lastDate);
        currentDate.setDate(currentDate.getDate() + 1);

        // Add remaining days up to and including September 30th
        while (currentDate.getDate() <= 30 && currentDate.getMonth() === 8) {
          dailyFigures.push({
            date: currentDate.toISOString().split('T')[0],
            grossTotal: 0,
            netTotal: 0,
            fee: 0,
            grossIncome: 0,
            netIncome: 0,
            vat: 0,
            abbiesPay: 0
          });
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }
    }

    data.dailyFigures = dailyFigures;

    // Read Wages - Include all 12 months, handle zero values
    const wagesSheet = workbook.Sheets['Wages'];
    const wagesData = xlsx.utils.sheet_to_json(wagesSheet, { header: 1 });
    data.wages = wagesData.slice(1, 13).map(row => ({
      month: row[0],
      netOut: row[1] || 0,
      invoices: row[2] || 0,
      hmrc: row[3] || 0,
      nest: row[4] || 0,
      deductions: row[5] || 0,
      total: row[6] || 0
    })).filter(row => row.month && row.month !== 'Totals');

    // Read Fixed Costs
    const fixedSheet = workbook.Sheets['Fixed'];
    const fixedData = xlsx.utils.sheet_to_json(fixedSheet, { header: 1 });
    data.fixedCosts = fixedData.slice(1, 8).map(row => ({
      service: row[0],
      cost: row[1],
      netCost: row[2],
      vat: row[3]
    })).filter(row => row.service && row.service !== 'Totals');

    // Monthly fixed costs
    data.fixedCostsMonthly = fixedData.slice(1, 13).map(row => ({
      month: row[5],
      totalCost: row[6]
    })).filter(row => row.month && row.month !== 'Totals');

    // Read VAT
    const vatSheet = workbook.Sheets['VAT'];
    const vatData = xlsx.utils.sheet_to_json(vatSheet, { header: 1 });
    data.vat = vatData.slice(1, 5).map(row => ({
      startDate: excelDateToJSDate(row[0]),
      endDate: excelDateToJSDate(row[1]),
      hmrcAmount: row[2],
      marstonsAmount: row[3],
      difference: row[4]
    })).filter(row => row.startDate);

    // Read Sundries
    const sundriesSheet = workbook.Sheets['Sundries'];
    const sundriesData = xlsx.utils.sheet_to_json(sundriesSheet, { header: 1 });
    data.sundries = sundriesData.slice(1).map(row => ({
      date: excelDateToJSDate(row[0]),
      amount: row[1],
      vat: row[2],
      net: row[3]
    })).filter(row => row.date && row.amount);

    return data;
  } catch (error) {
    console.error('Error reading Excel file:', error);
    throw error;
  }
}

// API Endpoints
app.get('/api/data', (req, res) => {
  try {
    const data = readExcelData();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read data' });
  }
});

app.get('/api/monthly-summary', (req, res) => {
  try {
    const data = readExcelData();
    res.json(data.monthlySummary);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read monthly summary' });
  }
});

app.get('/api/daily-figures', (req, res) => {
  try {
    const data = readExcelData();
    const { startDate, endDate } = req.query;

    let filtered = data.dailyFigures;
    if (startDate) {
      filtered = filtered.filter(row => row.date >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter(row => row.date <= endDate);
    }

    res.json(filtered);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read daily figures' });
  }
});

app.get('/api/wages', (req, res) => {
  try {
    const data = readExcelData();
    res.json(data.wages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read wages data' });
  }
});

app.get('/api/fixed-costs', (req, res) => {
  try {
    const data = readExcelData();
    res.json({
      breakdown: data.fixedCosts,
      monthly: data.fixedCostsMonthly
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to read fixed costs' });
  }
});

app.get('/api/vat', (req, res) => {
  try {
    const data = readExcelData();
    res.json(data.vat);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read VAT data' });
  }
});

app.get('/api/sundries', (req, res) => {
  try {
    const data = readExcelData();
    res.json(data.sundries);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read sundries data' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
