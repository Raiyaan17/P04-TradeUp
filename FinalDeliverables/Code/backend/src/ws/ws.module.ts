import { Module } from '@nestjs/common';
import { MarketGateway } from './market.gateway';
import { StocksModule } from '../stocks/stocks.module';
import { TournamentGateway } from './tournament.gateway';
import { OracleModule } from '../oracle/oracle.module';

@Module({
  imports: [StocksModule, OracleModule],
  providers: [MarketGateway, TournamentGateway],
})
export class WsModule {}
