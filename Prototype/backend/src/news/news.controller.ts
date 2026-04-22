import {
  Controller,
  Get,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import Parser from 'rss-parser';

export interface StockNewsEntityHighlight {
  highlight: string;
  sentiment: number | null;
  highlighted_in: string;
}

export interface StockNewsEntity {
  symbol: string;
  name: string;
  exchange: string | null;
  exchange_long: string | null;
  country: string;
  type: string;
  industry: string;
  match_score: number;
  sentiment_score: number | null;
  highlights: StockNewsEntityHighlight[];
}

interface GeminiTextPart {
  text: string;
}

interface GeminiContent {
  parts: GeminiTextPart[];
}

interface GeminiCandidate {
  content: GeminiContent;
}

interface GeminiApiResponse {
  candidates: GeminiCandidate[];
}

interface AxiosGeminiResponse {
  data: GeminiApiResponse;
}

interface GeminiSentimentData {
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  reasoning: string;
  keywords: string[];
}

export interface StockNewsArticle {
  uuid: string;
  title: string;
  description: string;
  keywords: string;
  snippet: string;
  url: string;
  image_url: string;
  language: string;
  published_at: string;
  source: string;
  relevance_score: number | null;
  entities: StockNewsEntity[];
  similar: unknown[];
}

export interface LatestNewsArticle {
  title: string;
  date: string;
  content: string;
  tickers: string;
  image: string;
  link: string;
  author: string;
  site: string;
}

export interface SentimentAnalysisRequest {
  title: string;
}

export interface SentimentAnalysisResponse {
  title: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  reasoning: string;
  keywords: string[];
}

export interface LocalNewsArticle {
  title: string;
  link: string;
  pubDate: string;
  content?: string;
  contentSnippet?: string;
  source: string;
  category?: string;
}

@Controller('news')
export class NewsController {
  constructor(private readonly httpService: HttpService) { }

  @Get('latest')
  async getLatestNews(): Promise<LatestNewsArticle[]> {
    const apiKey = process.env.NEWS_API_KEY;
    const url = `https://financialmodelingprep.com/stable/fmp-articles?limit=10&apikey=${apiKey}`;
    const response = (await firstValueFrom(
      this.httpService.get<LatestNewsArticle[]>(url),
    )) as { data: LatestNewsArticle[] };
    return response.data;
  }

  @Post('stock')
  async getStockNews(
    @Body() body: { ticker: string },
  ): Promise<StockNewsArticle[]> {
    const apiKey = process.env.STOCK_API_KEY;
    const ticker = body?.ticker;

    if (!ticker) {
      return [];
    }

    const url = `https://api.marketaux.com/v1/news/all?symbols=${ticker}&limit=3&api_token=${apiKey}`;
    const response = (await firstValueFrom(
      this.httpService.get<{ data: StockNewsArticle[] }>(url),
    )) as { data: { data: StockNewsArticle[] } };
    return response.data.data;
  }

  @Post('sentiment-analysis')
  async analyzeSentiment(
    @Body() body: SentimentAnalysisRequest,
  ): Promise<SentimentAnalysisResponse> {
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!geminiApiKey) {
      throw new HttpException(
        'Gemini API key not configured',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const prompt = `
    Analyze the sentiment of this financial news headline and provide a structured response:

    Headline: "${body.title}"

    Please analyze the sentiment and respond ONLY with a valid JSON object in this exact format:
    {
      "sentiment": "positive|negative|neutral",
      "confidence": 0.85,
      "reasoning": "Brief explanation of why this sentiment was chosen",
      "keywords": ["keyword1", "keyword2", "keyword3"]
    }

    Rules:
    - sentiment must be exactly one of: "positive", "negative", or "neutral"
    - confidence must be a number between 0 and 1
    - reasoning should be 1-2 sentences explaining the sentiment
    - keywords should be 3-5 key financial terms from the headline
    - Respond with ONLY the JSON object, no other text
    `;

    try {
      const possibleModels = [
        'gemini-2.5-flash', // Best price-performance for sentiment analysis
        'gemini-2.5-flash-lite', // Ultra fast and cost-efficient
        'gemini-3-flash', // Most balanced model
        'gemini-flash-latest', // Latest flash model (alias)
        'gemini-2.5-pro', // Advanced reasoning (if others fail)
        'gemini-pro', // Legacy fallback
      ];

      let response: AxiosGeminiResponse | null = null;
      let lastError: unknown;

      // Try each model until one works
      for (const modelName of possibleModels) {
        try {
          const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

          response = (await firstValueFrom(
            this.httpService.post<GeminiApiResponse>(
              `${geminiApiUrl}?key=${geminiApiKey}`,
              {
                contents: [
                  {
                    parts: [
                      {
                        text: prompt,
                      },
                    ],
                  },
                ],
              },
              {
                headers: {
                  'Content-Type': 'application/json',
                },
              },
            ),
          )) as AxiosGeminiResponse;

          // If we get here, the request succeeded
          console.log(`Successfully used model: ${modelName}`);
          break;
        } catch (modelError: unknown) {
          lastError = modelError;
          const errorWithResponse = modelError as {
            response?: { status?: number };
          };
          console.log(
            `Failed with model ${modelName}:`,
            errorWithResponse.response?.status,
          );
          continue;
        }
      }

      // If all models failed
      if (!response) {
        console.error('All Gemini models failed. Last error:', lastError);
        throw new Error('All available Gemini models failed');
      }

      // Extract the text from Gemini's response
      const generatedText =
        response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!generatedText) {
        throw new Error('No response from Gemini API');
      }

      // Parse the JSON response
      let sentimentData: GeminiSentimentData;
      try {
        // Clean up the response (remove any markdown code blocks if present)
        const cleanedText = generatedText
          .replaceAll(/```json\n?/g, '')
          .replaceAll(/```\n?/g, '')
          .trim();

        const parsedData = JSON.parse(cleanedText) as GeminiSentimentData;
        sentimentData = parsedData;
      } catch {
        console.error('Failed to parse Gemini response:', generatedText);
        throw new Error('Invalid response format from AI service');
      }

      // Validate the response structure
      if (
        !sentimentData.sentiment ||
        !['positive', 'negative', 'neutral'].includes(sentimentData.sentiment)
      ) {
        throw new Error('Invalid sentiment value in response');
      }

      return {
        title: body.title,
        sentiment: sentimentData.sentiment,
        confidence: sentimentData.confidence || 0.5,
        reasoning: sentimentData.reasoning || 'No reasoning provided',
        keywords: Array.isArray(sentimentData.keywords)
          ? sentimentData.keywords
          : [],
      };
    } catch (error) {
      console.error('Sentiment analysis error:', error);

      throw new HttpException(
        'Sentiment analysis service temporarily unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  @Get('local')
  async getLocalNews(): Promise<LocalNewsArticle[]> {
    try {
      const parser: Parser = new Parser({
        customFields: {
          item: ['category', 'description'],
        },
      });

      // Fetch Dawn.com Business RSS feed
      const feed = await parser.parseURL('https://www.dawn.com/feeds/business');

      // Transform RSS items to our format
      const articles: LocalNewsArticle[] = feed.items.map((item) => ({
        title: item.title || 'Untitled',
        link: item.link || '',
        pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
        content: item.content || (item.description as string | undefined) || '',
        contentSnippet: item.contentSnippet || '',
        source: 'Dawn',
        category: 'Business',
      }));

      return articles;
    } catch (error) {
      console.error('Failed to fetch local news RSS feed:', error);
      throw new HttpException(
        'Failed to fetch local news',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
