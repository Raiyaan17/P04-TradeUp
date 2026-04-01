import { Test, TestingModule } from '@nestjs/testing';
import { TradesService } from '../src/trades/trades.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { StocksService } from '../src/stocks/stocks.service';
import { FriendsService } from '../src/friends/friends.service';
import { Decimal } from '@prisma/client/runtime/library';

// run with:
// npx jest --config test/jest-e2e.json --testRegex="portfolio-visualizer\\.spec\\.ts$"

/**
 * Feature B: Portfolio Visualizer — API Contract Tests
 *
 * The frontend visualizer (AllocationChart, PnlBarChart, CostValueChart)
 * depends on specific fields from the getPortfolio() response.
 * These tests verify:
 *   1. Response shape includes all required fields
 *   2. Allocation data (balance, totalAccountValue, portfolio[].currentValue)
 *   3. P&L data (portfolio[].unrealizedPnl, portfolio[].pnlPercentage)
 *   4. Cost vs Value data (portfolio[].invested, portfolio[].currentValue)
 *   5. Edge cases (empty portfolio, single stock)
 */

// ── Helpers ─────────────────────────────────────────────────────────────

function makeUser(balance: number) {
  return {
    id: 1,
    email: 'test@test.com',
    passwordHash: 'hash',
    role: 'TRADER' as const,
    createdAt: new Date(),
    name: 'Test',
    profileImageUrl: null,
    balance: new Decimal(balance),
    gender: null,
    username: 'testuser',
  };
}

function makePortfolioItem(
  symbol: string,
  quantity: number,
  avgPrice: number,
  stockId: number,
) {
  return {
    id: stockId,
    userId: 1,
    stockId,
    quantity,
    avgPrice: new Decimal(avgPrice),
    createdAt: new Date(),
    stock: { id: stockId, symbol, name: `${symbol} Inc`, marketType: 'REG', createdAt: new Date() },
  };
}

// ── Test Suite ──────────────────────────────────────────────────────────

