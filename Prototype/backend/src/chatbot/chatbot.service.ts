import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';
dotenv.config();
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { StocksService } from '../stocks/stocks.service';
import { TradesService } from '../trades/trades.service';
import { WatchlistService } from '../watchlist/watchlist.service';
import { subDays } from 'date-fns';

@Injectable()
export class ChatbotService implements OnModuleInit {
  private readonly logger = new Logger(ChatbotService.name);
  private readonly ai: GoogleGenAI;
  private readonly apiKey: string;
  private marketBaseline: string = '';

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly stocksService: StocksService,
    private readonly tradesService: TradesService,
    private readonly watchlistService: WatchlistService,
  ) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
    this.ai = new GoogleGenAI({ apiKey: this.apiKey });
  }

  async onModuleInit() {
    if (!this.apiKey) {
      this.logger.error(
        'GEMINI_API_KEY is not defined in environment variables',
      );
    }
    await this.trainBaselineModel();
  }

  // ─────────────────────────────────────────────
  // SESSION MANAGEMENT
  // ─────────────────────────────────────────────

  async getOrCreateSession(userId: number) {
    // Try to find an existing session active in the last 24 hours
    const existing = await this.prisma.chatSession.findFirst({
      where: {
        userId,
        lastActiveAt: { gte: subDays(new Date(), 1) },
      },
      orderBy: { lastActiveAt: 'desc' },
    });

    if (existing) return existing;

    return this.prisma.chatSession.create({
      data: { userId },
    });
  }

  async getSessionHistory(sessionId: number, userId: number) {
    // Verify session belongs to user
    const session = await this.prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
    });
    if (!session) throw new Error('Session not found');

    return this.prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ─────────────────────────────────────────────
  // MAIN CHAT HANDLER
  // ─────────────────────────────────────────────

  async getChatResponse(userId: number, sessionId: number, message: string) {
    // 1. Verify session belongs to this user
    let session: {
      id: number;
      userId: number;
      lastActiveAt: Date;
      createdAt: Date;
    } | null = null;
    try {
      session = await this.prisma.chatSession.findFirst({
        where: { id: sessionId, userId },
      });
    } catch (err) {
      this.logger.error('Failed to verify chat session:', err);
    }
    if (!session) {
      return 'It looks like your chat session has expired. Please close and reopen the chat to start a new session.';
    }

    // 2. Load conversation history (non-critical — continue with empty if fails)
    let history: {
      id: number;
      sessionId: number;
      role: string;
      content: string;
      createdAt: Date;
    }[] = [];
    try {
      history = await this.prisma.chatMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'asc' },
        take: 20,
      });
    } catch (err) {
      this.logger.warn(
        'Failed to load chat history, continuing without it:',
        err,
      );
    }

    // 3. Build user context (fully resilient — won't throw)
    let contextSnapshot = '';
    try {
      contextSnapshot = await this.buildUserContext(userId);
    } catch (err) {
      this.logger.warn(
        'Failed to build user context, continuing with minimal context:',
        err,
      );
      contextSnapshot = `USER ID: ${userId}\nNote: Could not load detailed user data.`;
    }

    // 4. Build system prompt
    const systemPrompt = this.buildSystemPrompt(contextSnapshot);

    // 5. Format history into Gemini multi-turn format
    const conversationHistory = history.map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    // 6. Call Gemini — with fallback on failure
    let reply: string;
    try {
      reply = await this.callGemini(systemPrompt, conversationHistory, message);
    } catch (err) {
      this.logger.error('Gemini API call failed:', err);
      // Provide a helpful static fallback instead of a generic error
      reply = this.getStaticFallbackResponse(message);
    }

    // 7. Persist messages (non-critical — don't fail if DB write fails)
    try {
      await this.prisma.chatMessage.createMany({
        data: [
          { sessionId, role: 'user', content: message },
          { sessionId, role: 'assistant', content: reply },
        ],
      });

      await this.prisma.chatSession.update({
        where: { id: sessionId },
        data: { lastActiveAt: new Date() },
      });
    } catch (err) {
      this.logger.warn('Failed to persist chat messages:', err);
    }

    return reply;
  }

  /**
   * Provides a helpful static response when the AI API is unavailable.
   */
  private getStaticFallbackResponse(userMessage: string): string {
    const lowerMsg = userMessage.toLowerCase();

    if (
      lowerMsg.includes('hi') ||
      lowerMsg.includes('hello') ||
      lowerMsg.includes('hey')
    ) {
      return "👋 **Hello!** Welcome to TradeUp AI!\n\nI'm your trading coach for the Pakistan Stock Exchange (PSX). I can help you with:\n\n• 📊 **Stock analysis** — ask me about any PSX stock\n• 📈 **Trading strategies** — learn about value investing, momentum trading, and more\n• 💼 **Portfolio advice** — I'll review your trades and suggest improvements\n• 📚 **Trading basics** — perfect if you're just getting started\n\nWhat would you like to explore?";
    }

    if (
      lowerMsg.includes('trade') ||
      lowerMsg.includes('buy') ||
      lowerMsg.includes('sell')
    ) {
      return "📈 **Trading on TradeUp**\n\nHere are the basics:\n\n1. **Browse stocks** — Check out the featured PSX stocks on your dashboard\n2. **Add to watchlist** — Keep an eye on stocks you're interested in\n3. **Buy shares** — Use your simulated balance to practice buying\n4. **Sell shares** — Sell when you think the price is right\n5. **Track P&L** — Monitor your profit and loss in your portfolio\n\n💡 **Tip:** Start with small quantities to learn how price movements affect your portfolio!\n\nWould you like me to explain any of these steps in more detail?";
    }

    return "👋 Thanks for your message! I'm currently experiencing a brief connection issue with my AI engine, but I'll be back to full power shortly.\n\nIn the meantime, here are some things you can explore:\n\n• 📊 Check out the **featured stocks** on your dashboard\n• ⭐ Add interesting stocks to your **watchlist**\n• 💰 Try making a practice **trade** with your simulated balance\n\nPlease try sending your message again in a moment!";
  }

  // ─────────────────────────────────────────────
  // PERIODIC REVIEW
  // ─────────────────────────────────────────────

  async generatePeriodicReview(userId: number, period: 'weekly' | 'monthly') {
    const since =
      period === 'weekly' ? subDays(new Date(), 7) : subDays(new Date(), 30);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const allTransactions = await this.tradesService.getTransactions(
      userId,
      100,
    );
    const portfolioData = await this.tradesService.getPortfolio(userId);

    // Helper to safely convert Decimal/number/string to a displayable number
    const safeNum = (val: unknown, decimals = 2): string => {
      if (val === null || val === undefined) return '0';
      const n =
        // @ts-ignore
        typeof val === 'object' && val.toNumber ? val.toNumber() : Number(val);
      return isNaN(n) ? '0' : n.toFixed(decimals);
    };

    const periodTransactions = allTransactions.transactions.filter(
      (t: Record<string, unknown>) =>
        new Date(t.createdAt as string | number | Date) >= since,
    );

    const tradeLines = periodTransactions.map(
      (t: Record<string, unknown>) =>
        `• ${String(t.type)} ${String(t.symbol)} x${Number(t.quantity)} @ ${safeNum(t.price)} PKR on ${new Date(t.createdAt as string | number | Date).toLocaleDateString('en-PK')}`,
    );

    const reviewPrompt = `
      Generate a ${period} trading performance review for ${user?.name || user?.username}.

      TRADES THIS PERIOD (${periodTransactions.length} total):
      ${tradeLines.length > 0 ? tradeLines.join('\n') : 'No trades this period.'}

      CURRENT PORTFOLIO VALUE: ${safeNum(portfolioData.totalAccountValue)} PKR
      UNREALIZED P&L: ${safeNum(portfolioData.totalUnrealizedPnl)} PKR (${safeNum(portfolioData.totalPnlPercentage)}%)
      CASH BALANCE: ${safeNum(portfolioData.balance)} PKR

      ${this.marketBaseline}

      Write a structured review using this exact format:

      ## ${period.charAt(0).toUpperCase() + period.slice(1)} Performance Review

      **Overall Grade: [A/B/C/D/F]**
      [One sentence justification]

      ### ✅ Good Decisions
      [List top 3 good moves with reasoning]

      ### ❌ Mistakes
      [List top 3 mistakes and what should have been done instead]

      ### 🧠 Behavioral Patterns Detected
      [e.g., panic selling, FOMO buying, holding losers too long]

      ### 📈 Strategy for Next ${period.charAt(0).toUpperCase() + period.slice(1)}
      [Concrete, actionable advice for the Pakistani Stock Exchange (PSX)]
    `;

    return await this.callGemini(
      this.buildBaseSystemPrompt(),
      [],
      reviewPrompt,
    );
  }

  // ─────────────────────────────────────────────
  // BASELINE MODEL "TRAINING" (Context Injection)
  // ─────────────────────────────────────────────

  async trainBaselineModel() {
    this.logger.log('Loading market baseline from simulation data...');
    try {
      const tournaments = await this.prisma.tournament.findMany({
        take: 15,
        orderBy: { createdAt: 'desc' },
      });

      if (tournaments.length === 0) {
        this.marketBaseline = 'No historical simulation data available.';
        return;
      }

      const summaries = tournaments
        .map((s) => {
          const trajectory = s.trajectoryJson as Record<string, unknown>[];
          if (!trajectory || trajectory.length === 0) return '';
          const startPSX = Number(trajectory[0]?.PSX || 62000);
          const endPSX = Number(
            trajectory[trajectory.length - 1]?.PSX || 62000,
          );
          const change = ((endPSX - startPSX) / startPSX) * 100;
          return `• PSX Tournament trend: ${startPSX.toFixed(2)} → ${endPSX.toFixed(2)} (${change.toFixed(2)}%)`;
        })
        .filter((s) => s !== '');

      this.marketBaseline = `SIMULATION HISTORY (PSX Patterns):\n${summaries.join('\n')}`;
      this.logger.log('Market baseline loaded.');
    } catch (error) {
      this.logger.error('Failed to load market baseline:', error);
      this.marketBaseline = 'Market baseline unavailable.';
    }
  }

  // ─────────────────────────────────────────────
  // CONTEXT BUILDER — clean text, not raw JSON
  // ─────────────────────────────────────────────

  private async buildUserContext(userId: number): Promise<string> {
    // Fetch user info — this is critical, but handle gracefully
    let user: {
      id: number;
      name: string | null;
      username: string;
      email: string;
      balance: unknown;
    } | null = null;
    try {
      user = await this.prisma.user.findUnique({ where: { id: userId } });
    } catch (err) {
      this.logger.warn(`Failed to fetch user ${userId}:`, err);
    }

    // Fetch portfolio — safe default for new users with no trades
    let portfolioData: Record<string, unknown> = {
      balance: user?.balance ?? 0,
      totalAccountValue: user?.balance ?? 0,
      totalInvested: 0,
      totalUnrealizedPnl: 0,
      totalPnlPercentage: 0,
      portfolio: [],
    };
    try {
      portfolioData = await this.tradesService.getPortfolio(userId);
    } catch (err) {
      this.logger.warn(`Failed to fetch portfolio for user ${userId}:`, err);
    }

    // Fetch transactions — safe default: empty list
    let transactions: Record<string, unknown>[] = [];
    try {
      const transactionData = await this.tradesService.getTransactions(
        userId,
        20,
      );
      transactions = transactionData?.transactions || [];
    } catch (err) {
      this.logger.warn(`Failed to fetch transactions for user ${userId}:`, err);
    }

    // Fetch watchlist — safe default: empty list
    let watchlistItems: Record<string, unknown>[] = [];
    try {
      watchlistItems = await this.watchlistService.list(userId);
    } catch (err) {
      this.logger.warn(`Failed to fetch watchlist for user ${userId}:`, err);
    }

    // Fetch featured/live stocks — safe default: empty list
    let featuredStocks: Record<string, unknown>[] = [];
    try {
      featuredStocks = await this.stocksService.listFeaturedWithTicks();
    } catch (err) {
      this.logger.warn(`Failed to fetch featured stocks:`, err);
    }

    // Detect new user state
    const isNewUser =
      // @ts-ignore
      (portfolioData.portfolio || []).length === 0 && transactions.length === 0;

    // Helper to safely convert Decimal/number/string to a displayable number
    const safeNum = (val: unknown, decimals = 2): string => {
      if (val === null || val === undefined) return '0';
      const n =
        // @ts-ignore
        typeof val === 'object' && val.toNumber ? val.toNumber() : Number(val);
      return isNaN(n) ? '0' : n.toFixed(decimals);
    };

    // Format holdings as readable bullet points
    const holdingLines = (
      (portfolioData.portfolio as Record<string, unknown>[]) || []
    ).map((h: Record<string, unknown>) => {
      const pnl =
        typeof h.unrealizedPnl === 'object' &&
        h.unrealizedPnl &&
        typeof (h.unrealizedPnl as unknown as Record<string, unknown>)
          .toNumber === 'function'
          ? // @ts-ignore
            (h.unrealizedPnl as unknown as Record<string, unknown>).toNumber()
          : Number(h.unrealizedPnl || 0);
      const pnlSign = pnl >= 0 ? '+' : '';
      return `  • ${String(h.symbol)} (${Number(h.quantity)} shares) — Avg: ${safeNum(h.avgPrice)} | Now: ${safeNum(h.currentPrice)} | P&L: ${pnlSign}${safeNum(h.pnlPercentage, 1)}%`;
    });

    // Format recent trades as readable bullet points
    const tradeLines = transactions.map((t: Record<string, unknown>) => {
      const date = new Date(
        t.createdAt as string | number | Date,
      ).toLocaleDateString('en-PK');
      return `  • ${String(t.type)} ${String(t.symbol)} x${Number(t.quantity)} @ ${safeNum(t.price)} PKR on ${date}`;
    });

    // Format watchlist
    const watchlistLines = watchlistItems.map(
      (w: Record<string, unknown>) => `  • ${String(w.symbol)}`,
    );

    // Format live featured stocks
    const stockLines = (featuredStocks || []).map(
      (s: Record<string, unknown>) => {
        const tick = s.tick as Record<string, unknown> | undefined;
        const change =
          tick?.percentChange != null ? safeNum(tick.percentChange) : 'N/A';
        return `  • ${String(s.symbol)}: ${tick?.price != null ? safeNum(tick.price) : 'N/A'} PKR (${change}%)`;
      },
    );

    const contextString = `
USER: ${user?.name || user?.username || 'Unknown'} (ID: ${userId})
${isNewUser ? 'STATUS: NEW USER — no trades or holdings yet. Be welcoming and educational.\n' : ''}
BALANCE: ${safeNum(portfolioData.balance)} PKR
TOTAL ACCOUNT VALUE: ${safeNum(portfolioData.totalAccountValue)} PKR
TOTAL INVESTED: ${safeNum(portfolioData.totalInvested)} PKR
UNREALIZED P&L: ${safeNum(portfolioData.totalUnrealizedPnl)} PKR (${safeNum(portfolioData.totalPnlPercentage)}%)

CURRENT HOLDINGS:
${holdingLines.length > 0 ? holdingLines.join('\n') : '  No open positions.'}

WATCHLIST:
${watchlistLines.length > 0 ? watchlistLines.join('\n') : '  No stocks on watchlist yet.'}

RECENT TRADES (last 20):
${tradeLines.length > 0 ? tradeLines.join('\n') : '  No recent trades.'}

LIVE FEATURED STOCKS (PSX):
${stockLines.length > 0 ? (stockLines.every((l: string) => l.includes('N/A PKR')) ? '  Market data temporarily unavailable — PSX API is not responding.' : stockLines.join('\n')) : '  No market data available.'}

${this.marketBaseline}
    `.trim();

    this.logger.debug(
      `Built user context for user ${userId} (isNewUser=${isNewUser}, holdings=${((portfolioData.portfolio as unknown[]) || []).length}, trades=${transactions.length}, watchlist=${watchlistItems.length})`,
    );
    return contextString;
  }

  // ─────────────────────────────────────────────
  // SYSTEM PROMPT BUILDERS
  // ─────────────────────────────────────────────

  private buildBaseSystemPrompt(): string {
    return `
You are TradeUp AI — an expert stock trading coach and mentor for the Pakistani Stock Exchange (PSX).
Your personality is that of a senior hedge fund manager: analytical, direct, and encouraging.

CORE RESPONSIBILITIES:
1. Analyze the user's trading behavior and point out patterns (panic selling, FOMO, holding losers too long, buying at peaks).
2. Explain P&L clearly. If they're in a loss, advise whether to hold or cut based on market context.
3. Make predictions on PSX stocks using simulation history and live ticks.
4. Teach trading strategies: value investing, momentum trading, stop-loss discipline, position sizing.
5. Give weekly/monthly performance reviews that are honest and actionable.
6. If the user has stocks on their WATCHLIST, proactively offer insights about those specific stocks, including recent trends, price movements, and whether it might be a good time to buy or hold.

NEW USER HANDLING:
- If the user has no holdings, no trades, and appears to be new, warmly welcome them.
- Explain the basics of how TradeUp works: they can browse stocks, add them to their watchlist, and practice buying/selling with simulated money.
- Suggest they start by exploring the featured PSX stocks and adding interesting ones to their watchlist.
- Offer to teach them trading basics like "What is a stock?", "How does buying/selling work?", or "What is P&L?".
- Never show error messages or say you can't help — always be helpful and educational.

RULES:
- Always respond in markdown.
- Bold all key numbers and stock symbols.
- Keep responses concise unless doing a full review.
- Never give financial advice as a licensed advisor — frame as educational coaching.
- Always localize to PKR and PSX context.
- If data is missing or unavailable, work with what you have and don't mention technical errors.
    `.trim();
  }

  private buildSystemPrompt(contextSnapshot: string): string {
    return `
${this.buildBaseSystemPrompt()}

CURRENT USER CONTEXT:
${contextSnapshot}
    `.trim();
  }

  // ─────────────────────────────────────────────
  // GEMINI API CALL — proper multi-turn format
  // ─────────────────────────────────────────────

  private async callGemini(
    systemPrompt: string,
    conversationHistory: { role: string; parts: { text: string }[] }[],
    newMessage: string,
  ): Promise<string> {
    const contents: Record<string, unknown>[] = [
      ...conversationHistory.map((h) => ({ role: h.role, parts: h.parts })),
      { role: 'user', parts: [{ text: newMessage }] },
    ];

    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    });

    return response.text || "I couldn't generate a response. Please try again.";
  }
}
