import { Module } from '@nestjs/common';
import { OracleController } from './oracle.controller';
import { OracleService } from './oracle.service';
import { OracleAgentService } from './oracle-agent.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { StocksModule } from '../stocks/stocks.module';

@Module({
  imports: [PrismaModule, ConfigModule, StocksModule],
  controllers: [OracleController],
  providers: [OracleService, OracleAgentService],
  exports: [OracleService],
})
export class OracleModule {}
