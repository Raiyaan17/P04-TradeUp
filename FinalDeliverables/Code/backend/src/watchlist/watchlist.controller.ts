import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { WatchlistService } from './watchlist.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { StocksService } from '../stocks/stocks.service';

interface AuthenticatedRequest {
  user: {
    userId: number;
    email: string;
    role: 'TRADER' | 'ADMIN';
  };
}

@Controller('watchlist')
@UseGuards(JwtAuthGuard)
export class WatchlistController {
  constructor(
    private readonly watchlist: WatchlistService,
    private readonly stocks: StocksService,
  ) {}

  @Get()
  async list(@Req() req: AuthenticatedRequest) {
    const items = await this.watchlist.list(req.user.userId);
    const withTicks = await Promise.all(
      items.map(async (i) => ({
        symbol: i.symbol,
        tick: await this.stocks.getTick(i.symbol),
      })),
    );
    return withTicks;
  }

  @Post()
  async add(
    @Req() req: AuthenticatedRequest,
    @Body() body: { symbol: string },
  ) {
    await this.watchlist.add(req.user.userId, body.symbol);
    return { ok: true };
  }

  @Delete(':symbol')
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param('symbol') symbol: string,
  ) {
    await this.watchlist.remove(req.user.userId, symbol);
    return { ok: true };
  }
}
