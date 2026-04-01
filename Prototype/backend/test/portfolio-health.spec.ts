import { Test, TestingModule } from '@nestjs/testing';
import { TradesService } from '../src/trades/trades.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { StocksService } from '../src/stocks/stocks.service';
import { FriendsService } from '../src/friends/friends.service';
import { Decimal } from '@prisma/client/runtime/library';


// run with:
// npx jest --config test/jest-e2e.json --testRegex="portfolio-health\\.spec\\.ts$"


/**
 * Feature A: Portfolio Health Monitor — Unit Tests
 *
 * Tests the three rule-based health metrics computed inside getPortfolio():
 *   1. Concentration Risk (single stock > 40% of account = warning, > 60% = critical)
 *   2. Liquidity Risk (cash < 5% of account = warning, < 2% = critical)
 *   3. Loss Tolerance (worst position PnL < -15% = warning, < -30% = critical)
 *
 * Strategy: Mock PrismaService and StocksService to inject deterministic
 * portfolio/balance states, then assert the computed healthStatus and healthSignals.
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

type HealthSignal = {
  type: 'concentration' | 'liquidity' | 'lossTolerance';
  status: 'good' | 'warning' | 'critical';
  message: string;
  value: number;
  relatedSymbol?: string;
};

// ── Test Suite ──────────────────────────────────────────────────────────

describe('Feature A: Portfolio Health Monitor', () => {
  let service: TradesService;
  let prisma: { user: { findUnique: jest.Mock }; portfolio: { findMany: jest.Mock } };
  let stocks: { getTick: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn() },
      portfolio: { findMany: jest.fn() },
    };
    stocks = {
      getTick: jest.fn(),
    };

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

  // ── Concentration Risk ──────────────────────────────────────────────

  describe('Concentration Risk', () => {
    it('should return "good" when no single stock exceeds 40% of account value', async () => {
      // Setup: $5000 cash, 2 stocks each worth $2500 at current price
      // Each stock = 2500 / 10000 = 25% < 40%
      prisma.user.findUnique.mockResolvedValue(makeUser(5000));
      prisma.portfolio.findMany.mockResolvedValue([
        makePortfolioItem('AAPL', 10, 250, 1),
        makePortfolioItem('GOOG', 10, 250, 2),
      ]);
      stocks.getTick.mockResolvedValue({ price: 250 }); // current = avg, so each is $2500

      const result = await service.getPortfolio(1);

      const concentrationSignal = result.healthSignals.find(
        (s: HealthSignal) => s.type === 'concentration',
      );
      expect(concentrationSignal).toBeDefined();
      expect(concentrationSignal!.status).toBe('good');
      expect(concentrationSignal!.value).toBeLessThanOrEqual(40);
    });

    it('should return "warning" when a single stock is between 40-60% of account value', async () => {
      // Setup: $100 cash, Stock A worth $900 at current price — 900/1000 = 90%?
      // Let's be precise: $1000 cash, stock worth $1000 => 50% concentration
      prisma.user.findUnique.mockResolvedValue(makeUser(1000));
      prisma.portfolio.findMany.mockResolvedValue([
        makePortfolioItem('TSLA', 10, 100, 1),
      ]);
      stocks.getTick.mockResolvedValue({ price: 100 }); // 10 * 100 = $1000

      // totalAccountValue = 1000 (cash) + 1000 (stock) = 2000
      // concentration = 1000/2000 = 50% → warning
      const result = await service.getPortfolio(1);

      const signal = result.healthSignals.find(
        (s: HealthSignal) => s.type === 'concentration',
      );
      expect(signal).toBeDefined();
      expect(signal!.status).toBe('warning');
      expect(signal!.value).toBeCloseTo(50, 0);
      expect(signal!.relatedSymbol).toBe('TSLA');
    });

    it('should return "critical" when a single stock exceeds 60% of account value', async () => {
      // Setup: $100 cash, stock worth $900
      // totalAccountValue = 100 + 900 = 1000
      // concentration = 900/1000 = 90% → critical
      prisma.user.findUnique.mockResolvedValue(makeUser(100));
      prisma.portfolio.findMany.mockResolvedValue([
        makePortfolioItem('NVDA', 9, 100, 1),
      ]);
      stocks.getTick.mockResolvedValue({ price: 100 }); // 9 * 100 = $900

      const result = await service.getPortfolio(1);

      const signal = result.healthSignals.find(
        (s: HealthSignal) => s.type === 'concentration',
      );
      expect(signal).toBeDefined();
      expect(signal!.status).toBe('critical');
      expect(signal!.value).toBeGreaterThan(60);
      expect(signal!.relatedSymbol).toBe('NVDA');
    });
  });

  // ── Liquidity Risk ──────────────────────────────────────────────────

  describe('Liquidity Risk', () => {
    it('should return "good" when cash is >= 5% of total account value', async () => {
      // $600 cash, $400 in stock → cash% = 60%
      prisma.user.findUnique.mockResolvedValue(makeUser(600));
      prisma.portfolio.findMany.mockResolvedValue([
        makePortfolioItem('MSFT', 4, 100, 1),
      ]);
      stocks.getTick.mockResolvedValue({ price: 100 }); // 4 * 100 = $400

      const result = await service.getPortfolio(1);

      const signal = result.healthSignals.find(
        (s: HealthSignal) => s.type === 'liquidity',
      );
      expect(signal).toBeDefined();
      expect(signal!.status).toBe('good');
      expect(signal!.value).toBeGreaterThanOrEqual(5);
    });

    it('should return "warning" when cash is between 2-5% of total account value', async () => {
      // $30 cash, $970 in stock → cash% = 3%
      prisma.user.findUnique.mockResolvedValue(makeUser(30));
      prisma.portfolio.findMany.mockResolvedValue([
        makePortfolioItem('META', 97, 10, 1),
      ]);
      stocks.getTick.mockResolvedValue({ price: 10 }); // 97 * 10 = $970

      const result = await service.getPortfolio(1);

      const signal = result.healthSignals.find(
        (s: HealthSignal) => s.type === 'liquidity',
      );
      expect(signal).toBeDefined();
      expect(signal!.status).toBe('warning');
      expect(signal!.value).toBeGreaterThanOrEqual(2);
      expect(signal!.value).toBeLessThan(5);
    });

    it('should return "critical" when cash is < 2% of total account value', async () => {
      // $10 cash, $990 in stock → cash% = 1%
      prisma.user.findUnique.mockResolvedValue(makeUser(10));
      prisma.portfolio.findMany.mockResolvedValue([
        makePortfolioItem('AMZN', 99, 10, 1),
      ]);
      stocks.getTick.mockResolvedValue({ price: 10 }); // 99 * 10 = $990

      const result = await service.getPortfolio(1);

      const signal = result.healthSignals.find(
        (s: HealthSignal) => s.type === 'liquidity',
      );
      expect(signal).toBeDefined();
      expect(signal!.status).toBe('critical');
      expect(signal!.value).toBeLessThan(2);
    });
  });

  // ── Loss Tolerance Risk ─────────────────────────────────────────────

  describe('Loss Tolerance Risk', () => {
    it('should return "good" when no position has PnL worse than -15%', async () => {
      // Bought at $100, now at $95 → PnL = -5%
      prisma.user.findUnique.mockResolvedValue(makeUser(5000));
      prisma.portfolio.findMany.mockResolvedValue([
        makePortfolioItem('DIS', 10, 100, 1),
      ]);
      stocks.getTick.mockResolvedValue({ price: 95 });

      const result = await service.getPortfolio(1);

      const signal = result.healthSignals.find(
        (s: HealthSignal) => s.type === 'lossTolerance',
      );
      expect(signal).toBeDefined();
      expect(signal!.status).toBe('good');
    });

    it('should return "warning" when worst position PnL is between -15% and -30%', async () => {
      // Bought at $100, now at $80 → PnL = -20%
      prisma.user.findUnique.mockResolvedValue(makeUser(5000));
      prisma.portfolio.findMany.mockResolvedValue([
        makePortfolioItem('BA', 10, 100, 1),
      ]);
      stocks.getTick.mockResolvedValue({ price: 80 });

      const result = await service.getPortfolio(1);

      const signal = result.healthSignals.find(
        (s: HealthSignal) => s.type === 'lossTolerance',
      );
      expect(signal).toBeDefined();
      expect(signal!.status).toBe('warning');
      expect(signal!.relatedSymbol).toBe('BA');
    });

    it('should return "critical" when worst position PnL is below -30%', async () => {
      // Bought at $100, now at $60 → PnL = -40%
      prisma.user.findUnique.mockResolvedValue(makeUser(5000));
      prisma.portfolio.findMany.mockResolvedValue([
        makePortfolioItem('INTC', 10, 100, 1),
      ]);
      stocks.getTick.mockResolvedValue({ price: 60 });

      const result = await service.getPortfolio(1);

      const signal = result.healthSignals.find(
        (s: HealthSignal) => s.type === 'lossTolerance',
      );
      expect(signal).toBeDefined();
      expect(signal!.status).toBe('critical');
      expect(signal!.value).toBeLessThan(-30);
      expect(signal!.relatedSymbol).toBe('INTC');
    });
  });

  // ── Aggregate Health Status ─────────────────────────────────────────

  describe('Aggregate healthStatus', () => {
    it('should be "good" when all signals are good', async () => {
      // Balanced: $5000 cash, $2500 in each of 2 stocks, no losses
      prisma.user.findUnique.mockResolvedValue(makeUser(5000));
      prisma.portfolio.findMany.mockResolvedValue([
        makePortfolioItem('AAPL', 10, 250, 1),
        makePortfolioItem('GOOG', 10, 250, 2),
      ]);
      stocks.getTick.mockResolvedValue({ price: 250 });

      const result = await service.getPortfolio(1);
      expect(result.healthStatus).toBe('good');
    });

    it('should be "warning" when at least one signal is warning and none critical', async () => {
      // Cash is 3% → liquidity warning, but concentration and loss are fine
      prisma.user.findUnique.mockResolvedValue(makeUser(30));
      prisma.portfolio.findMany.mockResolvedValue([
        makePortfolioItem('AAPL', 5, 100, 1),
        makePortfolioItem('GOOG', 5, 94, 2),
      ]);
      stocks.getTick.mockResolvedValue({ price: 100 }); // no loss
      // totalAccountValue = 30 + 1000 = 1030
      // cash% = 30/1030 ≈ 2.9% → warning
      // concentration = 500/1030 ≈ 48.5% → warning too (this is fine, still not critical)

      const result = await service.getPortfolio(1);
      expect(result.healthStatus).toBe('warning');
    });

    it('should be "critical" when at least one signal is critical', async () => {
      // Cash $10, one stock worth $990 → liquidity critical, concentration critical
      prisma.user.findUnique.mockResolvedValue(makeUser(10));
      prisma.portfolio.findMany.mockResolvedValue([
        makePortfolioItem('TSLA', 99, 10, 1),
      ]);
      stocks.getTick.mockResolvedValue({ price: 10 });

      const result = await service.getPortfolio(1);
      expect(result.healthStatus).toBe('critical');
    });
  });

  // ── Edge Cases ──────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('should return empty healthSignals when portfolio is empty (no holdings)', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser(10000));
      prisma.portfolio.findMany.mockResolvedValue([]);

      const result = await service.getPortfolio(1);

      // No concentration or lossTolerance signals (require holdings), only liquidity
      const concentrationSignal = result.healthSignals.find(
        (s: HealthSignal) => s.type === 'concentration',
      );
      const lossSignal = result.healthSignals.find(
        (s: HealthSignal) => s.type === 'lossTolerance',
      );
      expect(concentrationSignal).toBeUndefined();
      expect(lossSignal).toBeUndefined();
      expect(result.healthStatus).toBe('good');
    });

    it('should include healthStatus and healthSignals fields in the response', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser(10000));
      prisma.portfolio.findMany.mockResolvedValue([]);

      const result = await service.getPortfolio(1);

      expect(result).toHaveProperty('healthStatus');
      expect(result).toHaveProperty('healthSignals');
      expect(Array.isArray(result.healthSignals)).toBe(true);
      expect(['good', 'warning', 'critical']).toContain(result.healthStatus);
    });

    it('should correctly identify the worst-performing stock for lossTolerance', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser(5000));
      prisma.portfolio.findMany.mockResolvedValue([
        makePortfolioItem('GOOD', 10, 100, 1),
        makePortfolioItem('BAD', 10, 100, 2),
      ]);
      // GOOD stock at $100 (0% PnL), BAD stock at $65 (-35% PnL)
      stocks.getTick
        .mockResolvedValueOnce({ price: 100 })
        .mockResolvedValueOnce({ price: 65 });

      const result = await service.getPortfolio(1);

      const signal = result.healthSignals.find(
        (s: HealthSignal) => s.type === 'lossTolerance',
      );
      expect(signal!.relatedSymbol).toBe('BAD');
      expect(signal!.status).toBe('critical');
    });
  });
});
