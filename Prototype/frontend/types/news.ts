export interface NewsArticle {
  title: string;
  text: string;
  link: string;
  image: string;
  publishedDate: string;
  updatedDate?: string;
}

export interface StockNewsArticle {
  title: string;
  description: string;
  published_at: string;
  updated_at: string;
  url: string;
  image_url: string;
  source: {
    name: string;
    domain: string;
  };
}

export interface NewsResponse {
  articles: NewsArticle[];
}

export interface StockNewsResponse {
  data: StockNewsArticle[];
}
