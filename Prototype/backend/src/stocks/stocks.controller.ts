import { Controller, Get, Param, Query } from '@nestjs/common';
import { StocksService } from './stocks.service';

interface KlineOptions {
  start?: number;
  end?: number;
  limit?: number;
}

/** Typed candle object for API responses */
interface CandleResponse {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

@Controller('stocks')
export class StocksController {
  constructor(private readonly stocks: StocksService) { }

  @Get('featured')
  async featured() {
    return this.stocks.listFeaturedWithTicks();
  }

  @Get(':symbol/klines/:timeframe')
  async getKlines(
    @Param('symbol') symbol: string,
    @Param('timeframe') timeframe: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
    @Query('limit') limit?: string,
  ) {
    const options: KlineOptions = {};
    if (start) options.start = parseInt(start, 10);
    if (end) options.end = parseInt(end, 10);
    if (limit) options.limit = parseInt(limit, 10);

    const rawKlines = await this.stocks.getKlines(symbol, timeframe, options);

    // PSX API already returns objects, just validate and normalize
    const data: CandleResponse[] = [];

    for (const kline of rawKlines) {
      // Validate all required values are present and are numbers
      if (
        typeof kline?.timestamp !== 'number' ||
        typeof kline?.open !== 'number' ||
        typeof kline?.high !== 'number' ||
        typeof kline?.low !== 'number' ||
        typeof kline?.close !== 'number'
      ) {
        continue;
      }

      data.push({
        timestamp: kline.timestamp,
        open: kline.open,
        high: kline.high,
        low: kline.low,
        close: kline.close,
        volume: typeof kline.volume === 'number' ? kline.volume : 0,
      });
    }

    return { symbol, timeframe, data };
  }

  @Get(':symbol/company')
  async getCompanyProfile(@Param('symbol') symbol: string) {
    const data = await this.stocks.getCompanyProfile(symbol);
    return { symbol, data };
  }

  @Get(':symbol/fundamentals')
  async getFundamentals(@Param('symbol') symbol: string) {
    const data = await this.stocks.getFundamentals(symbol);
    return { symbol, data };
  }

  @Get(':symbol')
  async bySymbol(@Param('symbol') symbol: string) {
    const tick = await this.stocks.getTick(symbol);
    return { symbol, tick };
  }
}
