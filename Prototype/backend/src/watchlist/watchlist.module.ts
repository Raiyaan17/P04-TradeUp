import { Module } from '@nestjs/common';
import { WatchlistService } from './watchlist.service';
import { WatchlistController } from './watchlist.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { StocksModule } from '../stocks/stocks.module';

@Module({
  imports: [PrismaModule, StocksModule],
  providers: [WatchlistService],
  controllers: [WatchlistController],
  exports: [WatchlistService],
})
export class WatchlistModule {}
