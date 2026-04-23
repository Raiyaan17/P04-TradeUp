import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';

export interface TournamentDataPoint {
  day: number;
  PSX: number;
  HBL: number;
  UBL: number;
  MCB: number;
  HUBC: number;
  FFC: number;
}

export interface TournamentNewsItem {
  day: number;
  headline: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}

export interface GeneratedTournamentData {
  trajectory: TournamentDataPoint[];
  news: TournamentNewsItem[];
}

@Injectable()
export class OracleAgentService {
  private readonly logger = new Logger(OracleAgentService.name);
  private readonly ai: GoogleGenAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
    this.ai = new GoogleGenAI({ apiKey });
  }

  async generateTournamentData(
    basePrices: Record<string, number>,
  ): Promise<GeneratedTournamentData> {
    try {
      const trajectory = await this.architectAgent(basePrices);
      const news = await this.chroniclerAgent(trajectory);
      return { trajectory, news };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Generation failed: ${errorMessage}`);
      return this.getFallbackData(basePrices);
    }
  }

  private async architectAgent(
    basePrices: Record<string, number>,
  ): Promise<TournamentDataPoint[]> {
    const prompt = `You are a strict financial market simulator. Generate a 30-day price trajectory for the Pakistani stock market.
Included assets: PSX Index, HBL, UBL, MCB, HUBC, FFC.

Base prices:
PSX: ${basePrices['PSX'] || 171000}
HBL: ${basePrices['HBL'] || 125.5}
UBL: ${basePrices['UBL'] || 142.3}
MCB: ${basePrices['MCB'] || 178.9}
HUBC: ${basePrices['HUBC'] || 89.75}
FFC: ${basePrices['FFC'] || 95.4}

Requirements:
1. Output exactly 30 data points (day 1 to 30).
2. Inject extreme chaos and unpredictability while defining an individual personality for each asset so they ABSOLUTELY DO NOT follow the market index pattern. They must behave independently:
   - PSX: The overall benchmark index.
   - HBL & UBL: Banking sector. Highly volatile, frequently negatively correlated to PSX.
   - MCB: Prone to random massive spikes (+8%) followed by rapid corrections.
   - HUBC: Energy sector. Follows its own completely independent random walk cycle, ignoring PSX momentum.
   - FFC: Steady trajectory but prone to occasional isolated flash crashes (-10%).
3. Output strictly valid JSON.

Format:
{
  "trajectory": [
    { "day": 1, "PSX": 171050, "HBL": 125.6, "UBL": 142.5, "MCB": 179.0, "HUBC": 89.8, "FFC": 95.5 },
    ...
  ]
}

No extra text, no markdown block syntax, just raw JSON.`;

    const response = await this.callGemini(prompt);
    return this.parseTrajectory(response);
  }

  private async chroniclerAgent(
    trajectory: TournamentDataPoint[],
  ): Promise<TournamentNewsItem[]> {
    const simplifiedTrajectory = trajectory
      .filter((t) => t.day % 3 === 0)
      .map(
        (t) =>
          `Day ${t.day}: PSX ${Math.round(t.PSX)}, HBL ${t.HBL.toFixed(1)}, UBL ${t.UBL.toFixed(1)}, MCB ${t.MCB.toFixed(1)}, HUBC ${t.HUBC.toFixed(1)}, FFC ${t.FFC.toFixed(1)}`,
      )
      .join('\n');

    const prompt = `You are a financial news AI. Generate 15-20 realistic breaking news headlines distributed across a 30-day window.
These headlines must align intensely with the key market movements outlined below. When a stock dips significantly or spikes, create a corresponding sector, company, or macro news event around that exact day to justify the price movement.

Market Trajectory Snapshot (every 3 days):
${simplifiedTrajectory}

Requirements:
1. Output 15-20 news items spread across day 1 to 30.
2. Divide the news evenly into 4 categories:
   - Pakistan specific (macroeconomic, SBP, politics)
   - Sector specific (banking, fertilizer, energy)
   - Company specific (ONLY for HBL, UBL, MCB, HUBC, FFC. Ensure some of these companies are directly named and their real-world operations mentioned).
   - Global specific (global oil prices, IMF, foreign markets)
3. Sentiment should be 'positive', 'negative', or 'neutral'.
4. Make the headlines highly realistic and legitimate-sounding.
5. Output strictly valid JSON.

Format:
{
  "news": [
    { "day": 5, "headline": "SBP announces new interest rate policy, markets react", "sentiment": "neutral" }
  ]
}

No extra text, no markdown block syntax, just raw JSON.`;

    const response = await this.callGemini(prompt);
    return this.parseNews(response);
  }

  private async callGemini(
    prompt: string,
    isJson: boolean = true,
  ): Promise<string> {
    const config: {
      temperature: number;
      maxOutputTokens: number;
      responseMimeType?: string;
    } = {
      temperature: 0.7,
      maxOutputTokens: 8192,
    };
    if (isJson) {
      config.responseMimeType = 'application/json';
    }

    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: prompt,
      config,
    });

    return response.text || '';
  }

  private parseTrajectory(response: string): TournamentDataPoint[] {
    const cleaned = response
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    const parsed = JSON.parse(cleaned) as {
      trajectory?: TournamentDataPoint[];
    };
    return parsed.trajectory ?? [];
  }

  private parseNews(response: string): TournamentNewsItem[] {
    const cleaned = response
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    const parsed = JSON.parse(cleaned) as { news?: TournamentNewsItem[] };
    return parsed.news ?? [];
  }

  async generateTournamentAnalysis(stats: {
    startingCash: number;
    pnl: number;
    rank: number;
    totalPlayers: number;
    totalTrades: number;
    topStock: string;
  }): Promise<string> {
    const prompt = `You are a strict, senior hedge fund manager acting as a mentor. Analyze this trader's 60-minute quick tournament performance:
    
Starting Balance: ${stats.startingCash} PKR
Ending PNL: ${stats.pnl} PKR
Global Rank: ${stats.rank} out of ${stats.totalPlayers}
Total Trades Made: ${stats.totalTrades}
Top Traded Stock: ${stats.topStock}

Write a 2-paragraph brutally honest, direct analysis in plain text.
- First paragraph: Grade them (A, B, C, D, or F) and concisely judge their PNL, rank and trading volume.
- Second paragraph: Give them one extremely sharp, actionable piece of strategic advice for next time regarding rapid intraday trading.
Do not use greetings or pleasantries. Do NOT use any asterisks (*), markdown formatting, bold text, or italics. Output raw text only.`;

    try {
      const response = await this.callGemini(prompt, false);
      return response;
    } catch (_e) {
      this.logger.error('Failed to generate analysis', _e);
      return 'Unable to generate AI analysis at this time. Focus on evaluating your transaction history manually.';
    }
  }

  private getFallbackData(
    basePrices: Record<string, number>,
  ): GeneratedTournamentData {
    const trajectory: TournamentDataPoint[] = [];
    for (let i = 1; i <= 30; i++) {
      trajectory.push({
        day: i,
        PSX: (basePrices['PSX'] || 171000) + (Math.random() * 500 - 250),
        HBL: (basePrices['HBL'] || 125.5) + (Math.random() * 2 - 1),
        UBL: (basePrices['UBL'] || 142.3) + (Math.random() * 2 - 1),
        MCB: (basePrices['MCB'] || 178.9) + (Math.random() * 2 - 1),
        HUBC: (basePrices['HUBC'] || 89.75) + (Math.random() * 2 - 1),
        FFC: (basePrices['FFC'] || 95.4) + (Math.random() * 2 - 1),
      });
    }

    const news: TournamentNewsItem[] = [
      {
        day: 5,
        headline: 'Markets open with cautious optimism',
        sentiment: 'neutral',
      },
      {
        day: 15,
        headline: 'Mid-session trading shows volatile swings',
        sentiment: 'neutral',
      },
      {
        day: 25,
        headline: 'Investors secure positions ahead of closing',
        sentiment: 'neutral',
      },
    ];

    return { trajectory, news };
  }
}
