import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { FEATURED_SYMBOLS, PSX_API_BASE } from '../common/constants';
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

  constructor(private readonly prisma: PrismaService) { }

  getFeaturedSymbols() {
    return FEATURED_SYMBOLS as readonly string[];
  }

  async getTick(symbol: string, type = 'REG'): Promise<TickData | null> {
    const url = `${this.base}/api/ticks/${type}/${encodeURIComponent(symbol)}`;
    try {
      const { data } = await axios.get<PsxApiResponse<TickData>>(url, {
        timeout: 5000,
      });
      if (data?.success) return data.data;
      return null;
    } catch (error) {
      console.error(
        `Failed to fetch tick for ${symbol}:`,
        (error as Error).message,
      );
      return null;
    }
  }

  async listFeaturedWithTicks() {
    const symbols = this.getFeaturedSymbols();
    const results = await Promise.all(
      symbols.map(async (s) => ({ symbol: s, tick: await this.getTick(s) })),
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
        timeout: 10000,
      });

      if (data?.success && Array.isArray(data.data)) {
        return data.data;
      }
      return [];
    } catch (error) {
      console.error('Failed to fetch klines:', error);

      return [];
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
        data: { symbol },
      });
    }

    return stock;
  }

  async getCompanyProfile(symbol: string): Promise<any> {
    const url = `${this.base}/api/companies/${encodeURIComponent(symbol)}`;
    try {
      const { data } = await axios.get<PsxApiResponse<any>>(url, {
        timeout: 5000,
      });
      if (data?.success) return data.data;
      return null;
    } catch (error) {
      console.error(
        `Failed to fetch company profile for ${symbol}:`,
        (error as Error).message,
      );
      return null;
    }
  }

  async getFundamentals(symbol: string): Promise<any> {
    const url = `${this.base}/api/fundamentals/${encodeURIComponent(symbol)}`;
    try {
      const { data } = await axios.get<PsxApiResponse<any>>(url, {
        timeout: 5000,
      });
      if (data?.success) return data.data;
      return null;
    } catch (error) {
      console.error(
        `Failed to fetch fundamentals for ${symbol}:`,
        (error as Error).message,
      );
      return null;
    }
  }
}
