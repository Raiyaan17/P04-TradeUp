import { Module } from '@nestjs/common';
import { TradesController } from './trades.controller';
import { TradesService } from './trades.service';
import { PrismaModule } from '../prisma/prisma.module';
import { StocksModule } from '../stocks/stocks.module';

@Module({
  imports: [PrismaModule, StocksModule],
  controllers: [TradesController],
  providers: [TradesService],
})
export class TradesModule {}
