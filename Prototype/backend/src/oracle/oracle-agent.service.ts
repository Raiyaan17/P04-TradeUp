import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PresetType } from '@prisma/client';

interface TrajectoryPoint {
  day: number;
  priceModifier: number;
  cumulativePrice: number;
}

interface NewsItem {
  day: number;
  headline: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}

interface SimulationData {
  trajectory: TrajectoryPoint[];
  news: NewsItem[];
  basePrice: number;
}

interface AnalysisResult {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  score: number;
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

  async generateScenario(
    presetType: PresetType,
    stockSymbol: string,
    basePrice: number,
    newsContext?: string,
  ): Promise<SimulationData> {
    const trajectory = await this.architectAgent(
      presetType,
      stockSymbol,
      basePrice,
      newsContext,
    );
    const news = await this.chroniclerAgent(
      presetType,
      stockSymbol,
      trajectory,
      newsContext,
    );

    return {
      trajectory,
      news,
      basePrice,
    };
  }

  async analyzePerformance(
    decisions: Array<{
      day: number;
      action: 'buy' | 'sell' | 'hold';
      quantity: number;
      price: number;
    }>,
    finalPortfolio: { cash: number; shares: number; currentPrice: number },
    scenarioData: SimulationData,
  ): Promise<AnalysisResult> {
    return this.executorAgent(decisions, finalPortfolio, scenarioData);
  }

