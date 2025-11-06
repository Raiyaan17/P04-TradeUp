import { Controller, Get, Param, Query } from '@nestjs/common';
import { StocksService } from './stocks.service';

@Controller('stocks')
export class StocksController {
  constructor(private readonly stocks: StocksService) {}

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
    const options: any = {};
    if (start) options.start = parseInt(start, 10);
    if (end) options.end = parseInt(end, 10);
    if (limit) options.limit = parseInt(limit, 10);

    const data = await this.stocks.getKlines(symbol, timeframe, options);
    return { symbol, timeframe, data };
  }

  @Get(':symbol')
  async bySymbol(@Param('symbol') symbol: string) {
    return { symbol, tick: await this.stocks.getTick(symbol) };
  }
}
