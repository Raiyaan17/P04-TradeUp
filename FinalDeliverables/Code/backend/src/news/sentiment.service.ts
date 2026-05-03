import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

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

@Injectable()
export class SentimentService {
  private readonly geminiApiUrl =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';

  constructor(private readonly httpService: HttpService) {}

  async analyzeSentiment(
    request: SentimentAnalysisRequest,
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

    Headline: "${request.title}"

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
      const response = (await firstValueFrom(
        this.httpService.post<GeminiApiResponse>(
          `${this.geminiApiUrl}?key=${geminiApiKey}`,
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
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
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
        title: request.title,
        sentiment: sentimentData.sentiment,
        confidence: sentimentData.confidence || 0.5,
        reasoning: sentimentData.reasoning || 'No reasoning provided',
        keywords: Array.isArray(sentimentData.keywords)
          ? sentimentData.keywords
          : [],
      };
    } catch (error: unknown) {
      console.error('Sentiment analysis error:', error);

      const errorWithResponse = error as { response?: { status?: number } };

      if (errorWithResponse.response?.status === 400) {
        throw new HttpException(
          'Invalid request to sentiment analysis service',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (errorWithResponse.response?.status === 403) {
        throw new HttpException(
          'Sentiment analysis service access denied',
          HttpStatus.FORBIDDEN,
        );
      }

      throw new HttpException(
        'Sentiment analysis service temporarily unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
