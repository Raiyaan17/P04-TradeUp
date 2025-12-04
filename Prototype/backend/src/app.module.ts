import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { StocksModule } from './stocks/stocks.module';
import { WatchlistModule } from './watchlist/watchlist.module';
import { WsModule } from './ws/ws.module';
import { NewsModule } from './news/news.module';
import { TradesModule } from './trades/trades.module';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        {
          limit: 10,
          ttl: 60,
        },
      ],
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    StocksModule,
    WatchlistModule,
    WsModule,
    NewsModule,
    TradesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
