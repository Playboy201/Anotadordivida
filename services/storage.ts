
import { AppData, Sale, Customer } from '../types';

const STORAGE_KEY = 'caderno_digital_data';

export const getInitialData = (): AppData => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading data', e);
    }
  }
  return {
    sales: [],
    customers: [],
    user: null,
  };
};

export const saveData = (data: AppData) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const formatCurrency = (amount: number) => {
  // Formata o número com separadores de milhar e adiciona "MT" no final
  const formattedNumber = new Intl.NumberFormat('pt-MZ', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);

  return `${formattedNumber} MT`;
};

export const formatDate = (timestamp: number) => {
  return new Intl.DateTimeFormat('pt-MZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(timestamp));
};

export const formatDateTime = (timestamp: number) => {
  return new Intl.DateTimeFormat('pt-MZ', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
};
