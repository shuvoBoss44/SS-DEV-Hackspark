import { format, parseISO } from 'date-fns';

export const formatCurrency = (value) => {
  return Number(value || 0).toLocaleString(undefined, { 
    style: 'currency', 
    currency: 'USD' 
  });
};

export const formatDate = (dateString, formatStr = 'yyyy-MM-dd') => {
  if (!dateString) return '';
  try {
    return format(parseISO(dateString), formatStr);
  } catch {
    return dateString;
  }
};

export const formatDateTime = (dateString) => {
  if (!dateString) return '';
  try {
    return format(parseISO(dateString), 'MMM d, yyyy h:mm a');
  } catch {
    return dateString;
  }
};

export const getToday = () => new Date().toISOString().slice(0, 10);

export const getThisMonth = () => getToday().slice(0, 7);

export const formatNumber = (num) => {
  return Number(num).toLocaleString();
};