describe('Feature B: Portfolio Visualizer — API Contract', () => {
  let service: TradesService;
  let prisma: { user: { findUnique: jest.Mock }; portfolio: { findMany: jest.Mock } };
  let stocks: { getTick: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn() },
      portfolio: { findMany: jest.fn() },
    };
    stocks = { getTick: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TradesService,
        { provide: PrismaService, useValue: prisma },
        { provide: StocksService, useValue: stocks },
        { provide: FriendsService, useValue: {} },
      ],
    }).compile();

    service = module.get<TradesService>(TradesService);
  });

  // ── Response Shape ──────────────────────────────────────────────────

  describe('Response Shape for Visualizer', () => {
    it('should include all fields required by AllocationChart', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser(5000));
      prisma.portfolio.findMany.mockResolvedValue([
        makePortfolioItem('AAPL', 10, 100, 1),
      ]);
      stocks.getTick.mockResolvedValue({ price: 110 });

      const result = await service.getPortfolio(1);

      // AllocationChart needs: balance, totalAccountValue, portfolio[].currentValue
      expect(result).toHaveProperty('balance');
      expect(result).toHaveProperty('totalAccountValue');
      expect(result.portfolio.length).toBeGreaterThan(0);
      expect(result.portfolio[0]).toHaveProperty('currentValue');
      expect(result.portfolio[0]).toHaveProperty('symbol');
    });

    it('should include all fields required by PnlBarChart', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser(5000));
      prisma.portfolio.findMany.mockResolvedValue([
        makePortfolioItem('GOOG', 5, 200, 1),
      ]);
      stocks.getTick.mockResolvedValue({ price: 180 });

      const result = await service.getPortfolio(1);

      // PnlBarChart needs: portfolio[].symbol, .unrealizedPnl, .pnlPercentage
      expect(result.portfolio[0]).toHaveProperty('unrealizedPnl');
      expect(result.portfolio[0]).toHaveProperty('pnlPercentage');
      expect(result.portfolio[0]).toHaveProperty('symbol');
    });

    it('should include all fields required by CostValueChart', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser(5000));
      prisma.portfolio.findMany.mockResolvedValue([
        makePortfolioItem('MSFT', 3, 300, 1),
      ]);
      stocks.getTick.mockResolvedValue({ price: 350 });

      const result = await service.getPortfolio(1);

      // CostValueChart needs: portfolio[].symbol, .invested, .currentValue
      expect(result.portfolio[0]).toHaveProperty('invested');
      expect(result.portfolio[0]).toHaveProperty('currentValue');
      expect(result.portfolio[0]).toHaveProperty('symbol');
    });
  });

  // ── Allocation Data Accuracy ────────────────────────────────────────

  describe('Allocation Data', () => {
    it('should correctly compute currentValue for each position', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser(1000));
      prisma.portfolio.findMany.mockResolvedValue([
        makePortfolioItem('AAPL', 10, 100, 1), // bought at 100
        makePortfolioItem('TSLA', 5, 200, 2),  // bought at 200
      ]);
      // AAPL now at 120, TSLA now at 180
      stocks.getTick
        .mockResolvedValueOnce({ price: 120 })
        .mockResolvedValueOnce({ price: 180 });

      const result = await service.getPortfolio(1);

      const aapl = result.portfolio.find((p: { symbol: string }) => p.symbol === 'AAPL');
      const tsla = result.portfolio.find((p: { symbol: string }) => p.symbol === 'TSLA');

      // AAPL: 10 * 120 = 1200
      expect(aapl.currentValue.toNumber()).toBeCloseTo(1200, 2);
      // TSLA: 5 * 180 = 900
      expect(tsla.currentValue.toNumber()).toBeCloseTo(900, 2);
    });

    it('should report totalAccountValue as balance + portfolio value', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser(500));
      prisma.portfolio.findMany.mockResolvedValue([
        makePortfolioItem('NVDA', 10, 50, 1),
      ]);
      stocks.getTick.mockResolvedValue({ price: 60 }); // 10 * 60 = 600

      const result = await service.getPortfolio(1);

      // totalAccountValue = 500 (cash) + 600 (portfolio) = 1100
      expect(result.totalAccountValue.toNumber()).toBeCloseTo(1100, 2);
      expect(result.balance.toNumber()).toBeCloseTo(500, 2);
    });
  });

  // ── P&L Data Accuracy ──────────────────────────────────────────────

  describe('P&L Data', () => {
    it('should compute positive unrealizedPnl when price increases', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser(5000));
      prisma.portfolio.findMany.mockResolvedValue([
        makePortfolioItem('AAPL', 10, 100, 1),
      ]);
      stocks.getTick.mockResolvedValue({ price: 120 }); // +20%

      const result = await service.getPortfolio(1);
      const item = result.portfolio[0];

      // PnL = (120 - 100) * 10 = 200
      expect(item.unrealizedPnl.toNumber()).toBeCloseTo(200, 2);
      // PnL% = 200 / 1000 * 100 = 20%
      expect(item.pnlPercentage.toNumber()).toBeCloseTo(20, 0);
    });

    it('should compute negative unrealizedPnl when price decreases', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser(5000));
      prisma.portfolio.findMany.mockResolvedValue([
        makePortfolioItem('META', 10, 100, 1),
      ]);
      stocks.getTick.mockResolvedValue({ price: 75 }); // -25%

      const result = await service.getPortfolio(1);
      const item = result.portfolio[0];

      // PnL = (75 - 100) * 10 = -250
      expect(item.unrealizedPnl.toNumber()).toBeCloseTo(-250, 2);
      // PnL% = -250 / 1000 * 100 = -25%
      expect(item.pnlPercentage.toNumber()).toBeCloseTo(-25, 0);
    });

    it('should compute zero P&L when price is unchanged', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser(5000));
      prisma.portfolio.findMany.mockResolvedValue([
        makePortfolioItem('DIS', 10, 100, 1),
      ]);
      stocks.getTick.mockResolvedValue({ price: 100 });

      const result = await service.getPortfolio(1);
      const item = result.portfolio[0];

      expect(item.unrealizedPnl.toNumber()).toBe(0);
      expect(item.pnlPercentage.toNumber()).toBe(0);
    });
  });

  // ── Cost vs Value Data ─────────────────────────────────────────────

  describe('Cost vs Value Data', () => {
    it('should compute invested as avgPrice * quantity', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser(5000));
      prisma.portfolio.findMany.mockResolvedValue([
        makePortfolioItem('AMZN', 8, 150, 1),
      ]);
      stocks.getTick.mockResolvedValue({ price: 180 });

      const result = await service.getPortfolio(1);
      const item = result.portfolio[0];

      // invested = 150 * 8 = 1200
      expect(item.invested.toNumber()).toBeCloseTo(1200, 2);
      // currentValue = 180 * 8 = 1440
      expect(item.currentValue.toNumber()).toBeCloseTo(1440, 2);
    });

    it('should work with multiple positions for grouped comparison', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser(2000));
      prisma.portfolio.findMany.mockResolvedValue([
        makePortfolioItem('AAPL', 10, 100, 1),
        makePortfolioItem('GOOG', 5, 200, 2),
        makePortfolioItem('TSLA', 3, 300, 3),
      ]);
      stocks.getTick
        .mockResolvedValueOnce({ price: 110 })
        .mockResolvedValueOnce({ price: 190 })
        .mockResolvedValueOnce({ price: 350 });

      const result = await service.getPortfolio(1);

      expect(result.portfolio).toHaveLength(3);

      const aapl = result.portfolio.find((p: { symbol: string }) => p.symbol === 'AAPL');
      expect(aapl.invested.toNumber()).toBeCloseTo(1000, 2);   // 10 * 100
      expect(aapl.currentValue.toNumber()).toBeCloseTo(1100, 2); // 10 * 110

      const goog = result.portfolio.find((p: { symbol: string }) => p.symbol === 'GOOG');
      expect(goog.invested.toNumber()).toBeCloseTo(1000, 2);   // 5 * 200
      expect(goog.currentValue.toNumber()).toBeCloseTo(950, 2); // 5 * 190

      const tsla = result.portfolio.find((p: { symbol: string }) => p.symbol === 'TSLA');
      expect(tsla.invested.toNumber()).toBeCloseTo(900, 2);    // 3 * 300
      expect(tsla.currentValue.toNumber()).toBeCloseTo(1050, 2); // 3 * 350
    });
  });

  // ── Edge Cases ────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('should handle empty portfolio (cash-only account)', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser(10000));
      prisma.portfolio.findMany.mockResolvedValue([]);

      const result = await service.getPortfolio(1);

      expect(result.portfolio).toHaveLength(0);
      expect(result.balance.toNumber()).toBe(10000);
      expect(result.totalAccountValue.toNumber()).toBe(10000);
      expect(result.totalPortfolioValue.toNumber()).toBe(0);
    });

    it('should handle single stock portfolio', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser(100));
      prisma.portfolio.findMany.mockResolvedValue([
        makePortfolioItem('SOLO', 50, 20, 1),
      ]);
      stocks.getTick.mockResolvedValue({ price: 25 });

      const result = await service.getPortfolio(1);

      expect(result.portfolio).toHaveLength(1);
      expect(result.portfolio[0].symbol).toBe('SOLO');
      expect(result.portfolio[0].currentValue.toNumber()).toBe(1250); // 50 * 25
      expect(result.portfolio[0].invested.toNumber()).toBe(1000);     // 50 * 20
      expect(result.totalAccountValue.toNumber()).toBe(1350);         // 100 + 1250
    });

    it('should handle stock price at zero', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser(5000));
      prisma.portfolio.findMany.mockResolvedValue([
        makePortfolioItem('DEAD', 10, 100, 1),
      ]);
      stocks.getTick.mockResolvedValue({ price: 0 }); // stock went to zero

      const result = await service.getPortfolio(1);
      const item = result.portfolio[0];

      expect(item.currentValue.toNumber()).toBe(0);
      expect(item.unrealizedPnl.toNumber()).toBe(-1000); // lost entire investment
      expect(item.pnlPercentage.toNumber()).toBe(-100);
    });
  });
});
