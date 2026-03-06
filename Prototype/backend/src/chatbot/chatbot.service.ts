import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { StocksService } from '../stocks/stocks.service';
import { TradesService } from '../trades/trades.service';
import { subDays } from 'date-fns';

@Injectable()
export class ChatbotService implements OnModuleInit {
  private readonly logger = new Logger(ChatbotService.name);
  private readonly apiKey: string;
  private readonly apiUrl =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
  private marketBaseline: string = '';

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly stocksService: StocksService,
    private readonly tradesService: TradesService,
  ) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
  }

  async onModuleInit() {
    if (!this.apiKey) {
      this.logger.error('GEMINI_API_KEY is not defined in environment variables');
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
    try {
      // Verify session belongs to this user
      const session = await this.prisma.chatSession.findFirst({
        where: { id: sessionId, userId },
      });
      if (!session) throw new Error('Session not found or unauthorized');

      // 1. Load last 20 messages as sliding window memory
      const history = await this.prisma.chatMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'asc' },
        take: 20,
      });

      // 2. Build clean user context snapshot
      const contextSnapshot = await this.buildUserContext(userId);

      // 3. Build system prompt
      const systemPrompt = this.buildSystemPrompt(contextSnapshot);

      // 4. Format history into Gemini multi-turn format
      const conversationHistory = history.map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      }));

      // 5. Call Gemini with proper multi-turn structure
      const reply = await this.callGemini(systemPrompt, conversationHistory, message);

      // 6. Persist both the user message and AI reply
      await this.prisma.chatMessage.createMany({
        data: [
          { sessionId, role: 'user', content: message },
          { sessionId, role: 'assistant', content: reply },
        ],
      });

      // 7. Touch session lastActiveAt
      await this.prisma.chatSession.update({
        where: { id: sessionId },
        data: { lastActiveAt: new Date() },
      });

      return reply;
    } catch (error) {
      this.logger.error('Error generating chat response:', error);
      return "I'm sorry, I'm having trouble analyzing your portfolio right now. Please try again later.";
    }
  }

  // ─────────────────────────────────────────────
  // PERIODIC REVIEW
  // ─────────────────────────────────────────────

  async generatePeriodicReview(userId: number, period: 'weekly' | 'monthly') {
    const since = period === 'weekly' ? subDays(new Date(), 7) : subDays(new Date(), 30);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const allTransactions = await this.tradesService.getTransactions(userId, 100);
    const portfolioData = await this.tradesService.getPortfolio(userId);

    // Filter transactions within the period
    const periodTransactions = allTransactions.transactions.filter(
      (t: any) => new Date(t.createdAt) >= since,
    );

    const tradeLines = periodTransactions.map((t: any) =>
      `• ${t.type} ${t.stockSymbol} x${t.quantity} @ ${t.price} PKR on ${new Date(t.createdAt).toLocaleDateString('en-PK')}`,
    );

    const reviewPrompt = `
      Generate a ${period} trading performance review for ${user?.name || user?.username}.

      TRADES THIS PERIOD (${periodTransactions.length} total):
      ${tradeLines.length > 0 ? tradeLines.join('\n') : 'No trades this period.'}

      CURRENT PORTFOLIO VALUE: ${portfolioData.totalAccountValue} PKR
      UNREALIZED P&L: ${portfolioData.totalUnrealizedPnl} PKR (${portfolioData.totalPnlPercentage.toFixed(2)}%)
      CASH BALANCE: ${portfolioData.balance} PKR

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

    return await this.callGemini(this.buildBaseSystemPrompt(), [], reviewPrompt);
  }

  // ─────────────────────────────────────────────
  // BASELINE MODEL "TRAINING" (Context Injection)
  // ─────────────────────────────────────────────

  async trainBaselineModel() {
    this.logger.log('Loading market baseline from simulation data...');
    try {
      const scenarios = await this.prisma.simulationScenario.findMany({
        take: 15,
        orderBy: { createdAt: 'desc' },
      });

      if (scenarios.length === 0) {
        this.marketBaseline = 'No historical simulation data available.';
        return;
      }

      const summaries = scenarios.map((s) => {
        const trajectory = s.trajectoryJson as any[];
        const startPrice = trajectory[0]?.cumulativePrice || s.basePrice;
        const endPrice = trajectory[trajectory.length - 1]?.cumulativePrice || s.basePrice;
        const change = ((endPrice - startPrice) / startPrice) * 100;
        return `• ${s.stockSymbol} (${s.presetType}): ${s.basePrice} → ${endPrice.toFixed(2)} (${change.toFixed(2)}%)`;
      });

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
    const [user, portfolioData, transactionData, featuredStocks] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.tradesService.getPortfolio(userId),
      this.tradesService.getTransactions(userId, 20),
      this.stocksService.listFeaturedWithTicks(),
    ]);

    // Format holdings as readable bullet points
    const holdingLines = (portfolioData.portfolio || []).map((h: any) => {
      const pnlSign = h.unrealizedPnl >= 0 ? '+' : '';
      return `  • ${h.stockSymbol} (${h.quantity} shares) — Avg: ${h.avgBuyPrice} | Now: ${h.currentPrice} | P&L: ${pnlSign}${h.pnlPercentage?.toFixed(1)}%`;
    });

    // Format recent trades as readable bullet points
    const tradeLine = (t: any) => {
      const date = new Date(t.createdAt).toLocaleDateString('en-PK');
      return `  • ${t.type} ${t.stockSymbol} x${t.quantity} @ ${t.price} PKR on ${date}`;
    };
    const tradeLines = (transactionData.transactions || []).map(tradeLine);

    // Format live featured stocks
    const stockLines = (featuredStocks || []).map((s: any) => {
      const change = s.latestTick?.changePercent?.toFixed(2) ?? 'N/A';
      return `  • ${s.symbol}: ${s.latestTick?.price ?? 'N/A'} PKR (${change}%)`;
    });

    return `
USER: ${user?.name || user?.username} (ID: ${userId})
BALANCE: ${portfolioData.balance} PKR
TOTAL ACCOUNT VALUE: ${portfolioData.totalAccountValue} PKR
TOTAL INVESTED: ${portfolioData.totalInvested} PKR
UNREALIZED P&L: ${portfolioData.totalUnrealizedPnl} PKR (${portfolioData.totalPnlPercentage?.toFixed(2)}%)

CURRENT HOLDINGS:
${holdingLines.length > 0 ? holdingLines.join('\n') : '  No open positions.'}

RECENT TRADES (last 20):
${tradeLines.length > 0 ? tradeLines.join('\n') : '  No recent trades.'}

LIVE FEATURED STOCKS (PSX):
${stockLines.length > 0 ? stockLines.join('\n') : '  No market data available.'}

${this.marketBaseline}
    `.trim();
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

RULES:
- Always respond in markdown.
- Bold all key numbers and stock symbols.
- Keep responses concise unless doing a full review.
- Never give financial advice as a licensed advisor — frame as educational coaching.
- Always localize to PKR and PSX context.
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
    const url = `${this.apiUrl}?key=${this.apiKey}`;

    const body = {
      // system_instruction keeps the system prompt separate from conversation
      system_instruction: {
        parts: [{ text: systemPrompt }],
      },
      // contents = full conversation history + the new user message at the end
      contents: [
        ...conversationHistory,
        { role: 'user', parts: [{ text: newMessage }] },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    return (
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "I couldn't generate a response. Please try again."
    );
  }
}