  private async architectAgent(
    presetType: PresetType,
    stockSymbol: string,
    basePrice: number,
    newsContext?: string,
  ): Promise<TrajectoryPoint[]> {
    const prompt = this.buildArchitectPrompt(
      presetType,
      stockSymbol,
      basePrice,
      newsContext,
    );

    try {
      const response = await this.callGemini(prompt);
      const trajectory = this.parseTrajectoryResponse(response);
      return this.calculateCumulativePrices(trajectory, basePrice);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Architect agent failed: ${errorMessage}`);
      return this.getFallbackTrajectory(presetType, basePrice);
    }
  }

  private async chroniclerAgent(
    presetType: PresetType,
    stockSymbol: string,
    trajectory: TrajectoryPoint[],
    newsContext?: string,
  ): Promise<NewsItem[]> {
    const prompt = this.buildChroniclerPrompt(
      presetType,
      stockSymbol,
      trajectory,
      newsContext,
    );

    try {
      const response = await this.callGemini(prompt);
      return this.parseNewsResponse(response);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Chronicler agent failed: ${errorMessage}`);
      return this.getFallbackNews(presetType);
    }
  }

  private async executorAgent(
    decisions: Array<{
      day: number;
      action: 'buy' | 'sell' | 'hold';
      quantity: number;
      price: number;
    }>,
    finalPortfolio: { cash: number; shares: number; currentPrice: number },
    scenarioData: SimulationData,
  ): Promise<AnalysisResult> {
    const prompt = this.buildExecutorPrompt(
      decisions,
      finalPortfolio,
      scenarioData,
    );

    try {
      const response = await this.callGemini(prompt);
      return this.parseAnalysisResponse(response);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Executor agent failed: ${errorMessage}`);
      return this.getFallbackAnalysis();
    }
  }

  private async callGemini(prompt: string): Promise<string> {
    const url = `${this.apiUrl}?key=${this.apiKey}`;

    interface GeminiPart {
      text?: string;
    }

    interface GeminiContent {
      parts?: GeminiPart[];
    }

    interface GeminiCandidate {
      content?: GeminiContent;
    }

    interface GeminiResponse {
      candidates?: GeminiCandidate[];
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Gemini API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as GeminiResponse;
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  private buildArchitectPrompt(
    presetType: PresetType,
    stockSymbol: string,
    basePrice: number,
    newsContext?: string,
  ): string {
    const presetDescriptions: Record<PresetType, string> = {
      [PresetType.STEADY_CLIMB]:
        'A gradual, steady upward trend with minor fluctuations. Overall growth of 15-25% over 30 days.',
      [PresetType.FLASH_CRASH]:
        'A sudden catastrophic drop of 40-60% within the first 5 days, followed by a slow recovery.',
      [PresetType.IMF_ROLLERCOASTER]:
        'High volatility with multiple sharp ups and downs, simulating economic uncertainty. Range: -20% to +30%.',
      [PresetType.REALISTIC_OUTLOOK]:
        'Realistic market behavior based on current economic conditions and news context.',
    };

    const contextSection = newsContext
      ? `\nCurrent Market Context:\n${newsContext}\n`
      : '';

    return `You are The Architect, an AI market simulation expert. Generate a 30-day price trajectory for ${stockSymbol} stock.

Scenario: ${presetType}
Description: ${presetDescriptions[presetType]}
Base Price: ${basePrice} PKR${contextSection}

Requirements:
1. Generate exactly 30 data points (one for each day)
2. Each point should be a percentage modifier (-50% to +50%) representing daily change
3. The trajectory should tell a coherent story matching the scenario
4. Use realistic volatility patterns

Output Format (strictly JSON):
{
  "trajectory": [
    { "day": 1, "priceModifier": 2.5 },
    { "day": 2, "priceModifier": -1.2 },
    ...
  ]
}

Rules:
- priceModifier is a percentage (e.g., 2.5 means +2.5%)
- Day 1 starts at the base price
- Make the progression realistic and scenario-appropriate
- No comments, only valid JSON`;
  }

  private buildChroniclerPrompt(
    presetType: PresetType,
    stockSymbol: string,
    trajectory: TrajectoryPoint[],
    newsContext?: string,
  ): string {
    const priceSummary = trajectory
      .filter((_, idx) => idx % 5 === 0 || idx === trajectory.length - 1)
      .map((t) => `Day ${t.day}: ${t.cumulativePrice.toFixed(2)} PKR`)
      .join('\n');

    const contextSection = newsContext
      ? `\nCurrent Market Context:\n${newsContext}\n`
      : '';

    return `You are The Chronicler, an AI financial news writer. Generate news headlines for ${stockSymbol} stock over 30 days.

Scenario: ${presetType}
Price Trajectory Summary:
${priceSummary}${contextSection}

Requirements:
1. Generate 8-12 headlines spread across the 30 days
2. Headlines should explain price movements and add narrative depth
3. Mix of positive, negative, and neutral sentiment
4. Headlines should feel realistic for Pakistani stock market news

Output Format (strictly JSON):
{
  "news": [
    { "day": 1, "headline": "${stockSymbol} opens strong on positive earnings outlook", "sentiment": "positive" },
    { "day": 5, "headline": "Market volatility hits ${stockSymbol} amid global uncertainty", "sentiment": "negative" },
    ...
  ]
}

Rules:
- day: number between 1-30
- sentiment: must be "positive", "negative", or "neutral"
- Headlines should be 8-15 words
- No comments, only valid JSON`;
  }

  private buildExecutorPrompt(
    decisions: Array<{
      day: number;
      action: 'buy' | 'sell' | 'hold';
      quantity: number;
      price: number;
    }>,
    finalPortfolio: { cash: number; shares: number; currentPrice: number },
    scenarioData: SimulationData,
  ): string {
    const initialCash = 100000;
    const finalValue =
      finalPortfolio.cash + finalPortfolio.shares * finalPortfolio.currentPrice;
    const profit = finalValue - initialCash;
    const profitPercent = (profit / initialCash) * 100;

    return `You are The Executor, an AI trading performance analyst. Analyze the user's trading decisions.

Initial Capital: ${initialCash} PKR
Final Portfolio Value: ${finalValue} PKR
Profit/Loss: ${profit} PKR (${profitPercent.toFixed(2)}%)

Trading Decisions:
${decisions.map((d) => `Day ${d.day}: ${d.action.toUpperCase()} ${d.quantity} shares at ${d.price} PKR`).join('\n')}

Price Trajectory:
${scenarioData.trajectory.map((t) => `Day ${t.day}: ${t.cumulativePrice.toFixed(2)} PKR`).join('\n')}

Requirements:
1. Provide a brief summary of overall performance
2. Identify 2-3 key strengths in their strategy
3. Identify 2-3 areas for improvement
4. Give 2-3 actionable recommendations
5. Assign a score from 0-100

Output Format (strictly JSON):
{
  "summary": "Brief performance summary here",
  "strengths": ["Strength 1", "Strength 2", "Strength 3"],
  "weaknesses": ["Weakness 1", "Weakness 2", "Weakness 3"],
  "recommendations": ["Recommendation 1", "Recommendation 2", "Recommendation 3"],
  "score": 75
}

Rules:
- Be constructive but honest
- Score should reflect both profit and decision quality
- No comments, only valid JSON`;
  }

  private parseTrajectoryResponse(
    response: string,
  ): Array<{ day: number; priceModifier: number }> {
    try {
      const cleaned = response
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      interface TrajectoryResponse {
        trajectory?: Array<{ day: number; priceModifier: number }>;
      }
      const parsed = JSON.parse(cleaned) as TrajectoryResponse;
      return parsed.trajectory || [];
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to parse trajectory: ${errorMessage}`);
      throw error;
    }
  }

  private parseNewsResponse(response: string): NewsItem[] {
    try {
      const cleaned = response
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      interface NewsResponse {
        news?: NewsItem[];
      }
      const parsed = JSON.parse(cleaned) as NewsResponse;
      return parsed.news || [];
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to parse news: ${errorMessage}`);
      throw error;
    }
  }

  private parseAnalysisResponse(response: string): AnalysisResult {
    try {
      const cleaned = response
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      interface AnalysisResponse {
        summary?: string;
        strengths?: string[];
        weaknesses?: string[];
        recommendations?: string[];
        score?: number;
      }
      const parsed = JSON.parse(cleaned) as AnalysisResponse;
      return {
        summary: parsed.summary || '',
        strengths: parsed.strengths || [],
        weaknesses: parsed.weaknesses || [],
        recommendations: parsed.recommendations || [],
        score: parsed.score || 0,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to parse analysis: ${errorMessage}`);
      throw error;
    }
  }

  private calculateCumulativePrices(
    trajectory: Array<{ day: number; priceModifier: number }>,
    basePrice: number,
  ): TrajectoryPoint[] {
    let currentPrice = basePrice;
    return trajectory.map((point) => {
      const priceChange = currentPrice * (point.priceModifier / 100);
      currentPrice += priceChange;
      return {
        day: point.day,
        priceModifier: point.priceModifier,
        cumulativePrice: currentPrice,
      };
    });
  }

  private getFallbackTrajectory(
    presetType: PresetType,
    basePrice: number,
  ): TrajectoryPoint[] {
    const modifiers: Record<PresetType, number[]> = {
      [PresetType.STEADY_CLIMB]: [
        1.2, 0.8, 1.5, -0.5, 1.0, 1.3, 0.7, 1.1, 0.9, 1.4, -0.3, 1.2, 0.8, 1.0,
        1.1, -0.2, 1.3, 0.9, 1.0, 0.8, 1.2, -0.4, 1.1, 0.7, 1.0, 1.3, 0.6, 1.2,
        0.9, 1.0,
      ],
      [PresetType.FLASH_CRASH]: [
        -2.0, -5.5, -8.0, -12.0, -15.0, -5.0, -3.0, 2.0, 1.5, 0.8, 1.2, -1.0,
        2.5, 1.8, 0.5, 1.0, -0.8, 1.5, 2.0, 1.2, 0.5, 1.8, -0.5, 2.0, 1.5, 0.8,
        1.2, 2.5, 1.0, 1.5,
      ],
      [PresetType.IMF_ROLLERCOASTER]: [
        3.0, -4.0, 2.5, -3.5, 5.0, -2.0, 4.0, -5.0, 3.5, -2.5, 6.0, -4.0, 2.0,
        -3.0, 4.5, -2.5, 3.0, -4.5, 5.5, -3.0, 2.5, -2.0, 4.0, -3.5, 3.5, -2.5,
        2.0, -1.5, 3.0, 2.5,
      ],
      [PresetType.REALISTIC_OUTLOOK]: [
        0.5, -0.8, 1.2, -0.3, 0.9, -1.1, 0.7, 1.3, -0.5, 1.0, -0.7, 1.1, 0.4,
        -0.9, 1.2, 0.3, -1.0, 0.8, 1.4, -0.4, 0.6, -0.6, 1.0, 0.2, -0.8, 1.1,
        0.5, -0.3, 0.9, 1.0,
      ],
    };

    const trajectory = modifiers[presetType].map((modifier, index) => ({
      day: index + 1,
      priceModifier: modifier,
    }));

    return this.calculateCumulativePrices(trajectory, basePrice);
  }

  private getFallbackNews(presetType: PresetType): NewsItem[] {
    const headlines: Record<PresetType, NewsItem[]> = {
      [PresetType.STEADY_CLIMB]: [
        {
          day: 1,
          headline: 'Stock opens with positive momentum on strong fundamentals',
          sentiment: 'positive',
        },
        {
          day: 7,
          headline: 'Quarterly earnings exceed analyst expectations',
          sentiment: 'positive',
        },
        {
          day: 14,
          headline: 'New product launch drives investor confidence',
          sentiment: 'positive',
        },
        {
          day: 21,
          headline: 'Market analysts upgrade stock rating to buy',
          sentiment: 'positive',
        },
        {
          day: 30,
          headline: 'Stock closes month at all-time high levels',
          sentiment: 'positive',
        },
      ],
      [PresetType.FLASH_CRASH]: [
        {
          day: 1,
          headline: 'Unexpected market shock triggers sell-off',
          sentiment: 'negative',
        },
        {
          day: 3,
          headline: 'Panic selling accelerates as stop-losses hit',
          sentiment: 'negative',
        },
        {
          day: 5,
          headline: 'Stock hits multi-year low amid crisis',
          sentiment: 'negative',
        },
        {
          day: 10,
          headline: 'Value investors begin accumulation phase',
          sentiment: 'neutral',
        },
        {
          day: 20,
          headline: 'Slow recovery underway as stability returns',
          sentiment: 'positive',
        },
        {
          day: 30,
          headline: 'Market shows resilience despite early crash',
          sentiment: 'neutral',
        },
      ],
      [PresetType.IMF_ROLLERCOASTER]: [
        {
          day: 2,
          headline: 'IMF announcement sends markets soaring',
          sentiment: 'positive',
        },
        {
          day: 4,
          headline: 'Currency volatility concerns emerge',
          sentiment: 'negative',
        },
        {
          day: 8,
          headline: 'Foreign investment flows boost confidence',
          sentiment: 'positive',
        },
        {
          day: 12,
          headline: 'Geopolitical tensions create uncertainty',
          sentiment: 'negative',
        },
        {
          day: 16,
          headline: 'Economic indicators show mixed signals',
          sentiment: 'neutral',
        },
        {
          day: 22,
          headline: 'Central Bank intervention stabilizes markets',
          sentiment: 'positive',
        },
        {
          day: 28,
          headline: 'Month ends with high volatility persisting',
          sentiment: 'neutral',
        },
      ],
      [PresetType.REALISTIC_OUTLOOK]: [
        {
          day: 5,
          headline: 'Economic data releases impact trading sentiment',
          sentiment: 'neutral',
        },
        {
          day: 10,
          headline: 'Sector rotation affects stock performance',
          sentiment: 'neutral',
        },
        {
          day: 15,
          headline: 'Mid-month review shows steady progress',
          sentiment: 'positive',
        },
        {
          day: 20,
          headline: 'Global market trends influence local trading',
          sentiment: 'neutral',
        },
        {
          day: 25,
          headline: 'Institutional investors adjust positions',
          sentiment: 'neutral',
        },
        {
          day: 30,
          headline: 'Month concludes with balanced outlook',
          sentiment: 'neutral',
        },
      ],
    };

    return headlines[presetType];
  }

  private getFallbackAnalysis(): AnalysisResult {
    return {
      summary:
        'Trading session completed with mixed results. The simulation provided valuable learning opportunities.',
      strengths: [
        'Participated in the simulation',
        'Made decisive trading choices',
        'Completed the full 30-day period',
      ],
      weaknesses: [
        'Limited diversification in strategy',
        'Timing could be optimized',
        'Risk management could be improved',
      ],
      recommendations: [
        'Study market patterns more carefully',
        'Practice with different scenarios',
        'Set clear entry and exit rules',
      ],
      score: 50,
    };
  }
}
