import { Controller, Get, Post, Body } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

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

@Controller('news')
export class NewsController {
  constructor(private readonly httpService: HttpService) {}

  @Get('latest')
  async getLatestNews(): Promise<LatestNewsArticle[]> {
    const apiKey = process.env.NEWS_API_KEY;
    const url = `https://financialmodelingprep.com/stable/fmp-articles?limit=10&apikey=${apiKey}`;
    const response = await firstValueFrom(this.httpService.get<LatestNewsArticle[]>(url));
    return response.data;
  }

  @Post('stock')
  async getStockNews(@Body() body: { ticker: string }): Promise<StockNewsArticle[]> {
    const apiKey = process.env.STOCK_API_KEY;
    const ticker = body?.ticker;
    
    if (!ticker) {
      return [];
    }
    
    const url = `https://api.marketaux.com/v1/news/all?symbols=${ticker}&limit=3&api_token=${apiKey}`;
    const response = await firstValueFrom(this.httpService.get<{ data: StockNewsArticle[] }>(url));
    return response.data.data;
  }
}
