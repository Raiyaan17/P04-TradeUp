import { Injectable, NotFoundException } from '@nestjs/common';
import { MarketScenario, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StocksService } from '../stocks/stocks.service';

@Injectable()
export class SimulationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stocksService: StocksService,
  ) {}

  async runSimulation(
    userId: number,
    ticker: string,
    scenario: MarketScenario,
  ) {
    const stock = await this.stocksService.getTick(ticker);
    if (!stock) {
      throw new NotFoundException(`Stock with ticker '${ticker}' not found.`);
    }

    const startingPrice = stock.price;
    const predictedPrices = this.generatePredictedPrices(
      startingPrice,
      scenario,
    );

    const simulation = await this.prisma.simulation.create({
      data: {
        userId,
        stockSymbol: ticker.toUpperCase(),
        scenarioType: scenario,
        predictedPrices: predictedPrices as unknown as Prisma.JsonArray,
      },
    });

    return simulation;
  }

  private generatePredictedPrices(
    startingPrice: number,
    scenario: MarketScenario,
  ): { date: string; price: number }[] {
    const prices: { date: string; price: number }[] = [];
    let currentPrice = startingPrice;
    const today = new Date();

    const days = 180; // 6 months

    let trend;
    switch (scenario) {
      case MarketScenario.BULL:
        trend = 1.15 / days; // ~15% increase over 6 months
        break;
      case MarketScenario.CRASH:
        trend = -0.2 / days; // ~20% decrease over 6 months
        break;
      case MarketScenario.STAGNANT:
      default:
        trend = 0;
        break;
    }

    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      // Apply trend and add some randomness
      const randomFactor = (Math.random() - 0.5) * 0.05; // -2.5% to +2.5% daily fluctuation
      currentPrice *= 1 + trend + randomFactor;
      
      // Ensure price doesn't go below zero
      if (currentPrice < 0) {
        currentPrice = 0;
      }

      prices.push({
        date: date.toISOString().split('T')[0],
        price: parseFloat(currentPrice.toFixed(2)),
      });
    }

    return prices;
  }
}
