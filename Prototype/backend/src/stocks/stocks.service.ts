import { Injectable } from '@nestjs/common';
import axios from 'axios';
import {
  FEATURED_SYMBOLS,
  PSX_API_BASE,
  SYMBOL_NAME_MAP,
} from '../common/constants';
import { PrismaService } from '../prisma/prisma.service';

interface PsxApiResponse<T> {
  success: boolean;
  data: T;
}

export interface TickData {
  symbol: string;
  price: number;
  change?: number;
  percentChange?: number;
  volume?: number;
  [key: string]: unknown;
}

/** Kline data from PSX API - already in object format */
export interface Kline {
  symbol?: string;
  timeframe?: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

@Injectable()
export class StocksService {
  private readonly base = PSX_API_BASE;
  private readonly tickCache = new Map<string, TickData>();
  private readonly missingQueue = new Set<string>();
  private isProcessingQueue = false;
  private lastWorkerHeartbeat = 0;
  private insightsCache: unknown = null;
  private lastInsightsFetch = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private readonly prisma: PrismaService) {}

  updateTickCache(symbol: string, tick: Record<string, unknown>) {
    const rawPct = (tick['changePercent'] ??
      tick['pch'] ??
      tick['pct'] ??
      tick['percentChange'] ??
      0) as number;
    const percentChange = Number(rawPct) * 100;

    const normalized: TickData = {
      ...tick,
      symbol,
      price: Number(tick['price'] || tick['last'] || 0),
      change: Number(tick['change'] ?? tick['chg'] ?? 0),
      percentChange,
      volume: Number(tick['volume'] ?? tick['vol'] ?? 0),
      value: Number(tick['value'] ?? tick['turnover'] ?? 0),
    };

    this.tickCache.set(symbol, normalized);
  }

  getFeaturedSymbols() {
    return FEATURED_SYMBOLS as readonly string[];
  }

  async getTick(
    symbol: string,
    type = 'REG',
    forceFetch = false,
  ): Promise<TickData | null> {
    // Primary Defense: Resolve from WebSocket Cache instantly if available
    if (!forceFetch && this.tickCache.has(symbol)) {
      return this.tickCache.get(symbol) || null;
    }

    // Fallback: Safe REST retrieval (cold starts, rare un-featured symbols)
    const url = `${this.base}/api/ticks/${type}/${encodeURIComponent(symbol)}`;
    try {
      const { data } = await axios.get<PsxApiResponse<TickData>>(url, {
        timeout: 2000, // Reduced to fail fast if API is dead
      });
      if (data?.success) {
        this.updateTickCache(symbol, data.data);
        return this.tickCache.get(symbol) || null;
      }
      return null;
    } catch (error) {
      console.warn(
        `[API DOWN] Failed to fetch tick for ${symbol}, using mock fallback...`,
      );
      // Mock Data Generator Fallback
      const basePrice = 100 + symbol.charCodeAt(0) * 2;
      const changePct = Math.random() * 4 - 2;
      const change = basePrice * (changePct / 100);
      const price = basePrice + change;

      const mockTick: TickData = {
        symbol,
        price: Number(price.toFixed(2)),
        change: Number(change.toFixed(2)),
        percentChange: Number(changePct.toFixed(2)),
        volume: Math.floor(Math.random() * 1000000),
        value: Math.floor(Math.random() * 50000000),
      };

      this.tickCache.set(symbol, mockTick);
      return mockTick;
    }
  }

  private async processMissingQueue() {
    const now = Date.now();
    // Safety check: if worker is stuck for > 5 minutes, force reset
    if (this.isProcessingQueue) {
      if (now - this.lastWorkerHeartbeat > 5 * 60 * 1000) {
        console.warn('Drip-feed worker seems stuck. Force resetting flag...');
        this.isProcessingQueue = false;
      } else {
        return;
      }
    }

    this.isProcessingQueue = true;
    this.lastWorkerHeartbeat = now;
    console.log(
      `Drip-feed worker starting. Queue size: ${this.missingQueue.size}`,
    );

    try {
      while (this.missingQueue.size > 0) {
        this.lastWorkerHeartbeat = Date.now();
        const symbol = this.missingQueue.values().next().value;
        if (!symbol) break;

        // Respect 100 req/min limit by sleeping for 1000ms between calls
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // 1. Drip-feed Price Data (Tick)
        if (!this.tickCache.has(symbol)) {
          console.log(`Drip-feeding: Fetching ${symbol}...`);
          await this.getTick(symbol);
        }

        // 2. Sync Metadata (Company Name from manual map)
        try {
          const manualName = SYMBOL_NAME_MAP[symbol];
          if (manualName) {
            const dbStock = await this.prisma.stock.findUnique({
              where: { symbol },
            });
            if (dbStock && dbStock.name !== manualName) {
              console.log(
                `Drip-feeding: Syncing manual name for ${symbol} -> ${manualName}`,
              );
              await this.prisma.stock.update({
                where: { symbol },
                data: { name: manualName },
              });
            }
          }
        } catch (dbError) {
          console.error(
            `Failed to sync manual name for ${symbol}:`,
            (dbError as Error).message,
          );
        }

        this.missingQueue.delete(symbol);
      }
      console.log('Drip-feed worker finished processing queue.');
    } catch (error) {
      console.error('Drip-feed worker crashed:', error);
    } finally {
      this.isProcessingQueue = false;
    }
  }

  async listFeaturedWithTicks() {
    const symbols = this.getFeaturedSymbols();

    const results = await Promise.all(
      symbols.map(async (s) => {
        const dbStock = await this.findOrCreateStock(s);

        const tick = this.tickCache.get(s);
        if (!tick) {
          // Cold Start / Missing Data: Queue it to be safely fetched
          this.missingQueue.add(s);
          // Trigger the background processor asynchronously
          this.processMissingQueue().catch(console.error);
        }

        return {
          symbol: s,
          name: dbStock.name || s,
          tick: tick || null,
        };
      }),
    );

    return results;
  }

