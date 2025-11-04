import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  deleteDoc,
  updateDoc,
  writeBatch,
  Timestamp
} from 'firebase/firestore';
import { db } from './config';
import { getFiscalYearMonths } from '../utils/fiscalYearUtils';

// ============================================
// DAILY FIGURES
// ============================================

export async function saveOrUpdateDailyFigure(userId, year, date, data) {
  try {
    const docRef = doc(db, `users/${userId}/years/${year}/dailyFigures/${date}`);
    await setDoc(docRef, {
      ...data,
      date,
      updatedAt: Timestamp.now()
    }, { merge: true });
    return { success: true };
  } catch (error) {
    console.error('Error saving daily figure:', error);
    return { success: false, error: error.message };
  }
}

export async function getDailyFigureByDate(userId, year, date) {
  try {
    const docRef = doc(db, `users/${userId}/years/${year}/dailyFigures/${date}`);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
    }
    return { success: true, data: null };
  } catch (error) {
    console.error('Error getting daily figure:', error);
    return { success: false, error: error.message };
  }
}

export async function getAllDailyFigures(userId, year, startDate = null, endDate = null) {
  try {
    const collectionRef = collection(db, `users/${userId}/years/${year}/dailyFigures`);
    let q;

    if (startDate && endDate) {
      q = query(
        collectionRef,
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'asc')
      );
    } else {
      q = query(collectionRef, orderBy('date', 'asc'));
    }

    const querySnapshot = await getDocs(q);
    const figures = [];
    querySnapshot.forEach((doc) => {
      figures.push({ id: doc.id, ...doc.data() });
    });

    return { success: true, data: figures };
  } catch (error) {
    console.error('Error getting daily figures:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteDailyFigure(userId, year, date) {
  try {
    const docRef = doc(db, `users/${userId}/years/${year}/dailyFigures/${date}`);
    await deleteDoc(docRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting daily figure:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// WAGES
// ============================================

export async function saveOrUpdateWages(userId, year, month, data) {
  try {
    const docRef = doc(db, `users/${userId}/years/${year}/wages/${month}`);
    await setDoc(docRef, {
      ...data,
      month,
      updatedAt: Timestamp.now()
    }, { merge: true });
    return { success: true };
  } catch (error) {
    console.error('Error saving wages:', error);
    return { success: false, error: error.message };
  }
}

export async function getWagesByMonth(userId, year, month) {
  try {
    const docRef = doc(db, `users/${userId}/years/${year}/wages/${month}`);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
    } else {
      return { success: true, data: null };
    }
  } catch (error) {
    console.error('Error getting wages by month:', error);
    return { success: false, error: error.message };
  }
}

export async function getAllWages(userId, year) {
  try {
    const collectionRef = collection(db, `users/${userId}/years/${year}/wages`);
    const querySnapshot = await getDocs(collectionRef);
    const wages = [];
    querySnapshot.forEach((doc) => {
      wages.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, data: wages };
  } catch (error) {
    console.error('Error getting wages:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteWages(userId, year, month) {
  try {
    const docRef = doc(db, `users/${userId}/years/${year}/wages/${month}`);
    await deleteDoc(docRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting wages:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// FIXED COSTS
// ============================================

export async function saveOrUpdateFixedCost(userId, year, serviceId, data) {
  try {
    const docRef = doc(db, `users/${userId}/years/${year}/fixedCosts/${serviceId}`);
    await setDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now()
    }, { merge: true });
    return { success: true };
  } catch (error) {
    console.error('Error saving fixed cost:', error);
    return { success: false, error: error.message };
  }
}

export async function getAllFixedCosts(userId, year) {
  try {
    const collectionRef = collection(db, `users/${userId}/years/${year}/fixedCosts`);
    const querySnapshot = await getDocs(collectionRef);
    const costs = [];
    querySnapshot.forEach((doc) => {
      costs.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, data: costs };
  } catch (error) {
    console.error('Error getting fixed costs:', error);
    return { success: false, error: error.message };
  }
}

export async function getFixedCostById(userId, year, serviceId) {
  try {
    const docRef = doc(db, `users/${userId}/years/${year}/fixedCosts/${serviceId}`);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
    } else {
      return { success: false, error: 'Fixed cost not found' };
    }
  } catch (error) {
    console.error('Error getting fixed cost:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteFixedCost(userId, year, serviceId) {
  try {
    const docRef = doc(db, `users/${userId}/years/${year}/fixedCosts/${serviceId}`);
    await deleteDoc(docRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting fixed cost:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// FIXED COSTS MONTHLY
// ============================================

export async function saveOrUpdateFixedCostMonthly(userId, year, month, data) {
  try {
    const docRef = doc(db, `users/${userId}/years/${year}/fixedCostsMonthly/${month}`);
    await setDoc(docRef, {
      ...data,
      month,
      updatedAt: Timestamp.now()
    }, { merge: true });
    return { success: true };
  } catch (error) {
    console.error('Error saving monthly fixed cost:', error);
    return { success: false, error: error.message };
  }
}

export async function getAllFixedCostsMonthly(userId, year) {
  try {
    const collectionRef = collection(db, `users/${userId}/years/${year}/fixedCostsMonthly`);
    const querySnapshot = await getDocs(collectionRef);
    const costs = [];
    querySnapshot.forEach((doc) => {
      costs.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, data: costs };
  } catch (error) {
    console.error('Error getting monthly fixed costs:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// VAT
// ============================================

export async function saveOrUpdateVAT(userId, year, quarterId, data) {
  try {
    const docRef = doc(db, `users/${userId}/years/${year}/vat/${quarterId}`);
    await setDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now()
    }, { merge: true });
    return { success: true };
  } catch (error) {
    console.error('Error saving VAT:', error);
    return { success: false, error: error.message };
  }
}

export async function getAllVAT(userId, year) {
  try {
    const collectionRef = collection(db, `users/${userId}/years/${year}/vat`);
    const q = query(collectionRef, orderBy('startDate', 'asc'));
    const querySnapshot = await getDocs(q);
    const vatRecords = [];
    querySnapshot.forEach((doc) => {
      vatRecords.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, data: vatRecords };
  } catch (error) {
    console.error('Error getting VAT:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteVAT(userId, year, quarterId) {
  try {
    const docRef = doc(db, `users/${userId}/years/${year}/vat/${quarterId}`);
    await deleteDoc(docRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting VAT:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// SUNDRIES
// ============================================

export async function saveOrUpdateSundry(userId, year, sundryId, data) {
  try {
    const docRef = doc(db, `users/${userId}/years/${year}/sundries/${sundryId}`);
    await setDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now()
    }, { merge: true });
    return { success: true };
  } catch (error) {
    console.error('Error saving sundry:', error);
    return { success: false, error: error.message };
  }
}

export async function getAllSundries(userId, year) {
  try {
    const collectionRef = collection(db, `users/${userId}/years/${year}/sundries`);
    const q = query(collectionRef, orderBy('date', 'asc'));
    const querySnapshot = await getDocs(q);
    const sundries = [];
    querySnapshot.forEach((doc) => {
      sundries.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, data: sundries };
  } catch (error) {
    console.error('Error getting sundries:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteSundry(userId, year, sundryId) {
  try {
    const docRef = doc(db, `users/${userId}/years/${year}/sundries/${sundryId}`);
    await deleteDoc(docRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting sundry:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// MONTHLY SUMMARIES
// ============================================

export async function saveOrUpdateMonthlySummary(userId, year, month, data) {
  try {
    const docRef = doc(db, `users/${userId}/years/${year}/monthlySummaries/${month}`);
    // Use setDoc WITHOUT merge to completely replace the document
    // This ensures we don't accumulate partial/stale data
    await setDoc(docRef, {
      ...data,
      month,
      updatedAt: Timestamp.now()
    });
    return { success: true };
  } catch (error) {
    console.error('Error saving monthly summary:', error);
    return { success: false, error: error.message };
  }
}

export async function getAllMonthlySummaries(userId, year) {
  try {
    const collectionRef = collection(db, `users/${userId}/years/${year}/monthlySummaries`);
    const querySnapshot = await getDocs(collectionRef);
    const summaries = [];
    querySnapshot.forEach((doc) => {
      summaries.push({ id: doc.id, ...doc.data() });
    });

    // Deduplicate by month, keeping the most recently updated entry with most complete data
    const monthMap = new Map();
    summaries.forEach((summary) => {
      if (!summary.month) {
        // Skip summaries without a month field
        console.warn('Found summary without month field:', summary.id);
        return;
      }

      const existingSummary = monthMap.get(summary.month);

      // If no existing summary, add this one
      if (!existingSummary) {
        monthMap.set(summary.month, summary);
        return;
      }

      // Prefer the entry with more complete data (has non-zero wages, fixedCosts, or sundries)
      const currentScore = ((summary.wages && summary.wages !== 0) ? 1 : 0) +
                          ((summary.fixedCosts && summary.fixedCosts !== 0) ? 1 : 0) +
                          ((summary.sundries && summary.sundries !== 0) ? 1 : 0);
      const existingScore = ((existingSummary.wages && existingSummary.wages !== 0) ? 1 : 0) +
                           ((existingSummary.fixedCosts && existingSummary.fixedCosts !== 0) ? 1 : 0) +
                           ((existingSummary.sundries && existingSummary.sundries !== 0) ? 1 : 0);

      // If scores are equal, use updatedAt timestamp
      if (currentScore === existingScore) {
        const currentTime = summary.updatedAt ? summary.updatedAt.toMillis() : 0;
        const existingTime = existingSummary.updatedAt ? existingSummary.updatedAt.toMillis() : 0;
        if (currentTime > existingTime) {
          monthMap.set(summary.month, summary);
        }
      } else if (currentScore > existingScore) {
        // This summary has more complete data
        monthMap.set(summary.month, summary);
      }
    });

    // Convert map back to array and sort by month
    const uniqueSummaries = Array.from(monthMap.values());
    uniqueSummaries.sort((a, b) => {
      if (a.month < b.month) return -1;
      if (a.month > b.month) return 1;
      return 0;
    });

    return { success: true, data: uniqueSummaries };
  } catch (error) {
    console.error('Error getting monthly summaries:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteMonthlySummary(userId, year, month) {
  try {
    const docRef = doc(db, `users/${userId}/years/${year}/monthlySummaries/${month}`);
    await deleteDoc(docRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting monthly summary:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// CALCULATION HELPERS
// ============================================

// Count occurrences of a specific day of week in a month
function countDayOccurrencesInMonth(year, month, dayOfWeek) {
  // month format: "2024-10" (YYYY-MM)
  const [yearNum, monthNum] = month.split('-').map(Number);
  const firstDay = new Date(yearNum, monthNum - 1, 1);
  const lastDay = new Date(yearNum, monthNum, 0);

  let count = 0;
  for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
    if (d.getDay() === dayOfWeek) {
      count++;
    }
  }
  return count;
}

// Check if a specific day of month exists in a given month
function isDayInMonth(year, month, dayOfMonth) {
  // month format: "2024-10" (YYYY-MM)
  const [yearNum, monthNum] = month.split('-').map(Number);
  const lastDay = new Date(yearNum, monthNum, 0).getDate();
  return dayOfMonth <= lastDay;
}

// Check if a yearly date falls within a given month
function isYearlyDateInMonth(month, yearlyDate) {
  // month format: "2024-10" (YYYY-MM)
  // yearlyDate format: "MM-DD"
  const [monthStr] = month.split('-').slice(1); // Get month part
  const [yearlyMonth] = yearlyDate.split('-');

  // Remove leading zeros for comparison
  return parseInt(monthStr, 10) === parseInt(yearlyMonth, 10);
}

// Check if a fixed cost is active for a given month
function isFixedCostActiveInMonth(cost, month) {
  // If not cancelled, it's active
  if (!cost.cancelled || !cost.cancelledDate) {
    return true;
  }

  // month format: "2024-10" (YYYY-MM)
  // cancelledDate format: "2024-10-15" (YYYY-MM-DD)

  // Extract year-month from the cancellation date
  const cancelledYearMonth = cost.cancelledDate.substring(0, 7); // "2024-10"

  // If the cancellation was in a future month, the cost is still active this month
  if (month < cancelledYearMonth) {
    return true;
  }

  // If the cancellation was in a past month, the cost is no longer active
  if (month > cancelledYearMonth) {
    return false;
  }

  // If the cancellation was in this month, we need to check if any occurrences are before the cancellation date
  // For simplicity, we'll include the cost for the month it was cancelled
  // (You could make this more precise by checking specific days)
  return true;
}

// Calculate total fixed costs for a month including all frequency types
async function calculateMonthlyFixedCosts(userId, year, month) {
  try {
    // Get all fixed costs definitions
    const fixedCostsResult = await getAllFixedCosts(userId, year);
    if (!fixedCostsResult.success) {
      return 0;
    }

    const fixedCosts = fixedCostsResult.data;
    let totalCost = 0;

    for (const cost of fixedCosts) {
      // Skip if the cost was cancelled before this month
      if (!isFixedCostActiveInMonth(cost, month)) {
        continue;
      }

      const costAmount = cost.cost || 0;

      if (cost.frequency === 'weekly' && cost.dayOfWeek !== undefined) {
        // Weekly: Count how many times this day occurs in the month
        const occurrences = countDayOccurrencesInMonth(year, month, cost.dayOfWeek);
        totalCost += costAmount * occurrences;
      } else if (cost.frequency === 'monthly' && cost.dayOfMonth !== undefined) {
        // Monthly: Check if this day exists in the month (handles months with < 31 days)
        if (isDayInMonth(year, month, cost.dayOfMonth)) {
          totalCost += costAmount;
        }
      } else if (cost.frequency === 'yearly' && cost.yearlyDate) {
        // Yearly: Check if this date falls in the current month
        if (isYearlyDateInMonth(month, cost.yearlyDate)) {
          totalCost += costAmount;
        }
      } else {
        // Default/legacy: treat as monthly
        totalCost += costAmount;
      }
    }

    return totalCost;
  } catch (error) {
    console.error('Error calculating monthly fixed costs:', error);
    return 0;
  }
}

// Calculate monthly summary from daily figures
export async function calculateMonthlySummary(userId, year, month) {
  try {
    // Get all daily figures for the month
    const startDate = `${month}-01`;
    const endDate = `${month}-31`;

    const result = await getAllDailyFigures(userId, year, startDate, endDate);
    if (!result.success) return result;

    const dailyFigures = result.data;

    // Calculate totals
    const summary = dailyFigures.reduce((acc, day) => ({
      grossIncome: acc.grossIncome + (day.grossIncome || 0),
      netIncome: acc.netIncome + (day.netIncome || 0),
      vat: acc.vat + (day.vat || 0)
    }), { grossIncome: 0, netIncome: 0, vat: 0 });

    // Get wages for the month
    const wagesDoc = await getDoc(doc(db, `users/${userId}/years/${year}/wages/${month}`));
    const wages = wagesDoc.exists() ? (wagesDoc.data().total || 0) : 0;

    // Calculate fixed costs for the month (including weekly costs)
    const fixedCosts = await calculateMonthlyFixedCosts(userId, year, month);

    // Get sundries for the month
    const sundriesResult = await getAllSundries(userId, year);
    const sundries = sundriesResult.success
      ? sundriesResult.data
          .filter(s => s.date && s.date.startsWith(month))
          .reduce((sum, s) => sum + (s.amount || 0), 0)
      : 0;

    // Calculate profit (fixed costs now include Abbie's Pay if configured as weekly cost)
    const profit = summary.netIncome - wages - fixedCosts - sundries;

    // Save the monthly summary
    await saveOrUpdateMonthlySummary(userId, year, month, {
      ...summary,
      wages,
      fixedCosts,
      sundries,
      profit
    });

    return { success: true, data: { ...summary, wages, fixedCosts, sundries, profit } };
  } catch (error) {
    console.error('Error calculating monthly summary:', error);
    return { success: false, error: error.message };
  }
}

// Recalculate all monthly summaries for a year
export async function recalculateAllMonthlySummaries(userId, year) {
  try {
    const months = getFiscalYearMonths(year);

    for (const month of months) {
      await calculateMonthlySummary(userId, year, month);
    }

    return { success: true };
  } catch (error) {
    console.error('Error recalculating monthly summaries:', error);
    return { success: false, error: error.message };
  }
}

// Clean up and rebuild all monthly summaries (removes duplicates)
export async function cleanupAndRebuildMonthlySummaries(userId, year) {
  try {
    console.log(`Cleaning up monthly summaries for ${year}...`);

    // Delete all existing monthly summaries
    const collectionRef = collection(db, `users/${userId}/years/${year}/monthlySummaries`);
    const querySnapshot = await getDocs(collectionRef);

    const batch = writeBatch(db);
    let deleteCount = 0;

    querySnapshot.forEach((docSnapshot) => {
      batch.delete(docSnapshot.ref);
      deleteCount++;
    });

    await batch.commit();
    console.log(`Deleted ${deleteCount} monthly summary documents`);

    // Recalculate all monthly summaries
    console.log('Recalculating monthly summaries...');
    await recalculateAllMonthlySummaries(userId, year);

    console.log('Monthly summaries cleanup and rebuild complete');
    return { success: true, deletedCount: deleteCount };
  } catch (error) {
    console.error('Error cleaning up monthly summaries:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// FISCAL YEAR MANAGEMENT
// ============================================

/**
 * Check if a fiscal year exists for a user
 */
export async function checkYearExists(userId, year) {
  try {
    // Check if the year document or any collection exists
    const yearRef = doc(db, `users/${userId}/years/${year}`);
    const yearDoc = await getDoc(yearRef);

    // If year doc doesn't exist, check for any data in collections
    if (!yearDoc.exists()) {
      // Check daily figures collection
      const dailyFiguresRef = collection(db, `users/${userId}/years/${year}/dailyFigures`);
      const dailyFiguresSnapshot = await getDocs(query(dailyFiguresRef));

      return { success: true, exists: !dailyFiguresSnapshot.empty };
    }

    return { success: true, exists: true };
  } catch (error) {
    console.error('Error checking if year exists:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all available fiscal years for a user
 */
export async function getAllYears(userId) {
  try {
    const yearsSet = new Set();

    // Method 1: Get years that have year documents
    const yearsRef = collection(db, `users/${userId}/years`);
    const yearsSnapshot = await getDocs(yearsRef);
    yearsSnapshot.forEach((doc) => {
      yearsSet.add(doc.id);
    });

    // Method 2: Check for years with data in subcollections
    // Check common years that might exist without year documents
    const potentialYears = ['2024-25', '2025-26', '2023-24', '2026-27'];

    for (const year of potentialYears) {
      if (!yearsSet.has(year)) {
        // Check if this year has any daily figures
        const dailyFiguresRef = collection(db, `users/${userId}/years/${year}/dailyFigures`);
        const dailyFiguresSnapshot = await getDocs(query(dailyFiguresRef));

        if (!dailyFiguresSnapshot.empty) {
          yearsSet.add(year);
          // Create the year document for it so it shows up next time
          const yearRef = doc(db, `users/${userId}/years/${year}`);
          await setDoc(yearRef, {
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            year: year
          }, { merge: true });
        }
      }
    }

    const years = Array.from(yearsSet);

    // Sort years in ascending order (oldest first)
    years.sort((a, b) => {
      const [yearA] = a.split('-');
      const [yearB] = b.split('-');
      return parseInt(yearA) - parseInt(yearB);
    });

    return { success: true, data: years };
  } catch (error) {
    console.error('Error getting all years:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Initialize a new fiscal year with metadata and copy fixed costs from previous year
 */
export async function initializeNewFiscalYear(userId, year, copyFromYear = null) {
  try {
    console.log(`Creating new fiscal year ${year}...`);
    const batch = writeBatch(db);

    // Create the year document with metadata
    const yearRef = doc(db, `users/${userId}/years/${year}`);
    batch.set(yearRef, {
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      year: year
    });
    console.log(`Year document prepared for ${year}`);

    // If a previous year is provided, copy fixed costs
    if (copyFromYear) {
      console.log(`Attempting to copy fixed costs from ${copyFromYear} to ${year}...`);
      const previousFixedCostsRef = collection(db, `users/${userId}/years/${copyFromYear}/fixedCosts`);
      const previousFixedCostsSnapshot = await getDocs(previousFixedCostsRef);

      console.log(`Found ${previousFixedCostsSnapshot.size} fixed costs in ${copyFromYear}`);

      if (previousFixedCostsSnapshot.empty) {
        console.warn(`No fixed costs found in ${copyFromYear} to copy`);
      }

      // Copy each fixed cost to the new year
      let copiedCount = 0;
      previousFixedCostsSnapshot.forEach((docSnapshot) => {
        const fixedCostData = docSnapshot.data();
        const newFixedCostRef = doc(db, `users/${userId}/years/${year}/fixedCosts/${docSnapshot.id}`);

        batch.set(newFixedCostRef, {
          ...fixedCostData,
          updatedAt: Timestamp.now()
        });
        copiedCount++;
        console.log(`Copying fixed cost: ${docSnapshot.id}`);
      });

      console.log(`Prepared ${copiedCount} fixed costs for batch write`);
    } else {
      console.log('No previous year specified, skipping fixed costs copy');
    }

    console.log('Committing batch write...');
    await batch.commit();
    console.log(`Successfully created fiscal year ${year} with copied fixed costs`);

    return { success: true };
  } catch (error) {
    console.error('Error initializing new fiscal year:', error);
    return { success: false, error: error.message };
  }
}
