/**
 * Chart data utilities with robust parsing and type safety.
 * Handles both array and object formats for maximum compatibility.
 */

/** Standardized candle data structure */
export interface Candle {
  time: number; // Unix timestamp in seconds (for lightweight-charts)
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

/** Raw kline data as object (from backend API) */
export interface KlineObject {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

/** Raw kline data as array [timestamp, open, high, low, close, volume] */
export type KlineArray = [number, number, number, number, number, number?];

/** Union type for flexible parsing */
export type KlineData = KlineObject | KlineArray;

/**
 * Parse a single kline (candle) from either array or object format.
 * Returns null if data is invalid.
 */
export function parseKline(kline: unknown): Candle | null {
  // Handle null/undefined
  if (kline === null || kline === undefined) {
    return null;
  }

  // Handle array format: [timestamp, open, high, low, close, volume?]
  if (Array.isArray(kline)) {
    if (kline.length < 5) return null;

    const [timestamp, open, high, low, close, volume] = kline;

    // Validate required fields are numbers
    if (
      typeof timestamp !== 'number' ||
      typeof open !== 'number' ||
      typeof high !== 'number' ||
      typeof low !== 'number' ||
      typeof close !== 'number'
    ) {
      return null;
    }

    return {
      time: Math.floor(timestamp / 1000), // Convert ms to seconds
      open,
      high,
      low,
      close,
      volume: typeof volume === 'number' ? volume : undefined,
    };
  }

  // Handle object format: { timestamp, open, high, low, close, volume? }
  if (typeof kline === 'object') {
    const obj = kline as Record<string, unknown>;

    // Support both 'timestamp' and 'time' field names
    const timestamp = obj.timestamp ?? obj.time;
    const { open, high, low, close, volume } = obj;

    // Validate required fields
    if (
      typeof timestamp !== 'number' ||
      typeof open !== 'number' ||
      typeof high !== 'number' ||
      typeof low !== 'number' ||
      typeof close !== 'number'
    ) {
      return null;
    }

    // If timestamp is in milliseconds (> year 2001 in seconds), convert
    const timeInSeconds =
      timestamp > 1_000_000_000_000 ? Math.floor(timestamp / 1000) : timestamp;

    return {
      time: timeInSeconds,
      open,
      high,
      low,
      close,
      volume: typeof volume === 'number' ? volume : undefined,
    };
  }

  return null;
}

/**
 * Parse an array of klines with validation.
 * Filters out any invalid entries.
 */
export function parseKlines(klines: unknown[]): Candle[] {
  if (!Array.isArray(klines)) {
    console.warn('parseKlines: expected array, got', typeof klines);
    return [];
  }

  return klines
    .map(parseKline)
    .filter((candle): candle is Candle => candle !== null)
    .sort((a, b) => a.time - b.time); // Ensure sorted by time
}

/**
 * Validate that candle data is suitable for charting.
 */
export function validateCandles(candles: Candle[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (candles.length === 0) {
    errors.push('No candle data available');
    return { valid: false, errors };
  }

  // Check for duplicate timestamps
  const times = new Set<number>();
  for (const candle of candles) {
    if (times.has(candle.time)) {
      errors.push(`Duplicate timestamp: ${candle.time}`);
    }
    times.add(candle.time);
  }

  // Check for invalid OHLC values
  for (const candle of candles) {
    if (candle.high < candle.low) {
      errors.push(`Invalid candle at ${candle.time}: high < low`);
    }
    if (candle.high < candle.open || candle.high < candle.close) {
      errors.push(`Invalid candle at ${candle.time}: high not highest`);
    }
    if (candle.low > candle.open || candle.low > candle.close) {
      errors.push(`Invalid candle at ${candle.time}: low not lowest`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Deduplicate candles by timestamp, keeping the latest value.
 */
export function deduplicateCandles(candles: Candle[]): Candle[] {
  const map = new Map<number, Candle>();

  for (const candle of candles) {
    map.set(candle.time, candle);
  }

  return Array.from(map.values()).sort((a, b) => a.time - b.time);
}

/**
 * Calculate Simple Moving Average for a series of candles.
 * Efficiently computes the N-period SMA.
 */
export function calculateSMA(candles: Candle[], period: number): { time: number; value: number }[] {
  const result: { time: number; value: number }[] = [];

  if (candles.length < period) return result;

  let sum = 0;
  // Initialize the first window
  for (let i = 0; i < period; i++) {
    sum += candles[i].close;
  }

  // Push the first valid SMA
  result.push({ time: candles[period - 1].time, value: sum / period });

  // Slide the window
  for (let i = period; i < candles.length; i++) {
    sum = sum - candles[i - period].close + candles[i].close;
    result.push({ time: candles[i].time, value: sum / period });
  }

  return result;
}

/**
 * Calculate the latest SMA point given the historical array and the current live candle.
 * Extremely efficient O(N) where N=period, safe for high-frequency live ticks.
 */
export function calculateLatestSMA(historicalCandles: Candle[], currentCandle: Candle, period: number): number | null {
  // We need at least (period - 1) historical candles plus the current one
  if (historicalCandles.length < period - 1) return null;

  // Gather the closing prices contributing to this period
  const neededHistoricalCount = period - 1;
  let sum = 0;

  // Sum up the required trailing historical closes
  const startIdx = historicalCandles.length - neededHistoricalCount;
  for (let i = startIdx; i < historicalCandles.length; i++) {
    sum += historicalCandles[i].close;
  }

  // Add the live tick close
  sum += currentCandle.close;

  return sum / period;
}
