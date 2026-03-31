import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface TournamentDataPoint {
  minute: number;
  PSX: number;
  HBL: number;
  UBL: number;
  MCB: number;
  HUBC: number;
  FFC: number;
}

export interface TournamentNewsItem {
  minute: number;
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
  private readonly apiKey: string;
  private readonly apiUrl =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
  }

  async generateTournamentData(): Promise<GeneratedTournamentData> {
    try {
      const trajectory = await this.architectAgent();
      const news = await this.chroniclerAgent(trajectory);
      return { trajectory, news };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Generation failed: ${errorMessage}`);
      return this.getFallbackData();
    }
  }

  private async architectAgent(): Promise<TournamentDataPoint[]> {
    const prompt = `You are a financial market simulator. Generate a 60-minute price trajectory for the Pakistani stock market.
Included assets: PSX Index, HBL, UBL, MCB, HUBC, FFC.

Base prices:
PSX: 62000
HBL: 125.5
UBL: 142.3
MCB: 178.9
HUBC: 89.75
FFC: 95.4

Requirements:
1. Output exactly 60 data points (minute 1 to 60).
2. Create dynamic, realistic intraday fluctuations. Include a small market trend (e.g., morning dip followed by recovery).
3. Output strictly valid JSON.

Format:
{
  "trajectory": [
    { "minute": 1, "PSX": 62050, "HBL": 125.6, "UBL": 142.5, "MCB": 179.0, "HUBC": 89.8, "FFC": 95.5 },
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
    const prompt = `You are a financial news AI. Generate 10-15 realistic breaking news headlines distributed across a 60-minute window for the Pakistani market.

Trajectory indicates an opening at PSX ${trajectory[0]?.PSX || 62000} and ending around ${trajectory[trajectory.length - 1]?.PSX || 62000}.

Requirements:
1. Output 10-15 news items spread across minute 1 to 60.
2. Sentiment should be 'positive', 'negative', or 'neutral'.
3. Output strictly valid JSON.

Format:
{
  "news": [
    { "minute": 5, "headline": "SBP announces new interest rate policy, markets react", "sentiment": "neutral" }
  ]
}

No extra text, no markdown block syntax, just raw JSON.`;

    const response = await this.callGemini(prompt);
    return this.parseNews(response);
  }

  private async callGemini(prompt: string): Promise<string> {
    const url = `${this.apiUrl}?key=${this.apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  private parseTrajectory(response: string): TournamentDataPoint[] {
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return parsed.trajectory || [];
  }

  private parseNews(response: string): TournamentNewsItem[] {
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return parsed.news || [];
  }

  private getFallbackData(): GeneratedTournamentData {
    const trajectory: TournamentDataPoint[] = [];
    for (let i = 1; i <= 60; i++) {
        trajectory.push({
            minute: i,
            PSX: 62000 + (Math.random() * 200 - 100),
            HBL: 125.5 + (Math.random() * 2 - 1),
            UBL: 142.3 + (Math.random() * 2 - 1),
            MCB: 178.9 + (Math.random() * 2 - 1),
            HUBC: 89.75 + (Math.random() * 2 - 1),
            FFC: 95.4 + (Math.random() * 2 - 1),
        });
    }

    const news: TournamentNewsItem[] = [
        { minute: 5, headline: 'Markets open with cautious optimism', sentiment: 'neutral' },
        { minute: 30, headline: 'Mid-session trading shows volatile swings', sentiment: 'neutral' },
        { minute: 55, headline: 'Investors secure positions ahead of closing', sentiment: 'neutral' }
    ];

    return { trajectory, news };
  }
}
