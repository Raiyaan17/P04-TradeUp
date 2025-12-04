import { NewsArticle, StockNewsArticle } from '@/types/news';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

export async function fetchLatestNews(): Promise<NewsArticle[]> {
  try {
    const response = await fetch(`${API_BASE}/news/latest`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch latest news: ${response.status}`);
    }

    const data = await response.json();
    
    if (Array.isArray(data)) {
      return data as NewsArticle[];
    }
    
    return [];
  } catch (error) {
    console.error('Error in fetchLatestNews:', error);
    throw error;
  }
}

export async function fetchStockNews(ticker: string): Promise<StockNewsArticle[]> {
  try {
    const response = await fetch(`${API_BASE}/news/stock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ticker }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch stock news: ${response.status}`);
    }

    const data = await response.json();
    
    if (Array.isArray(data)) {
      return data as StockNewsArticle[];
    }
    
    return [];
  } catch (error) {
    console.error('Error in fetchStockNews:', error);
    throw error;
  }
}
