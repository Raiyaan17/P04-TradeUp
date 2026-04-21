/**
 * Centralized formatting utilities for financial data.
 * Ensures consistent display of numbers, currencies, and percentages across the app.
 */

/**
 * Format a number as currency (PKR by default)
 */
export function formatCurrency(
  value: number | string | null | undefined,
  options: {
    currency?: string;
    locale?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    compact?: boolean;
  } = {}
): string {
  const {
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    compact = false,
  } = options;

  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (num === null || num === undefined || !isFinite(num)) {
    return '—';
  }

  try {
    const formattedNum = new Intl.NumberFormat('en-US', {
      minimumFractionDigits,
      maximumFractionDigits,
      notation: compact ? 'compact' : 'standard',
    }).format(num);
    return `Rs. ${formattedNum}`;
  } catch {
    return `Rs. ${num.toFixed(maximumFractionDigits)}`;
  }
}

/**
 * Format a number as currency (Now updated to return Rs. as requested)
 */
export function formatUSD(
  value: number | string | null | undefined,
  options: { compact?: boolean } = {}
): string {
  return formatCurrency(value, options);
}

/**
 * Format a number as a percentage with sign
 */
export function formatPercent(
  value: number | string | null | undefined,
  options: {
    precision?: number;
    showSign?: boolean;
  } = {}
): string {
  const { precision = 2, showSign = true } = options;
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (num === null || num === undefined || !isFinite(num)) {
    return '—';
  }

  const formatted = num.toFixed(precision);
  
  if (showSign && num > 0) {
    return `+${formatted}%`;
  }
  
  return `${formatted}%`;
}

/**
 * Format a number with sign (for price changes)
 */
export function formatSigned(
  value: number | string | null | undefined,
  options: {
    precision?: number;
  } = {}
): string {
  const { precision = 2 } = options;
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (num === null || num === undefined || !isFinite(num)) {
    return '—';
  }

  const formatted = num.toFixed(precision);
  
  if (num > 0) {
    return `+${formatted}`;
  }
  
  return formatted;
}

/**
 * Format a number with thousands separators
 */
export function formatNumber(
  value: number | string | null | undefined,
  options: {
    precision?: number;
    locale?: string;
  } = {}
): string {
  const { precision = 2, locale = 'en-US' } = options;
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (num === null || num === undefined || !isFinite(num)) {
    return '—';
  }

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(num);
}

/**
 * Format large numbers in compact notation (e.g., 1.2M, 3.4K)
 */
export function formatCompact(
  value: number | string | null | undefined,
  options: {
    locale?: string;
  } = {}
): string {
  const { locale = 'en-US' } = options;
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (num === null || num === undefined || !isFinite(num)) {
    return '—';
  }

  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    compactDisplay: 'short',
  }).format(num);
}

/**
 * Format volume (integer with thousands separators)
 */
export function formatVolume(
  value: number | string | null | undefined
): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (num === null || num === undefined || !isFinite(num)) {
    return '—';
  }

  return new Intl.NumberFormat('en-US').format(Math.round(num));
}

/**
 * Format a plain number to fixed decimal places
 */
export function formatDecimal(
  value: number | string | null | undefined,
  precision = 2
): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (num === null || num === undefined || !isFinite(num)) {
    return '—';
  }

  return num.toFixed(precision);
}

/**
 * Get CSS class for profit/loss coloring
 */
export function getPnLClass(value: number | string | null | undefined): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (num === null || num === undefined || !isFinite(num) || num === 0) {
    return 'text-muted-foreground';
  }
  
  return num > 0 ? 'text-emerald-400' : 'text-rose-400';
}

/**
 * Format relative time (e.g., "2m ago", "1h ago")
 */
export function formatTimeAgo(date: Date | string | number): string {
  const d = date instanceof Date ? date : new Date(date);
  const delta = Math.max(1, Math.round((Date.now() - d.getTime()) / 1000));
  
  if (delta < 60) return `${delta}s ago`;
  
  const minutes = Math.round(delta / 60);
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

/**
 * Format a date for display
 */
export function formatDate(
  date: Date | string | number,
  options: Intl.DateTimeFormatOptions = {}
): string {
  const d = date instanceof Date ? date : new Date(date);
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  };
  
  return d.toLocaleDateString('en-US', defaultOptions);
}

/**
 * Format a date with time
 */
export function formatDateTime(
  date: Date | string | number,
  options: Intl.DateTimeFormatOptions = {}
): string {
  const d = date instanceof Date ? date : new Date(date);
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  };
  
  return d.toLocaleString('en-US', defaultOptions);
}
