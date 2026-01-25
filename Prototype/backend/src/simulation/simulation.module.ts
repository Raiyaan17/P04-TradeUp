import { Module } from '@nestjs/common';
import { SimulationService } from './simulation.service';
import { SimulationController } from './simulation.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { StocksModule } from '../stocks/stocks.module';

@Module({
  imports: [PrismaModule, StocksModule],
  controllers: [SimulationController],
  providers: [SimulationService],
})
export class SimulationModule {}
