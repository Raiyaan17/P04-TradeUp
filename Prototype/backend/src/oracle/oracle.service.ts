import { Injectable, Logger, NotFoundException, BadRequestException, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OracleAgentService, TournamentDataPoint, TournamentNewsItem } from './oracle-agent.service';
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
  private tickCallback?: (tickData: TournamentDataPoint, news: TournamentNewsItem[], leaderboard: LeaderboardEntry[]) => void;

  constructor(
    private readonly prisma: PrismaService,
    private readonly agentService: OracleAgentService,
  ) {}

  onModuleDestroy() {
    this.stopTickEngine();
  }

  setTickCallback(cb: (tick: TournamentDataPoint, news: TournamentNewsItem[], leaderboard: LeaderboardEntry[]) => void) {
    this.tickCallback = cb;
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

  async startTournament(userId: number, startingCash: number) {
    const active = await this.getActiveTournament();
    if (active) throw new BadRequestException('A tournament is already active.');

    this.logger.log(`Generating new 1-hour tournament data...`);
    // In a real app, we check if there's a cached one < 24h old.
    // For now, always generate to ensure fresh AI data.
    const generatedData = await this.agentService.generateTournamentData();

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

    this.startTickEngine(tournament.id);

    return tournament;
  }

  async endTournament(userId: number, tournamentId: string) {
    const tournament = await this.prisma.tournament.findUnique({ where: { id: tournamentId } });
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
    const tournament = await this.prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament || tournament.status !== TournamentStatus.ACTIVE) {
      throw new NotFoundException('Tournament not found or not active');
    }

    const existing = await this.prisma.tournamentParticipant.findUnique({
      where: { tournamentId_userId: { tournamentId, userId } },
    });
    if (existing) return existing;

    return this.prisma.tournamentParticipant.create({
      data: {
        tournamentId,
        userId,
        currentBalance: tournament.startingCash,
      },
    });
  }

  async buyStock(userId: number, tournamentId: string, stockSymbol: string, quantity: number) {
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
        data: { currentBalance: Number(participant.currentBalance) - totalCost },
      });

      // Update portfolio
      const holding = await tx.tournamentPortfolio.findUnique({
        where: { participantId_stockSymbol: { participantId: participant.id, stockSymbol } },
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
          data: { participantId: participant.id, stockSymbol, quantity, avgPrice: currentPrice },
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

  async sellStock(userId: number, tournamentId: string, stockSymbol: string, quantity: number) {
    const participant = await this.prisma.tournamentParticipant.findUnique({
      where: { tournamentId_userId: { tournamentId, userId } },
    });
    if (!participant) throw new NotFoundException('Not in tournament');

    const holding = await this.prisma.tournamentPortfolio.findUnique({
      where: { participantId_stockSymbol: { participantId: participant.id, stockSymbol } },
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
        data: { currentBalance: Number(participant.currentBalance) + totalRevenue },
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
    return currentTick[symbol as keyof TournamentDataPoint] as number;
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

  private startTickEngine(tournamentId: string) {
    this.stopTickEngine();

    // Broadcast a new tick every 5 seconds
    this.tickInterval = setInterval(async () => {
      if (this.currentTickIndex >= this.trajectoryPoints.length) {
        this.stopTickEngine();
        await this.prisma.tournament.update({
          where: { id: tournamentId },
          data: { status: TournamentStatus.COMPLETED, endedAt: new Date() },
        });
        return;
      }

      const tick = this.trajectoryPoints[this.currentTickIndex];
      const tickNews = this.newsItems.filter(n => n.minute === tick.minute);

      // Recalculate everyone's score
      const participants = await this.prisma.tournamentParticipant.findMany({
        where: { tournamentId },
        include: { user: true },
      });

      for (const p of participants) {
        await this.recalculateScore(p.id);
      }

      // Build leaderboard
      const updatedParticipants = await this.prisma.tournamentParticipant.findMany({
        where: { tournamentId },
        include: { user: true },
        orderBy: { currentScore: 'desc' },
      });

      const leaderboard: LeaderboardEntry[] = updatedParticipants.map((p, index) => ({
        userId: p.userId,
        username: p.user.username,
        pnl: Number(p.currentScore),
        rank: index + 1,
      }));

      // Fire callback to alert the Gateway
      if (this.tickCallback) {
        this.tickCallback(tick, tickNews, leaderboard);
      }

      this.currentTickIndex++;
    }, 5000);
  }

  private stopTickEngine() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }
}
