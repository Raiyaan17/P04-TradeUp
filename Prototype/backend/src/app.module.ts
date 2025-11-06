import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { StocksModule } from './stocks/stocks.module';
import { WatchlistModule } from './watchlist/watchlist.module';
import { WsModule } from './ws/ws.module';
import { TradesModule } from './trades/trades.module';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AuthModule,
    StocksModule,
    WatchlistModule,
    WsModule,
    TradesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
