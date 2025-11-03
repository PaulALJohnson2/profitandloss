export const formatCurrency = (value) => {
  if (value === null || value === undefined || isNaN(value)) return '-';
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

export const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

export const formatMonth = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric'
  });
};

export const getMonthName = (monthString) => {
  if (!monthString) return '-';

  // If it's in YYYY-MM format, parse it
  if (monthString.includes('-')) {
    const date = new Date(monthString + '-01');
    return date.toLocaleDateString('en-GB', { month: 'long' });
  }

  // Otherwise, it's already a month name
  const months = {
    'October': 'October',
    'November': 'November',
    'December': 'December',
    'January': 'January',
    'February': 'February',
    'March': 'March',
    'April': 'April',
    'May': 'May',
    'June': 'June',
    'July': 'July',
    'August': 'August',
    'September': 'September'
  };
  return months[monthString] || monthString;
};
