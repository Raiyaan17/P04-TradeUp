import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  OracleAgentService,
  TournamentDataPoint,
  TournamentNewsItem,
} from './oracle-agent.service';
import { StocksService } from '../stocks/stocks.service';
import { TournamentStatus, TransactionType } from '@prisma/client';

export interface LeaderboardEntry {
  userId: number;
  username: string;
  pnl: number;
  rank: number;
}

@Injectable()
export class OracleService implements OnModuleDestroy {
  private readonly logger = new Logger(OracleService.name);

  // In-memory state for the active tournament
  private tickInterval: NodeJS.Timeout | null = null;
  private currentTickIndex = 0;
  private trajectoryPoints: TournamentDataPoint[] = [];
  private newsItems: TournamentNewsItem[] = [];

  // Ideally, use an EventEmitter or emit via a dedicated Gateway.
  // We'll expose getters for WebSockets to pull, or a callback mechanism.
  private tickCallback?: (
    tickData: TournamentDataPoint,
    news: TournamentNewsItem[],
    leaderboard: LeaderboardEntry[],
  ) => void;
  private endCallback?: (leaderboard: LeaderboardEntry[]) => void;

  constructor(
    private readonly prisma: PrismaService,
    private readonly agentService: OracleAgentService,
    private readonly stocksService: StocksService,
  ) {}

  onModuleDestroy() {
    this.stopTickEngine();
  }

  setTickCallback(
    cb: (
      tick: TournamentDataPoint,
      news: TournamentNewsItem[],
      leaderboard: LeaderboardEntry[],
    ) => void,
  ) {
    this.tickCallback = cb;
  }

  setEndCallback(cb: (leaderboard: LeaderboardEntry[]) => void) {
    this.endCallback = cb;
  }

