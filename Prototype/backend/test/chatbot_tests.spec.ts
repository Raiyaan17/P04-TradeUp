/**
                CHATBOT FEATURE — AUTOMATED TESTS       
                                                          
   Run with:  npm run test:e2e -- chatbot_tests          
                                                          
   5 core test cases covering the main chatbot use-cases:
     TC-01  Session creation / reuse                      
     TC-02  Successful chat response via Gemini          
     TC-03  Graceful fallback when Gemini API fails      
     TC-04  New user context detection                    
     TC-05  Admin-only access control on /train          
 
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatbotService } from '../src/chatbot/chatbot.service';
import { ChatbotController } from '../src/chatbot/chatbot.controller';
import { PrismaService } from '../src/prisma/prisma.service';
import { StocksService } from '../src/stocks/stocks.service';
import { TradesService } from '../src/trades/trades.service';
import { WatchlistService } from '../src/watchlist/watchlist.service';

// ─── Mock global fetch (used by ChatbotService to call Gemini API) ──
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

/** Simulate a successful Gemini API response */
function geminiOk(text: string) {
  return {
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text }] } }],
    }),
  };
}

/** Simulate a failed Gemini API response */
function geminiFail(status = 500) {
  return {
    ok: false,
    status,
    text: async () => 'Internal Server Error',
  };
}

// ═════════════════════════════════════════════════════════════════════
//  TC-01 to TC-04 — ChatbotService
// ═════════════════════════════════════════════════════════════════════

describe('ChatbotService', () => {
  let service: ChatbotService;
  let prisma: Record<string, any>;
  let tradesService: Partial<TradesService>;
  let watchlistService: Partial<WatchlistService>;
  let stocksService: Partial<StocksService>;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockFetch.mockReset();

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
          id: 1, name: 'Test User', username: 'testuser', balance: 100000,
        }),
      },
      tournament: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    tradesService = {
      getPortfolio: jest.fn().mockResolvedValue({
        balance: 100000, totalAccountValue: 100000, totalInvested: 0,
        totalUnrealizedPnl: 0, totalPnlPercentage: 0, portfolio: [],
      }),
      getTransactions: jest.fn().mockResolvedValue({
        transactions: [], total: 0, limit: 20, offset: 0,
      }),
    };
    watchlistService = { list: jest.fn().mockResolvedValue([]) };
    stocksService = { listFeaturedWithTicks: jest.fn().mockResolvedValue([]) };

    mockFetch.mockResolvedValue(geminiOk('baseline loaded'));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatbotService,
        { provide: PrismaService, useValue: prisma },
        { provide: StocksService, useValue: stocksService },
        { provide: TradesService, useValue: tradesService },
        { provide: WatchlistService, useValue: watchlistService },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('fake-api-key') } },
      ],
    }).compile();

    service = module.get<ChatbotService>(ChatbotService);
    await service.onModuleInit();
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  it('TC-01: should reuse existing session or create a new one', async () => {
    // First call — no existing session → creates new
    prisma.chatSession.findFirst.mockResolvedValue(null);
    const newSession = { id: 99, userId: 1, createdAt: new Date(), lastActiveAt: new Date() };
    prisma.chatSession.create.mockResolvedValue(newSession);

    const created = await service.getOrCreateSession(1);
    expect(created).toEqual(newSession);
    expect(prisma.chatSession.create).toHaveBeenCalledWith({ data: { userId: 1 } });

    // Second call — existing session within 24h → reuses it
    jest.clearAllMocks();
    prisma.chatSession.findFirst.mockResolvedValue(newSession);

    const reused = await service.getOrCreateSession(1);
    expect(reused).toEqual(newSession);
    expect(prisma.chatSession.create).not.toHaveBeenCalled();
  });

  it('TC-02: should call Gemini, persist messages, and return the AI response', async () => {
    prisma.chatSession.findFirst.mockResolvedValue({ id: 1, userId: 1 });
    mockFetch.mockResolvedValue(geminiOk('Great question! Here is my analysis...'));

    const result = await service.getChatResponse(1, 1, 'analyze my portfolio');

    expect(result).toBe('Great question! Here is my analysis...');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(prisma.chatMessage.createMany).toHaveBeenCalledWith({
      data: [
        { sessionId: 1, role: 'user', content: 'analyze my portfolio' },
        { sessionId: 1, role: 'assistant', content: 'Great question! Here is my analysis...' },
      ],
    });
  });

  it('TC-03: should return a helpful static fallback when Gemini API fails', async () => {
    prisma.chatSession.findFirst.mockResolvedValue({ id: 1, userId: 1 });
    mockFetch.mockResolvedValue(geminiFail(503));

    const greetingResult = await service.getChatResponse(1, 1, 'hello');
    expect(greetingResult).toContain('Hello');
    expect(greetingResult).toContain('TradeUp AI');

    mockFetch.mockResolvedValue(geminiFail(503));
    const genericResult = await service.getChatResponse(1, 1, 'what is market cap?');
    expect(genericResult).toContain('connection issue');
  });

  it('TC-04: should detect new users and include NEW USER marker in context', async () => {
    prisma.chatSession.findFirst.mockResolvedValue({ id: 1, userId: 1 });

    mockFetch.mockImplementation(async (_url: string, options: any) => {
      const body = JSON.parse(options.body);
      const systemText = body.system_instruction.parts[0].text;
      expect(systemText).toContain('NEW USER');
      return geminiOk('Welcome to TradeUp!');
    });

    const result = await service.getChatResponse(1, 1, 'hi');
    expect(result).toBe('Welcome to TradeUp!');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

// ═════════════════════════════════════════════════════════════════════
//  TC-05 — ChatbotController (admin access control)
// ═════════════════════════════════════════════════════════════════════

describe('ChatbotController', () => {
  let controller: ChatbotController;
  let chatbotService: Record<string, jest.Mock>;

  beforeEach(async () => {
    chatbotService = {
      getOrCreateSession: jest.fn(),
      getSessionHistory: jest.fn(),
      getChatResponse: jest.fn(),
      generatePeriodicReview: jest.fn(),
      trainBaselineModel: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatbotController],
      providers: [{ provide: ChatbotService, useValue: chatbotService }],
    }).compile();

    controller = module.get<ChatbotController>(ChatbotController);
  });

  it('TC-05: should allow ADMIN to train and block TRADER with ForbiddenException', async () => {
    // ADMIN → allowed
    chatbotService.trainBaselineModel.mockResolvedValue(undefined);
    const adminReq = { user: { userId: 1, email: 'admin@test.com', role: 'ADMIN' } };
    const result = await controller.train(adminReq as any);
    expect(chatbotService.trainBaselineModel).toHaveBeenCalled();
    expect(result).toEqual({ message: 'Market baseline refreshed successfully.' });

    // TRADER → blocked
    const traderReq = { user: { userId: 2, email: 'trader@test.com', role: 'TRADER' } };
    await expect(controller.train(traderReq as any)).rejects.toThrow(ForbiddenException);
  });
});
