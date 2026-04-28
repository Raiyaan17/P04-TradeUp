import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { PrismaModule } from '../prisma/prisma.module';
import { StocksModule } from '../stocks/stocks.module';
import { TradesModule } from '../trades/trades.module';
import { WatchlistModule } from '../watchlist/watchlist.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    StocksModule,
    TradesModule,
    WatchlistModule,
  ],
  controllers: [ChatbotController],
  providers: [ChatbotService],
  exports: [ChatbotService],
})
export class ChatbotModule {}
