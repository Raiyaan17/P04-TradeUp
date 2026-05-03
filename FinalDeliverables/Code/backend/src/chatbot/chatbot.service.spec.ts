import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ChatbotService } from './chatbot.service';
import { PrismaService } from '../prisma/prisma.service';
import { StocksService } from '../stocks/stocks.service';
import { TradesService } from '../trades/trades.service';
import { WatchlistService } from '../watchlist/watchlist.service';

// ─── Mock global fetch ──────────────────────────────────────────────
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof global.fetch;

// ─── Helpers ────────────────────────────────────────────────────────

/** Build a fake Gemini-style success response */
function geminiOk(text: string) {
  return {
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text }] } }],
    }),
  };
}

/** Build a fake Gemini error response */
function geminiFail(status = 500) {
  return {
    ok: false,
    status,
    text: async () => 'Internal Server Error',
  };
}

// ─── Describe ───────────────────────────────────────────────────────

describe('ChatbotService', () => {
  let service: ChatbotService;
  let prisma: Record<string, Record<string, jest.Mock>>;
  let tradesService: Partial<TradesService>;
  let watchlistService: Partial<WatchlistService>;
  let stocksService: Partial<StocksService>;

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();
    mockFetch.mockReset();

    // ── Prisma mock ──────────────────────────────────────────────
    prisma = {
      chatSession: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      chatMessage: {
        findMany: jest.fn().mockResolvedValue([]),
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 1,
          name: 'Test User',
          username: 'testuser',
          balance: 100000,
        }),
      },
      tournament: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    // ── Trades service mock ──────────────────────────────────────
    tradesService = {
      getPortfolio: jest.fn().mockResolvedValue({
        balance: 100000,
        totalAccountValue: 100000,
        totalInvested: 0,
        totalUnrealizedPnl: 0,
        totalPnlPercentage: 0,
        portfolio: [],
      }),
      getTransactions: jest.fn().mockResolvedValue({
        transactions: [],
        total: 0,
        limit: 20,
        offset: 0,
      }),
    };

    // ── Watchlist service mock ────────────────────────────────────
    watchlistService = {
      list: jest.fn().mockResolvedValue([]),
    };

    // ── Stocks service mock ──────────────────────────────────────
    stocksService = {
      listFeaturedWithTicks: jest.fn().mockResolvedValue([]),
    };

    // Provide a default Gemini success response so onModuleInit won't crash
    mockFetch.mockResolvedValue(geminiOk('baseline loaded'));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatbotService,
        { provide: PrismaService, useValue: prisma },
        { provide: StocksService, useValue: stocksService },
        { provide: TradesService, useValue: tradesService },
        { provide: WatchlistService, useValue: watchlistService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('fake-api-key'),
          },
        },
      ],
    }).compile();

    service = module.get<ChatbotService>(ChatbotService);

    // Manually call onModuleInit so trainBaselineModel runs with our mock
    await service.onModuleInit();
    // Clear mocks after init so test assertions are clean
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  // ═══════════════════════════════════════════════════════════════
  // SESSION MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  describe('getOrCreateSession', () => {
    it('should return an existing session if one is active within 24h', async () => {
      const existingSession = {
        id: 42,
        userId: 1,
        createdAt: new Date(),
        lastActiveAt: new Date(),
      };
      prisma.chatSession.findFirst.mockResolvedValue(existingSession);

      const result = await service.getOrCreateSession(1);

      expect(result).toEqual(existingSession);
      expect(prisma.chatSession.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 1 }),
        }),
      );
      expect(prisma.chatSession.create).not.toHaveBeenCalled();
    });

    it('should create a new session if no recent session exists', async () => {
      prisma.chatSession.findFirst.mockResolvedValue(null);
      const newSession = {
        id: 99,
        userId: 1,
        createdAt: new Date(),
        lastActiveAt: new Date(),
      };
      prisma.chatSession.create.mockResolvedValue(newSession);

      const result = await service.getOrCreateSession(1);

      expect(result).toEqual(newSession);
      expect(prisma.chatSession.create).toHaveBeenCalledWith({
        data: { userId: 1 },
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SESSION HISTORY
  // ═══════════════════════════════════════════════════════════════

  describe('getSessionHistory', () => {
    it('should return messages for a valid session', async () => {
      prisma.chatSession.findFirst.mockResolvedValue({ id: 1, userId: 1 });
      const messages = [
        {
          id: 1,
          sessionId: 1,
          role: 'user',
          content: 'hello',
          createdAt: new Date(),
        },
        {
          id: 2,
          sessionId: 1,
          role: 'assistant',
          content: 'hi!',
          createdAt: new Date(),
        },
      ];
      prisma.chatMessage.findMany.mockResolvedValue(messages);

      const result = await service.getSessionHistory(1, 1);

      expect(result).toEqual(messages);
      expect(prisma.chatMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sessionId: 1 },
          orderBy: { createdAt: 'asc' },
        }),
      );
    });

    it('should throw an error if the session does not belong to the user', async () => {
      prisma.chatSession.findFirst.mockResolvedValue(null);

      await expect(service.getSessionHistory(1, 999)).rejects.toThrow(
        'Session not found',
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // CHAT RESPONSE
  // ═══════════════════════════════════════════════════════════════

  describe('getChatResponse', () => {
    it('should return session-expired message when session is not found', async () => {
      prisma.chatSession.findFirst.mockResolvedValue(null);

      const result = await service.getChatResponse(1, 999, 'hello');

      expect(result).toContain('session has expired');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should call Gemini and return the response on success', async () => {
      prisma.chatSession.findFirst.mockResolvedValue({ id: 1, userId: 1 });
      prisma.chatMessage.findMany.mockResolvedValue([]);
      mockFetch.mockResolvedValue(
        geminiOk('Great question! Here is my analysis...'),
      );

      const result = await service.getChatResponse(
        1,
        1,
        'analyze my portfolio',
      );

      expect(result).toBe('Great question! Here is my analysis...');
      expect(mockFetch).toHaveBeenCalledTimes(1);
      // Verify messages were persisted
      expect(prisma.chatMessage.createMany).toHaveBeenCalledWith({
        data: [
          { sessionId: 1, role: 'user', content: 'analyze my portfolio' },
          {
            sessionId: 1,
            role: 'assistant',
            content: 'Great question! Here is my analysis...',
          },
        ],
      });
      // Verify session lastActiveAt was updated
      expect(prisma.chatSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({ lastActiveAt: expect.any(Date) }),
        }),
      );
    });

    it('should return a static fallback when Gemini API fails', async () => {
      prisma.chatSession.findFirst.mockResolvedValue({ id: 1, userId: 1 });
      prisma.chatMessage.findMany.mockResolvedValue([]);
      mockFetch.mockResolvedValue(geminiFail(500));

      const result = await service.getChatResponse(1, 1, 'some question');

      // Should not crash — returns a helpful fallback
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should still return the reply even if DB write fails', async () => {
      prisma.chatSession.findFirst.mockResolvedValue({ id: 1, userId: 1 });
      prisma.chatMessage.findMany.mockResolvedValue([]);
      mockFetch.mockResolvedValue(geminiOk('Here is your advice'));
      // Make persistence fail
      prisma.chatMessage.createMany.mockRejectedValue(
        new Error('DB write failed'),
      );

      const result = await service.getChatResponse(1, 1, 'give me advice');

      // Response should still be returned
      expect(result).toBe('Here is your advice');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // STATIC FALLBACK RESPONSES
  // ═══════════════════════════════════════════════════════════════

  describe('getStaticFallbackResponse (via getChatResponse with Gemini failure)', () => {
    beforeEach(() => {
      prisma.chatSession.findFirst.mockResolvedValue({ id: 1, userId: 1 });
      prisma.chatMessage.findMany.mockResolvedValue([]);
      mockFetch.mockResolvedValue(geminiFail(503));
    });

    it('should return a greeting fallback for "hello"', async () => {
      const result = await service.getChatResponse(1, 1, 'hello');
      expect(result).toContain('Hello');
      expect(result).toContain('TradeUp AI');
    });

    it('should return a trading guide for messages about buying', async () => {
      const result = await service.getChatResponse(
        1,
        1,
        'how do I buy stocks?',
      );
      expect(result).toContain('Trading');
      expect(result).toContain('Buy');
    });

    it('should return a generic fallback for other messages', async () => {
      const result = await service.getChatResponse(1, 1, 'what is market cap?');
      expect(result).toContain('connection issue');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // USER CONTEXT BUILDER
  // ═══════════════════════════════════════════════════════════════

  describe('buildUserContext (tested via getChatResponse)', () => {
    it('should mark new users with STATUS: NEW USER', async () => {
      prisma.chatSession.findFirst.mockResolvedValue({ id: 1, userId: 1 });
      prisma.chatMessage.findMany.mockResolvedValue([]);
      (tradesService.getPortfolio as jest.Mock).mockResolvedValue({
        balance: 100000,
        totalAccountValue: 100000,
        totalInvested: 0,
        totalUnrealizedPnl: 0,
        totalPnlPercentage: 0,
        portfolio: [],
      });
      (tradesService.getTransactions as jest.Mock).mockResolvedValue({
        transactions: [],
        total: 0,
      });

      // Capture what prompt is sent to Gemini
      mockFetch.mockImplementation(async (_url: string, options: unknown) => {
        // @ts-ignore
        const body = JSON.parse(options.body);
        const systemText = body.system_instruction.parts[0].text;
        expect(systemText).toContain('NEW USER');
        return geminiOk('Welcome!');
      });

      await service.getChatResponse(1, 1, 'hi');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should include portfolio holdings for experienced users', async () => {
      prisma.chatSession.findFirst.mockResolvedValue({ id: 1, userId: 1 });
      prisma.chatMessage.findMany.mockResolvedValue([]);
      (tradesService.getPortfolio as jest.Mock).mockResolvedValue({
        balance: 50000,
        totalAccountValue: 75000,
        totalInvested: 25000,
        totalUnrealizedPnl: 5000,
        totalPnlPercentage: 20,
        portfolio: [
          {
            symbol: 'OGDC',
            quantity: 10,
            avgPrice: 120,
            currentPrice: 135,
            unrealizedPnl: 150,
            pnlPercentage: 12.5,
          },
        ],
      });
      (tradesService.getTransactions as jest.Mock).mockResolvedValue({
        transactions: [
          {
            type: 'BUY',
            symbol: 'OGDC',
            quantity: 10,
            price: 120,
            createdAt: new Date(),
          },
        ],
        total: 1,
      });

      mockFetch.mockImplementation(async (_url: string, options: unknown) => {
        // @ts-ignore
        const body = JSON.parse(options.body);
        const systemText = body.system_instruction.parts[0].text;
        // Should NOT contain new user marker
        expect(systemText).not.toContain('STATUS: NEW USER');
        // Should contain the stock symbol
        expect(systemText).toContain('OGDC');
        return geminiOk('Your OGDC position looks strong.');
      });

      await service.getChatResponse(1, 1, 'how is my portfolio?');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should gracefully handle sub-service failures', async () => {
      prisma.chatSession.findFirst.mockResolvedValue({ id: 1, userId: 1 });
      prisma.chatMessage.findMany.mockResolvedValue([]);
      // Make all sub-services fail
      prisma.user.findUnique.mockRejectedValue(new Error('DB down'));
      (tradesService.getPortfolio as jest.Mock).mockRejectedValue(
        new Error('DB down'),
      );
      (tradesService.getTransactions as jest.Mock).mockRejectedValue(
        new Error('DB down'),
      );
      (watchlistService.list as jest.Mock).mockRejectedValue(
        new Error('DB down'),
      );
      (stocksService.listFeaturedWithTicks as jest.Mock).mockRejectedValue(
        new Error('DB down'),
      );

      mockFetch.mockResolvedValue(geminiOk('I can still help you!'));

      // Should NOT throw
      const result = await service.getChatResponse(1, 1, 'help');
      expect(result).toBe('I can still help you!');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // TRAIN BASELINE MODEL
  // ═══════════════════════════════════════════════════════════════

  describe('trainBaselineModel', () => {
    it('should build baseline from tournament trajectory data', async () => {
      prisma.tournament.findMany.mockResolvedValue([
        {
          id: '1',
          trajectoryJson: [{ PSX: 60000 }, { PSX: 62000 }],
          createdAt: new Date(),
        },
      ]);

      await service.trainBaselineModel();

      // Access private field via bracket notation for testing
      const baseline = (service as unknown as Record<string, unknown>)
        .marketBaseline as string;
      expect(baseline).toContain('SIMULATION HISTORY');
      expect(baseline).toContain('60000');
      expect(baseline).toContain('62000');
    });

    it('should handle empty tournament data gracefully', async () => {
      prisma.tournament.findMany.mockResolvedValue([]);

      await service.trainBaselineModel();

      const baseline = (service as unknown as Record<string, unknown>)
        .marketBaseline as string;
      expect(baseline).toBe('No historical simulation data available.');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // PERIODIC REVIEW
  // ═══════════════════════════════════════════════════════════════

  describe('generatePeriodicReview', () => {
    it('should generate a weekly review calling Gemini with the right prompt', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 1, name: 'Test User' });
      (tradesService.getTransactions as jest.Mock).mockResolvedValue({
        transactions: [
          {
            type: 'BUY',
            symbol: 'HBL',
            quantity: 5,
            price: 200,
            createdAt: new Date(),
          },
        ],
        total: 1,
      });
      (tradesService.getPortfolio as jest.Mock).mockResolvedValue({
        totalAccountValue: 90000,
        totalUnrealizedPnl: -1000,
        totalPnlPercentage: -1.1,
        balance: 80000,
      });

      mockFetch.mockImplementation(async (_url: string, options: unknown) => {
        // @ts-ignore
        const body = JSON.parse(options.body);
        const userMsg = body.contents[0].parts[0].text;
        expect(userMsg).toContain('weekly');
        expect(userMsg).toContain('Test User');
        return geminiOk('## Weekly Performance Review\n**Overall Grade: B**');
      });

      const result = await service.generatePeriodicReview(1, 'weekly');

      expect(result).toContain('Weekly Performance Review');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should generate a monthly review with 30-day window', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 1, name: 'Trader Ali' });
      (tradesService.getTransactions as jest.Mock).mockResolvedValue({
        transactions: [],
        total: 0,
      });
      (tradesService.getPortfolio as jest.Mock).mockResolvedValue({
        totalAccountValue: 100000,
        totalUnrealizedPnl: 0,
        totalPnlPercentage: 0,
        balance: 100000,
      });

      mockFetch.mockImplementation(async (_url: string, options: unknown) => {
        // @ts-ignore
        const body = JSON.parse(options.body);
        const userMsg = body.contents[0].parts[0].text;
        expect(userMsg).toContain('monthly');
        expect(userMsg).toContain('Trader Ali');
        expect(userMsg).toContain('No trades this period');
        return geminiOk(
          '## Monthly Performance Review\n**Overall Grade: N/A**',
        );
      });

      const result = await service.generatePeriodicReview(1, 'monthly');

      expect(result).toContain('Monthly Performance Review');
    });
  });
});
