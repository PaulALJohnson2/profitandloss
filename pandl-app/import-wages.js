import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, Timestamp } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Firebase config - you'll need to add your config here
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Your user ID - replace with actual user ID
const USER_ID = 'YOUR_USER_ID'; // You'll need to provide this
const YEAR = '2024-25';

// Parse CSV data
function parseCsv(csvPath) {
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n');

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
      const grossPay = cleanNumber(parts[2]);
      const tax = cleanNumber(parts[4]);
      const employeeNICs = cleanNumber(parts[6]);
      const netPay = cleanNumber(parts[8]);
      const takeHomePay = cleanNumber(parts[9]);
      const employerNICs = cleanNumber(parts[10]);
      const employerPension = cleanNumber(parts[11]);
      const costToEmployer = cleanNumber(parts[12]);

      // Calculate HMRC total (Tax + Employee NICs + Employer NICs)
      const hmrc = tax + employeeNICs + employerNICs;

      wagesData.push({
        month: currentMonth,
        netOut: takeHomePay,
        invoices: 0, // Not in CSV, set to 0
        hmrc: hmrc,
        nest: employerPension,
        deductions: 0, // Not in CSV, set to 0
        total: costToEmployer,
        // Store additional info for reference
        grossPay: grossPay,
        tax: tax,
        employeeNICs: employeeNICs,
        employerNICs: employerNICs
      });

      console.log(`Parsed ${currentMonth}: Net Out=${takeHomePay}, HMRC=${hmrc}, Nest=${employerPension}, Total=${costToEmployer}`);
    }
  }

  return wagesData;
}

// Upload to Firebase
async function uploadWages(wagesData) {
  console.log('\nUploading to Firebase...');

  for (const wage of wagesData) {
    const docRef = doc(db, `users/${USER_ID}/years/${YEAR}/wages/${wage.month}`);

    const data = {
      month: wage.month,
      netOut: wage.netOut,
      invoices: wage.invoices,
      hmrc: wage.hmrc,
      nest: wage.nest,
      deductions: wage.deductions,
      total: wage.total,
      updatedAt: Timestamp.now()
    };

    await setDoc(docRef, data);
    console.log(`✓ Uploaded ${wage.month}`);
  }

  console.log('\n✅ All wages data uploaded successfully!');
}

// Main execution
async function main() {
  const csvPath = process.argv[2] || '/Users/pauljohnson/Downloads/PayrollSummary.csv';

  console.log('Parsing CSV file...');
  const wagesData = parseCsv(csvPath);

  console.log(`\nFound ${wagesData.length} months of wage data:`);
  wagesData.forEach(w => {
    console.log(`  ${w.month}: £${w.total.toFixed(2)} total`);
  });

  console.log('\n⚠️  WARNING: This will update Firebase with the above data.');
  console.log('Please review the data above before proceeding.');
  console.log('\nTo upload, set USER_ID in the script and run again.');

  if (USER_ID !== 'YOUR_USER_ID') {
    await uploadWages(wagesData);
  } else {
    console.log('\n❌ Please set USER_ID in import-wages.js first!');
  }
}

main().catch(console.error);