  async getKlines(
    symbol: string,
    timeframe: string = '1m',
    options?: { start?: number; end?: number; limit?: number },
  ): Promise<Kline[]> {
    const url = `${this.base}/api/klines/${encodeURIComponent(symbol)}/${timeframe}`;
    const params: { start?: number; end?: number; limit?: number } = {};

    if (options?.start) params.start = options.start;
    if (options?.end) params.end = options.end;
    if (options?.limit) params.limit = options.limit;

    try {
      const { data } = await axios.get<PsxApiResponse<Kline[]>>(url, {
        params,
        timeout: 2000,
      });

      if (data?.success && Array.isArray(data.data)) {
        return data.data;
      }
      return [];
    } catch (error) {
      console.warn(
        `[API DOWN] Failed to fetch klines for ${symbol}, using mock fallback...`,
      );
      // Mock Data Fallback
      const limit = options?.limit || 100;
      const now = Math.floor(Date.now() / 1000);
      const klines: Kline[] = [];
      const basePrice = 100 + symbol.charCodeAt(0) * 2;

      for (let i = limit; i > 0; i--) {
        const timeOffset =
          i * (timeframe === '1m' ? 60 : timeframe === '1d' ? 86400 : 3600);
        klines.push({
          symbol,
          timeframe,
          timestamp: now - timeOffset,
          open: basePrice - 1,
          high: basePrice + 2,
          low: basePrice - 2,
          close: basePrice + (Math.random() * 2 - 1),
          volume: Math.floor(Math.random() * 10000),
        });
      }
      return klines;
    }
  }

  async getPreviousDayClose(symbol: string): Promise<number | null> {
    const klines = await this.getKlines(symbol, '1d', { limit: 2 });

    if (!klines || klines.length === 0) {
      return null;
    }

    const lastKline = klines[klines.length - 1];
    if (!lastKline) return null;

    const lastKlineTime = new Date(lastKline.timestamp * 1000);

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    if (lastKlineTime.getTime() >= today.getTime()) {
      if (klines.length > 1) {
        const yesterdayKline = klines[klines.length - 2];
        if (!yesterdayKline) return null;
        return yesterdayKline.close;
      } else {
        return null;
      }
    } else {
      return lastKline.close;
    }
  }

  async findOrCreateStock(symbol: string) {
    let stock = await this.prisma.stock.findUnique({
      where: { symbol },
    });

    if (!stock) {
      stock = await this.prisma.stock.create({
        data: {
          symbol,
          name:
            // @ts-ignore
            SYMBOL_NAME_MAP[symbol as unknown as Record<string, unknown>] ||
            null,
        },
      });
    }

    // Notice: Aggressive runtime name fetching has been disabled
    // to protect upstream REST rate limits. Names should be seeded safely in the background.

    return stock;
  }

  async getCompanyProfile(symbol: string): Promise<unknown> {
    const url = `${this.base}/api/companies/${encodeURIComponent(symbol)}`;
    try {
      const { data } = await axios.get<PsxApiResponse<unknown>>(url, {
        timeout: 2000,
      });
      if (data?.success) return data.data;
      return null;
    } catch (error) {
      return {
        sector: 'Mocked Sector',
        marketCap: '100M',
        website: 'https://mock.com',
      };
    }
  }

  async getFundamentals(symbol: string): Promise<unknown> {
    const url = `${this.base}/api/fundamentals/${encodeURIComponent(symbol)}`;
    try {
      const { data } = await axios.get<PsxApiResponse<unknown>>(url, {
        timeout: 2000,
      });
      if (data?.success) return data.data;
      return null;
    } catch (error) {
      return { peRatio: 12.5, eps: 4.2, dividendYield: 5.0 };
    }
  }

  async getMarketInsights(): Promise<unknown> {
    const now = Date.now();
    if (this.insightsCache && now - this.lastInsightsFetch < this.CACHE_TTL) {
      return this.insightsCache;
    }

    const featuredSymbols = this.getFeaturedSymbols() as string[];
    const allTracked = await Promise.all(
      featuredSymbols.map(async (s) => {
        const tick = this.tickCache.get(s);
        if (!tick || tick.price === undefined) return null;

        // We need the name for the UI
        const dbStock = await this.findOrCreateStock(s);
        return {
          symbol: s,
          name: dbStock.name || s,
          tick,
        };
      }),
    );

    const validStocks = allTracked.filter(
      (s): s is NonNullable<typeof s> => s !== null,
    );

    // 1. Gainers: Highest percentChange
    const gainers = [...validStocks]
      .sort((a, b) => {
        const valA = Number(a.tick.percentChange) || 0;
        const valB = Number(b.tick.percentChange) || 0;
        return valB - valA;
      })
      .slice(0, 10);

    // 2. Losers: Lowest percentChange (most negative)
    const losers = [...validStocks]
      .sort((a, b) => {
        const valA = Number(a.tick.percentChange) || 0;
        const valB = Number(b.tick.percentChange) || 0;
        return valA - valB;
      })
      .slice(0, 10);

    // 3. Hot: Highest Turnover (Value)
    const hot = [...validStocks]
      .sort((a, b) => {
        const valA = Number(a.tick.value) || 0;
        const valB = Number(b.tick.value) || 0;
        return valB - valA;
      })
      .slice(0, 10);

    const insights = {
      gainers,
      losers,
      hot,
      timestamp: now,
    };

    this.insightsCache = insights;
    this.lastInsightsFetch = now;
    return insights;
  }
}
