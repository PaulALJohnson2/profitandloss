import xlsx from 'xlsx';
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
// This uses your Firebase CLI credentials (no service account key needed!)
// Make sure you're logged in: firebase login
admin.initializeApp({
  projectId: 'profit-and-loss-294a7'
});

const db = admin.firestore();

// Configuration
const USER_ID = '1ToDjxTaXAb9aNDecWHSkuNldCS2';
const YEAR = '2024-25';
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

// Helper function to convert undefined/null to 0
function toNumber(value) {
  return value === undefined || value === null || value === '' ? 0 : Number(value);
}

// Read the Excel file
function readExcelData() {
  const workbook = xlsx.readFile(EXCEL_PATH);
  const data = {};

  // Read Monthly Summary
  const monthlySheet = workbook.Sheets['Monthly Summary'];
  const monthlyData = xlsx.utils.sheet_to_json(monthlySheet, { header: 1 });
  data.monthlySummary = monthlyData.slice(1, 13).map(row => ({
    month: excelDateToJSDate(row[0]),
    grossIncome: toNumber(row[1]),
    netIncome: toNumber(row[2]),
    abbiePay: toNumber(row[3]),
    wages: toNumber(row[4]),
    fixedCosts: toNumber(row[5]),
    sundries: toNumber(row[6]),
    profit: toNumber(row[7])
  })).filter(row => row.month);

  // Read Daily Pub Figures
  const dailySheet = workbook.Sheets['Daily Pub Figures'];
  const dailyData = xlsx.utils.sheet_to_json(dailySheet, { header: 1 });
  data.dailyFigures = dailyData.slice(1).map(row => ({
    date: excelDateToJSDate(row[0]),
    grossTotal: toNumber(row[1]),
    netTotal: toNumber(row[2]),
    fee: toNumber(row[3]),
    grossIncome: toNumber(row[4]),
    netIncome: toNumber(row[5]),
    vat: toNumber(row[6]),
    abbiesPay: toNumber(row[7])
  })).filter(row => row.date);

  // Read Wages
  const wagesSheet = workbook.Sheets['Wages'];
  const wagesData = xlsx.utils.sheet_to_json(wagesSheet, { header: 1 });
  data.wages = wagesData.slice(1, 13).map(row => ({
    month: row[0],
    netOut: toNumber(row[1]),
    invoices: toNumber(row[2]),
    hmrc: toNumber(row[3]),
    nest: toNumber(row[4]),
    deductions: toNumber(row[5]),
    total: toNumber(row[6])
  })).filter(row => row.month && row.month !== 'Totals');

  // Read Fixed Costs
  const fixedSheet = workbook.Sheets['Fixed'];
  const fixedData = xlsx.utils.sheet_to_json(fixedSheet, { header: 1 });
  data.fixedCosts = fixedData.slice(1, 8).map(row => ({
    service: row[0],
    cost: toNumber(row[1]),
    netCost: toNumber(row[2]),
    vat: toNumber(row[3])
  })).filter(row => row.service && row.service !== 'Totals');

  // Monthly fixed costs
  data.fixedCostsMonthly = fixedData.slice(1, 13).map(row => ({
    month: row[5],
    totalCost: toNumber(row[6])
  })).filter(row => row.month && row.month !== 'Totals');

  // Read VAT
  const vatSheet = workbook.Sheets['VAT'];
  const vatData = xlsx.utils.sheet_to_json(vatSheet, { header: 1 });
  data.vat = vatData.slice(1, 5).map(row => ({
    startDate: excelDateToJSDate(row[0]),
    endDate: excelDateToJSDate(row[1]),
    hmrcAmount: toNumber(row[2]),
    marstonsAmount: toNumber(row[3]),
    difference: toNumber(row[4])
  })).filter(row => row.startDate);

  // Read Sundries
  const sundriesSheet = workbook.Sheets['Sundries'];
  const sundriesData = xlsx.utils.sheet_to_json(sundriesSheet, { header: 1 });
  data.sundries = sundriesData.slice(1).map(row => ({
    date: excelDateToJSDate(row[0]),
    amount: toNumber(row[1]),
    vat: toNumber(row[2]),
    net: toNumber(row[3])
  })).filter(row => row.date && row.amount);

  return data;
}

