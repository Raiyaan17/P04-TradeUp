import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OracleAgentService } from './oracle-agent.service';
import { PresetType, SimulationScenario } from '@prisma/client';

interface TrajectoryPoint {
  day: number;
  priceModifier: number;
  cumulativePrice: number;
}

interface NewsItem {
  day: number;
  headline: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}

interface SimulationData {
  id: string;
  presetType: PresetType;
  stockSymbol: string;
  trajectory: TrajectoryPoint[];
  news: NewsItem[];
  basePrice: number;
  createdAt: Date;
  expiresAt: Date | null;
}

interface AnalysisResult {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  score: number;
}

const VALID_STOCK_SYMBOLS = ['HBL', 'UBL', 'MCB', 'HUBC', 'FFC'];
const PRO_MODE_EXPIRY_HOURS = 24;

@Injectable()
export class OracleService {
  private readonly logger = new Logger(OracleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly agentService: OracleAgentService,
  ) {}

  async getScenario(
    presetType: PresetType,
    stockSymbol: string,
  ): Promise<SimulationData> {
    if (!VALID_STOCK_SYMBOLS.includes(stockSymbol)) {
      throw new NotFoundException(
        `Stock symbol ${stockSymbol} is not available for simulation`,
      );
    }

    const cachedScenario = await this.findValidScenario(
      presetType,
      stockSymbol,
    );
    if (cachedScenario) {
      this.logger.log(
        `Returning cached scenario for ${stockSymbol} (${presetType})`,
      );
      return this.mapToSimulationData(cachedScenario);
    }

    this.logger.log(
      `Generating new scenario for ${stockSymbol} (${presetType})`,
    );
    return this.generateAndCacheScenario(presetType, stockSymbol);
  }

  async analyzePerformance(
    scenarioId: string,
    decisions: Array<{
      day: number;
      action: 'buy' | 'sell' | 'hold';
      quantity: number;
      price: number;
    }>,
    finalPortfolio: { cash: number; shares: number; currentPrice: number },
  ): Promise<AnalysisResult> {
    const scenario = await this.prisma.simulationScenario.findUnique({
      where: { id: scenarioId },
    });

    if (!scenario) {
      throw new NotFoundException(`Scenario with ID ${scenarioId} not found`);
    }

    const trajectory = scenario.trajectoryJson as unknown as TrajectoryPoint[];
    const news = scenario.newsJson as unknown as NewsItem[];

    return this.agentService.analyzePerformance(decisions, finalPortfolio, {
      trajectory,
      news,
      basePrice: scenario.basePrice,
    });
  }

  getAvailablePresets(): Array<{
    type: PresetType;
    name: string;
    description: string;
    isPro: boolean;
  }> {
    return [
      {
        type: PresetType.STEADY_CLIMB,
        name: 'The Steady Climb',
        description:
          'A gradual upward trend with 15-25% growth over 30 days. Perfect for beginners.',
        isPro: false,
      },
      {
        type: PresetType.FLASH_CRASH,
        name: 'The Flash Crash',
        description:
          'Experience a sudden 40-60% drop followed by recovery. Test your crisis management.',
        isPro: false,
      },
      {
        type: PresetType.IMF_ROLLERCOASTER,
        name: 'The IMF Rollercoaster',
        description:
          'High volatility with sharp ups and downs (-20% to +30%). For thrill-seekers.',
        isPro: false,
      },
      {
        type: PresetType.REALISTIC_OUTLOOK,
        name: 'The 30-Day Oracle',
        description:
          'AI-powered realistic scenario based on current market news and conditions.',
        isPro: true,
      },
    ];
  }

  getAvailableSymbols(): string[] {
    return VALID_STOCK_SYMBOLS;
  }

  private async findValidScenario(
    presetType: PresetType,
    stockSymbol: string,
  ): Promise<SimulationScenario | null> {
    const scenario = await this.prisma.simulationScenario.findFirst({
      where: {
        presetType,
        stockSymbol,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return scenario;
  }

  private async generateAndCacheScenario(
    presetType: PresetType,
    stockSymbol: string,
  ): Promise<SimulationData> {
    const basePrice = this.getStockBasePrice(stockSymbol);

    const newsContext =
      presetType === PresetType.REALISTIC_OUTLOOK
        ? this.fetchNewsContext(stockSymbol)
        : undefined;

    const generatedData = await this.agentService.generateScenario(
      presetType,
      stockSymbol,
      basePrice,
      newsContext,
    );

    const expiresAt =
      presetType === PresetType.REALISTIC_OUTLOOK
        ? new Date(Date.now() + PRO_MODE_EXPIRY_HOURS * 60 * 60 * 1000)
        : null;

    const savedScenario = await this.prisma.simulationScenario.create({
      data: {
        presetType,
        stockSymbol,
        trajectoryJson: generatedData.trajectory as unknown as never,
        newsJson: generatedData.news as unknown as never,
        basePrice,
        expiresAt,
      },
    });

    return this.mapToSimulationData(savedScenario);
  }

  private getStockBasePrice(stockSymbol: string): number {
    const stockPrices: Record<string, number> = {
      HBL: 125.5,
      UBL: 142.3,
      MCB: 178.9,
      HUBC: 89.75,
      FFC: 95.4,
    };

    return stockPrices[stockSymbol] || 100.0;
  }

  private fetchNewsContext(stockSymbol: string): string {
    return `Recent market news for ${stockSymbol}: Economic indicators show mixed signals with inflation concerns and foreign investment flows.`;
  }

  private mapToSimulationData(scenario: SimulationScenario): SimulationData {
    return {
      id: scenario.id,
      presetType: scenario.presetType,
      stockSymbol: scenario.stockSymbol,
      trajectory: scenario.trajectoryJson as unknown as TrajectoryPoint[],
      news: scenario.newsJson as unknown as NewsItem[],
      basePrice: scenario.basePrice,
      createdAt: scenario.createdAt,
      expiresAt: scenario.expiresAt,
    };
  }
}
