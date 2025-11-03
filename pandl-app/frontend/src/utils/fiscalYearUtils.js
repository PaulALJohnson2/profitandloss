/**
 * Utility functions for fiscal year management
 * Fiscal year runs from October 1st to September 30th
 */

/**
 * Get the fiscal year string for a given date
 * @param {Date} date - The date to get the fiscal year for
 * @returns {string} - Fiscal year in format "YYYY-YY" (e.g., "2024-25")
 */
export const getFiscalYearForDate = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed (0 = January, 9 = October)

  if (month >= 9) { // October (9) or later
    return `${year}-${String(year + 1).slice(-2)}`;
  } else { // January to September
    return `${year - 1}-${String(year).slice(-2)}`;
  }
};

/**
 * Get the current fiscal year
 * @returns {string} - Current fiscal year in format "YYYY-YY"
 */
export const getCurrentFiscalYear = () => {
  return getFiscalYearForDate(new Date());
};

/**
 * Get the start and end dates for a fiscal year
 * @param {string} fiscalYear - Fiscal year string (e.g., "2024-25")
 * @returns {object} - Object with startDate and endDate as Date objects
 */
export const getFiscalYearDates = (fiscalYear) => {
  const [startYear] = fiscalYear.split('-');
  const startDate = new Date(`${startYear}-10-01`);
  const endDate = new Date(`${parseInt(startYear) + 1}-09-30`);

  return { startDate, endDate };
};

/**
 * Check if we're past the fiscal year end date (September 30th)
 * @param {string} fiscalYear - Fiscal year to check (e.g., "2024-25")
 * @returns {boolean} - True if current date is after the fiscal year end
 */
export const isPastFiscalYearEnd = (fiscalYear) => {
  const { endDate } = getFiscalYearDates(fiscalYear);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to midnight for date comparison

  return today > endDate;
};

/**
 * Check if a date falls within a fiscal year
 * @param {string|Date} date - The date to check (string in YYYY-MM-DD format or Date object)
 * @param {string} fiscalYear - Fiscal year to check against (e.g., "2024-25")
 * @returns {boolean} - True if the date is within the fiscal year
 */
export const isDateInFiscalYear = (date, fiscalYear) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const { startDate, endDate } = getFiscalYearDates(fiscalYear);

  return dateObj >= startDate && dateObj <= endDate;
};

/**
 * Get the next fiscal year string
 * @param {string} fiscalYear - Current fiscal year (e.g., "2024-25")
 * @returns {string} - Next fiscal year (e.g., "2025-26")
 */
export const getNextFiscalYear = (fiscalYear) => {
  const [startYear] = fiscalYear.split('-');
  const nextStartYear = parseInt(startYear) + 1;
  return `${nextStartYear}-${String(nextStartYear + 1).slice(-2)}`;
};

/**
 * Get an array of all months in a fiscal year
 * @param {string} fiscalYear - Fiscal year (e.g., "2024-25")
 * @returns {string[]} - Array of month strings in YYYY-MM format
 */
export const getFiscalYearMonths = (fiscalYear) => {
  const [startYear] = fiscalYear.split('-');
  const year1 = parseInt(startYear);
  const year2 = year1 + 1;

  return [
    `${year1}-10`, `${year1}-11`, `${year1}-12`,
    `${year2}-01`, `${year2}-02`, `${year2}-03`,
    `${year2}-04`, `${year2}-05`, `${year2}-06`,
    `${year2}-07`, `${year2}-08`, `${year2}-09`
  ];
};

/**
 * Format fiscal year for display
 * @param {string} fiscalYear - Fiscal year (e.g., "2024-25")
 * @returns {string} - Formatted display string (e.g., "2024-2025")
 */
export const formatFiscalYearDisplay = (fiscalYear) => {
  const [startYear, endYearShort] = fiscalYear.split('-');
  const endYear = `20${endYearShort}`;
  return `${startYear}-${endYear}`;
};