  async getActiveTournament() {
    return this.prisma.tournament.findFirst({
      where: { status: TournamentStatus.ACTIVE },
      include: {
        participants: {
          include: { user: true, portfolio: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getActiveTournaments() {
    return this.prisma.tournament.findMany({
      where: { status: TournamentStatus.ACTIVE },
      include: {
        participants: {
          include: { user: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPortfolio(userId: number) {
    const active = await this.getActiveTournament();
    if (!active) return { balance: 0, holdings: [] };

    const participant = await this.prisma.tournamentParticipant.findUnique({
      where: { tournamentId_userId: { tournamentId: active.id, userId } },
      include: { portfolio: true },
    });

    if (!participant) return { balance: 0, holdings: [] };

    return {
      balance: Number(participant.currentBalance),
      holdings: participant.portfolio.map((h) => ({
        stockSymbol: h.stockSymbol,
        quantity: h.quantity,
        avgPrice: Number(h.avgPrice),
      })),
    };
  }

  async getParticipantAnalysis(userId: number, tournamentId: string) {
    const participant = await this.prisma.tournamentParticipant.findUnique({
      where: { tournamentId_userId: { tournamentId, userId } },
      include: { tournament: true },
    });

    if (!participant) throw new NotFoundException('Not in tournament');
    if (participant.tournament.status !== TournamentStatus.COMPLETED) {
      throw new BadRequestException('Tournament must be completed first.');
    }

    const leaderboardRaw = await this.prisma.tournamentParticipant.findMany({
      where: { tournamentId },
      orderBy: { currentScore: 'desc' },
    });

    const rank = leaderboardRaw.findIndex((p) => p.userId === userId) + 1;
    const totalPlayers = leaderboardRaw.length;

    const transactions = await this.prisma.tournamentTransaction.findMany({
      where: { participantId: participant.id },
    });

    let topStock = 'None';
    if (transactions.length > 0) {
      const counts: Record<string, number> = {};
      transactions.forEach(
        (t) => (counts[t.stockSymbol] = (counts[t.stockSymbol] || 0) + 1),
      );
      topStock = Object.keys(counts).reduce((a, b) =>
        counts[a] > counts[b] ? a : b,
      );
    }

    const stats = {
      startingCash: Number(participant.tournament.startingCash),
      pnl: Number(participant.currentScore),
      rank,
      totalPlayers,
      totalTrades: transactions.length,
      topStock,
    };

    const analysis = await this.agentService.generateTournamentAnalysis(stats);
    return { analysis, stats };
  }

  async getCurrentTickData(tournamentId: string) {
    if (
      !this.tickInterval ||
      this.currentTickIndex === 0 ||
      this.trajectoryPoints.length === 0
    ) {
      return null;
    }
    const idx = Math.min(
      this.currentTickIndex - 1,
      this.trajectoryPoints.length - 1,
    );
    const tick = this.trajectoryPoints[idx];
    const tickNews = this.newsItems.filter((n) => n.day === tick.day);

    const participants = await this.prisma.tournamentParticipant.findMany({
      where: { tournamentId },
      include: { user: true },
      orderBy: { currentScore: 'desc' },
    });
    const leaderboard = participants.map((p, index) => ({
      userId: p.userId,
      username: p.user.username,
      pnl: Number(p.currentScore),
      rank: index + 1,
    }));
    return { tick, news: tickNews, leaderboard };
  }

  async startTournament(
    userId: number,
    startingCash: number,
    speed: 'normal' | 'fast' = 'normal',
  ) {
    const active = await this.getActiveTournament();
    if (active)
      throw new BadRequestException('A tournament is already active.');

    this.logger.log(`Generating new 1-hour tournament data...`);

    // Fetch dynamic base prices from live API
    // PSX KSE-100 index lives in the IDX market under symbol 'KSE100', not REG
    const REGULAR_STOCKS = ['HBL', 'UBL', 'MCB', 'HUBC', 'FFC'];
    const basePrices: Record<string, number> = {};

    // Fetch KSE-100 index price from IDX market
    try {
      const psxTick = await this.stocksService.getTick('KSE100', 'IDX');
      if (psxTick && psxTick.price) {
        basePrices['PSX'] = psxTick.price;
        this.logger.log(`Live KSE-100 index price: ${psxTick.price}`);
      }
    } catch (e) {
      this.logger.warn(
        `Could not fetch live KSE-100 index price, using generator default.`,
      );
    }

    for (const symbol of REGULAR_STOCKS) {
      try {
        const tick = await this.stocksService.getTick(symbol);
        if (tick && tick.price) {
          basePrices[symbol] = tick.price;
        }
      } catch (e) {
        this.logger.warn(
          `Could not fetch live price for ${symbol}, using generator default.`,
        );
      }
    }

    const generatedData =
      await this.agentService.generateTournamentData(basePrices);

    const tournament = await this.prisma.tournament.create({
      data: {
        status: TournamentStatus.ACTIVE,
        startingCash,
        startedAt: new Date(),
        trajectoryJson: generatedData.trajectory as any,
        newsJson: generatedData.news as any,
      },
    });

    this.trajectoryPoints = generatedData.trajectory;
    this.newsItems = generatedData.news;
    this.currentTickIndex = 0;

    // Join the first player
    await this.joinTournament(userId, tournament.id);

    this.startTickEngine(tournament.id, speed);

    return tournament;
  }

  async endTournament(userId: number, tournamentId: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
    });
    if (!tournament || tournament.status !== TournamentStatus.ACTIVE) {
      throw new NotFoundException('Tournament not active');
    }

    this.logger.log(`Manual tournament end requested by user ${userId}`);

    const updated = await this.prisma.tournament.update({
      where: { id: tournamentId },
      data: { status: TournamentStatus.COMPLETED, endedAt: new Date() },
    });

    // We halt the global engine. In a multi-lobby system, we'd halt specific engine.
    this.stopTickEngine();

    return updated;
  }

  async joinTournament(userId: number, tournamentId: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
    });
    if (!tournament || tournament.status !== TournamentStatus.ACTIVE) {
      throw new NotFoundException('Tournament not found or not active');
    }

    const existing = await this.prisma.tournamentParticipant.findUnique({
      where: { tournamentId_userId: { tournamentId, userId } },
    });
    if (existing) return existing;

    const newParticipant = await this.prisma.tournamentParticipant.create({
      data: {
        tournamentId,
        userId,
        currentBalance: tournament.startingCash,
        currentScore: 0,
      },
    });

    // Optionally broadcast immediate leaderboard update to all clients
    // so players instantly see newly arrived competitors
    const currentData = await this.getCurrentTickData(tournamentId);
    if (currentData && this.tickCallback) {
      this.tickCallback(
        currentData.tick,
        currentData.news,
        currentData.leaderboard,
      );
    }

    return newParticipant;
  }

  async buyStock(
    userId: number,
    tournamentId: string,
    stockSymbol: string,
    quantity: number,
  ) {
    const participant = await this.prisma.tournamentParticipant.findUnique({
      where: { tournamentId_userId: { tournamentId, userId } },
      include: { portfolio: true },
    });
    if (!participant) throw new NotFoundException('Not in tournament');

    const currentPrice = this.getCurrentStockPrice(stockSymbol);
    const totalCost = currentPrice * quantity;

    if (Number(participant.currentBalance) < totalCost) {
      throw new BadRequestException('Insufficient tournament balance');
    }

    await this.prisma.$transaction(async (tx) => {
      // Deduct balance
      await tx.tournamentParticipant.update({
        where: { id: participant.id },
        data: {
          currentBalance: Number(participant.currentBalance) - totalCost,
        },
      });

      // Update portfolio
      const holding = await tx.tournamentPortfolio.findUnique({
        where: {
          participantId_stockSymbol: {
            participantId: participant.id,
            stockSymbol,
          },
        },
      });

      if (holding) {
        // Average up price calculation
        const oldTotal = Number(holding.avgPrice) * holding.quantity;
        const newTotal = oldTotal + totalCost;
        const newQuantity = holding.quantity + quantity;
        const newAvg = newTotal / newQuantity;

        await tx.tournamentPortfolio.update({
          where: { id: holding.id },
          data: { quantity: newQuantity, avgPrice: newAvg },
        });
      } else {
        await tx.tournamentPortfolio.create({
          data: {
            participantId: participant.id,
            stockSymbol,
            quantity,
            avgPrice: currentPrice,
          },
        });
      }

      // Log transaction
      await tx.tournamentTransaction.create({
        data: {
          participantId: participant.id,
          stockSymbol,
          type: TransactionType.BUY,
          quantity,
          price: currentPrice,
          total: totalCost,
        },
      });
    });

    return this.recalculateScore(participant.id);
  }

  async sellStock(
    userId: number,
    tournamentId: string,
    stockSymbol: string,
    quantity: number,
  ) {
    const participant = await this.prisma.tournamentParticipant.findUnique({
      where: { tournamentId_userId: { tournamentId, userId } },
    });
    if (!participant) throw new NotFoundException('Not in tournament');

    const holding = await this.prisma.tournamentPortfolio.findUnique({
      where: {
        participantId_stockSymbol: {
          participantId: participant.id,
          stockSymbol,
        },
      },
    });

    if (!holding || holding.quantity < quantity) {
      throw new BadRequestException('Insufficient stock quantity to sell');
    }

    const currentPrice = this.getCurrentStockPrice(stockSymbol);
    const totalRevenue = currentPrice * quantity;

    await this.prisma.$transaction(async (tx) => {
      // Add balance
      await tx.tournamentParticipant.update({
        where: { id: participant.id },
        data: {
          currentBalance: Number(participant.currentBalance) + totalRevenue,
        },
      });

      const newQuantity = holding.quantity - quantity;
      if (newQuantity === 0) {
        await tx.tournamentPortfolio.delete({ where: { id: holding.id } });
      } else {
        await tx.tournamentPortfolio.update({
          where: { id: holding.id },
          data: { quantity: newQuantity },
        });
      }

      await tx.tournamentTransaction.create({
        data: {
          participantId: participant.id,
          stockSymbol,
          type: TransactionType.SELL,
          quantity,
          price: currentPrice,
          total: totalRevenue,
        },
      });
    });

    return this.recalculateScore(participant.id);
  }

  private getCurrentStockPrice(symbol: string): number {
    const currentTick = this.trajectoryPoints[this.currentTickIndex];
    if (!currentTick) throw new BadRequestException('Tournament over');
    return currentTick[symbol as keyof TournamentDataPoint];
  }

  private async recalculateScore(participantId: number) {
    const participant = await this.prisma.tournamentParticipant.findUnique({
      where: { id: participantId },
      include: { portfolio: true, tournament: true },
    });
    if (!participant) return;

    let portfolioValue = 0;
    for (const holding of participant.portfolio) {
      const price = this.getCurrentStockPrice(holding.stockSymbol);
      portfolioValue += price * holding.quantity;
    }

    const totalAssets = Number(participant.currentBalance) + portfolioValue;
    const pnl = totalAssets - Number(participant.tournament.startingCash);

    await this.prisma.tournamentParticipant.update({
      where: { id: participant.id },
      data: { currentScore: pnl },
    });
  }

  private startTickEngine(
    tournamentId: string,
    speed: 'normal' | 'fast' = 'normal',
  ) {
    this.stopTickEngine();

    const intervalMs = speed === 'fast' ? 10000 : 120000;

    const tickFn = async () => {
      try {
        if (this.currentTickIndex >= this.trajectoryPoints.length) {
          this.stopTickEngine();
          await this.prisma.tournament.update({
            where: { id: tournamentId },
            data: { status: TournamentStatus.COMPLETED, endedAt: new Date() },
          });

          // Build final leaderboard
          const finalParticipants =
            await this.prisma.tournamentParticipant.findMany({
              where: { tournamentId },
              include: { user: true },
              orderBy: { currentScore: 'desc' },
            });
          const finalLeaderboard = finalParticipants.map((p, index) => ({
            userId: p.userId,
            username: p.user.username,
            pnl: Number(p.currentScore) || 0,
            rank: index + 1,
          }));

          // Calculate and apply ELO ranking
          const pointsMap = [100, 75, 50, 25, 25, 10, 10, 10, 10, 10];
          for (let i = 0; i < finalLeaderboard.length; i++) {
            const userId = finalLeaderboard[i].userId;
            const points = i < 10 ? pointsMap[i] : -5;

            try {
              await this.prisma.user.update({
                where: { id: userId },
                data: { tournamentScore: { increment: points } },
              });
            } catch (error) {
              console.error(`Failed to assign ELO to user ${userId}:`, error);
            }
          }

          if (this.endCallback) {
            this.endCallback(finalLeaderboard);
          }

          return;
        }

        const rawTick = this.trajectoryPoints[this.currentTickIndex];
        // Enforce uppercase keys just in case Gemini returned lowercase JSON
        const tick: any = {};
        if (rawTick) {
          Object.keys(rawTick).forEach((key) => {
            tick[key.toUpperCase()] = (rawTick as any)[key];
          });
          tick.day = rawTick.day;
        }
        // Save the cleaned tick back so getCurrentStockPrice finds uppercase keys safely
        this.trajectoryPoints[this.currentTickIndex] =
          tick as TournamentDataPoint;

        const tickNews = this.newsItems.filter((n) => n.day === tick.day);

        // Recalculate everyone's score
        const participants = await this.prisma.tournamentParticipant.findMany({
          where: { tournamentId },
          include: { user: true },
        });

        for (const p of participants) {
          await this.recalculateScore(p.id);
        }

        // Build leaderboard
        const updatedParticipants =
          await this.prisma.tournamentParticipant.findMany({
            where: { tournamentId },
            include: { user: true },
            orderBy: { currentScore: 'desc' },
          });

        const leaderboard: LeaderboardEntry[] = updatedParticipants.map(
          (p, index) => ({
            userId: p.userId,
            username: p.user.username,
            pnl: Number(p.currentScore) || 0,
            rank: index + 1,
          }),
        );

        // Fire callback to alert the Gateway
        if (this.tickCallback) {
          this.tickCallback(tick, tickNews, leaderboard);
        }

        this.currentTickIndex++;
      } catch (err) {
        this.logger.error(
          `Tick Engine Error at minute ${this.currentTickIndex}:`,
          err,
        );
        this.stopTickEngine();
      }
    };

    // Wait 2.5s to allow clients to establish WebSocket connection before first tick
    setTimeout(() => {
      // Check if we didn't stop it in the meantime
      if (this.currentTickIndex === 0) {
        tickFn();
        this.tickInterval = setInterval(tickFn, intervalMs);
      }
    }, 2500);
  }

  private stopTickEngine() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }
}