// Migrate data to Firestore
async function migrateData() {
  console.log('Starting migration...');
  console.log(`User ID: ${USER_ID}`);
  console.log(`Year: ${YEAR}`);

  try {
    const data = readExcelData();
    const batch = db.batch();
    let operationCount = 0;
    const maxBatchSize = 500;

    // Helper to commit batch and reset
    async function commitBatchIfNeeded() {
      if (operationCount >= maxBatchSize) {
        await batch.commit();
        console.log(`Committed batch of ${operationCount} operations`);
        operationCount = 0;
      }
    }

    // Migrate Daily Figures
    console.log(`\nMigrating ${data.dailyFigures.length} daily figures...`);
    for (const figure of data.dailyFigures) {
      const docRef = db.doc(`users/${USER_ID}/years/${YEAR}/dailyFigures/${figure.date}`);
      batch.set(docRef, {
        ...figure,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      operationCount++;
      await commitBatchIfNeeded();
    }

    // Migrate Wages
    console.log(`\nMigrating ${data.wages.length} wage records...`);
    for (const wage of data.wages) {
      const month = wage.month;
      const docRef = db.doc(`users/${USER_ID}/years/${YEAR}/wages/${month}`);
      batch.set(docRef, {
        ...wage,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      operationCount++;
      await commitBatchIfNeeded();
    }

    // Migrate Fixed Costs
    console.log(`\nMigrating ${data.fixedCosts.length} fixed costs...`);
    for (const cost of data.fixedCosts) {
      const serviceId = cost.service.toLowerCase().replace(/\s+/g, '-');
      const docRef = db.doc(`users/${USER_ID}/years/${YEAR}/fixedCosts/${serviceId}`);
      batch.set(docRef, {
        ...cost,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      operationCount++;
      await commitBatchIfNeeded();
    }

    // Migrate Fixed Costs Monthly
    console.log(`\nMigrating ${data.fixedCostsMonthly.length} monthly fixed costs...`);
    for (const cost of data.fixedCostsMonthly) {
      const month = cost.month;
      const docRef = db.doc(`users/${USER_ID}/years/${YEAR}/fixedCostsMonthly/${month}`);
      batch.set(docRef, {
        ...cost,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      operationCount++;
      await commitBatchIfNeeded();
    }

    // Migrate VAT
    console.log(`\nMigrating ${data.vat.length} VAT records...`);
    for (let i = 0; i < data.vat.length; i++) {
      const vatRecord = data.vat[i];
      const quarterId = `q${i + 1}`;
      const docRef = db.doc(`users/${USER_ID}/years/${YEAR}/vat/${quarterId}`);
      batch.set(docRef, {
        ...vatRecord,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      operationCount++;
      await commitBatchIfNeeded();
    }

    // Migrate Sundries
    console.log(`\nMigrating ${data.sundries.length} sundries...`);
    for (let i = 0; i < data.sundries.length; i++) {
      const sundry = data.sundries[i];
      const sundryId = `${sundry.date}-${i}`;
      const docRef = db.doc(`users/${USER_ID}/years/${YEAR}/sundries/${sundryId}`);
      batch.set(docRef, {
        ...sundry,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      operationCount++;
      await commitBatchIfNeeded();
    }

    // Migrate Monthly Summaries
    console.log(`\nMigrating ${data.monthlySummary.length} monthly summaries...`);
    for (const summary of data.monthlySummary) {
      const month = summary.month;
      const docRef = db.doc(`users/${USER_ID}/years/${YEAR}/monthlySummaries/${month}`);
      batch.set(docRef, {
        ...summary,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      operationCount++;
      await commitBatchIfNeeded();
    }

    // Commit remaining operations
    if (operationCount > 0) {
      await batch.commit();
      console.log(`\nCommitted final batch of ${operationCount} operations`);
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\nSummary:');
    console.log(`  - Daily Figures: ${data.dailyFigures.length}`);
    console.log(`  - Wages: ${data.wages.length}`);
    console.log(`  - Fixed Costs: ${data.fixedCosts.length}`);
    console.log(`  - Fixed Costs Monthly: ${data.fixedCostsMonthly.length}`);
    console.log(`  - VAT Records: ${data.vat.length}`);
    console.log(`  - Sundries: ${data.sundries.length}`);
    console.log(`  - Monthly Summaries: ${data.monthlySummary.length}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run the migration
migrateData()
  .then(() => {
    console.log('\nMigration script finished.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nMigration script failed:', error);
    process.exit(1);
  });
