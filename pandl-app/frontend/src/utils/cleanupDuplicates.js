import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Clean up duplicate monthly summaries by keeping only the most complete entry for each month
 */
export async function cleanupDuplicateMonthlySummaries(userId, year) {
  try {
    console.log(`Cleaning up duplicate monthly summaries for user ${userId}, year ${year}`);

    const collectionRef = collection(db, `users/${userId}/years/${year}/monthlySummaries`);
    const querySnapshot = await getDocs(collectionRef);

    const summaries = [];
    querySnapshot.forEach((doc) => {
      summaries.push({ docId: doc.id, ...doc.data() });
    });

    console.log(`Found ${summaries.length} total monthly summary documents`);

    // Group by month
    const monthGroups = new Map();
    summaries.forEach((summary) => {
      if (!summary.month) {
        console.warn('Found summary without month field:', summary.docId);
        return;
      }

      if (!monthGroups.has(summary.month)) {
        monthGroups.set(summary.month, []);
      }
      monthGroups.get(summary.month).push(summary);
    });

    let totalDeleted = 0;

    // For each month, keep the best entry and delete duplicates
    for (const [month, entries] of monthGroups.entries()) {
      if (entries.length <= 1) {
        console.log(`Month ${month}: Only 1 entry, no duplicates`);
        continue;
      }

      console.log(`Month ${month}: Found ${entries.length} duplicates`);

      // Sort entries by completeness score and timestamp
      entries.sort((a, b) => {
        const scoreA = ((a.wages && a.wages !== 0) ? 1 : 0) +
                      ((a.fixedCosts && a.fixedCosts !== 0) ? 1 : 0) +
                      ((a.sundries && a.sundries !== 0) ? 1 : 0);
        const scoreB = ((b.wages && b.wages !== 0) ? 1 : 0) +
                      ((b.fixedCosts && b.fixedCosts !== 0) ? 1 : 0) +
                      ((b.sundries && b.sundries !== 0) ? 1 : 0);

        // Higher score first
        if (scoreB !== scoreA) return scoreB - scoreA;

        // If scores equal, prefer more recent
        const timeA = a.updatedAt ? a.updatedAt.toMillis() : 0;
        const timeB = b.updatedAt ? b.updatedAt.toMillis() : 0;
        return timeB - timeA;
      });

      // Keep the first (best) entry, delete the rest
      const toKeep = entries[0];
      const toDelete = entries.slice(1);

      console.log(`  Keeping: ${toKeep.docId} (wages: ${toKeep.wages}, fixedCosts: ${toKeep.fixedCosts})`);

      for (const entry of toDelete) {
        console.log(`  Deleting: ${entry.docId} (wages: ${entry.wages}, fixedCosts: ${entry.fixedCosts})`);
        const docRef = doc(db, `users/${userId}/years/${year}/monthlySummaries/${entry.docId}`);
        await deleteDoc(docRef);
        totalDeleted++;
      }
    }

    console.log(`Cleanup complete. Deleted ${totalDeleted} duplicate documents.`);
    return { success: true, deleted: totalDeleted };

  } catch (error) {
    console.error('Error cleaning up duplicates:', error);
    return { success: false, error: error.message };
  }
}
