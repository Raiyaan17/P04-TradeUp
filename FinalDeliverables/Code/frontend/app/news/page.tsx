"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Search, ExternalLink } from "lucide-react";
import { AppShell } from "@/components/layout";
import { PageHeader, EmptyState } from "@/components/common";
import { NewsSkeletonLoader, NewsErrorCard, SentimentButton } from "@/components/news";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { http, ApiException } from "@/lib/http";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface NewsArticle {
  title: string;
  link: string;
  image?: string;
  content?: string;
  date: string;
}

interface StockNewsArticle {
  title: string;
  url: string;
  image_url?: string;
  description?: string;
  published_at: string;
}

interface LocalNewsArticle {
  title: string;
  link: string;
  pubDate: string;
  content?: string;
  contentSnippet?: string;
  source: string;
  category?: string;
}

interface SentimentAnalysisResponse {
  title: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  reasoning: string;
  keywords: string[];
}

export default function NewsPage() {
  const [activeTab, setActiveTab] = useState<'global' | 'local'>('global');
  const [generalArticles, setGeneralArticles] = useState<NewsArticle[]>([]);
  const [localArticles, setLocalArticles] = useState<LocalNewsArticle[]>([]);
  const [stockArticles, setStockArticles] = useState<StockNewsArticle[]>([]);
  const [searchTicker, setSearchTicker] = useState<string>("");
  const [lastSearchedTicker, setLastSearchedTicker] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [localLoading, setLocalLoading] = useState<boolean>(false);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [analyzingArticles, setAnalyzingArticles] = useState<Set<string>>(new Set());

  const handleSentimentAnalysis = async (articleTitle: string, e: React.MouseEvent): Promise<void> => {
    e.preventDefault(); // Prevent link navigation
    e.stopPropagation(); // Prevent event bubbling

    // Add this article to the analyzing set
    setAnalyzingArticles(prev => new Set(prev).add(articleTitle));

    try {
      // Send the news title to backend for sentiment analysis
      const response = await http.post<SentimentAnalysisResponse>('/news/sentiment-analysis', {
        title: articleTitle
      });

      // Display the sentiment analysis results
      const sentimentEmoji = {
        positive: '😊',
        negative: '😟',
        neutral: '😐'
      }[response.sentiment];

      // Show success toast with results
      toast.success(
        `${sentimentEmoji} Sentiment: ${response.sentiment.toUpperCase()}`,
        {
          description: `${response.reasoning}\nKeywords: ${response.keywords.join(', ')}`,
          duration: 8000,
        }
      );

    } catch (err) {
      console.error('Sentiment analysis failed:', err);
      toast.error('Failed to analyze sentiment', {
        description: 'Please try again later.',
      });
    } finally {
      // Remove this article from the analyzing set
      setAnalyzingArticles(prev => {
        const newSet = new Set(prev);
        newSet.delete(articleTitle);
        return newSet;
      });
    }
  };

  const loadLatestNews = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      setIsSearching(false);
      setStockArticles([]);

      const newsArticles = await http.get<NewsArticle[]>("/news/latest", { noAuth: true });
      setGeneralArticles(Array.isArray(newsArticles) ? newsArticles : []);
    } catch (err) {
      const message = err instanceof ApiException ? err.message : "Failed to load news";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLocalNews = useCallback(async (): Promise<void> => {
    try {
      setLocalLoading(true);
      setError(null);

      const localNewsArticles = await http.get<LocalNewsArticle[]>("/news/local", { noAuth: true });
      setLocalArticles(Array.isArray(localNewsArticles) ? localNewsArticles : []);
    } catch (err) {
      const message = err instanceof ApiException ? err.message : "Failed to load local news";
      setError(message);
    } finally {
      setLocalLoading(false);
    }
  }, []);

  const handleSearchNews = useCallback(async (ticker: string): Promise<void> => {
    if (!ticker.trim()) {
      loadLatestNews();
      return;
    }

    try {
      setSearchLoading(true);
      setError(null);
      setIsSearching(true);
      setLastSearchedTicker(ticker.toUpperCase());

      const searchedStockArticles = await http.post<StockNewsArticle[]>(
        "/news/stock",
        { ticker: ticker.toUpperCase() },
        { noAuth: true }
      );
      setStockArticles(Array.isArray(searchedStockArticles) ? searchedStockArticles : []);

      const latestNews = await http.get<NewsArticle[]>("/news/latest", { noAuth: true });
      setGeneralArticles(Array.isArray(latestNews) ? latestNews : []);
    } catch (err) {
      const message = err instanceof ApiException ? err.message : "Failed to load stock news";
      setError(message);
    } finally {
      setSearchLoading(false);
    }
  }, [loadLatestNews]);

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (searchTicker.trim()) {
      handleSearchNews(searchTicker);
    } else {
      loadLatestNews();
    }
  };

  useEffect(() => {
    loadLatestNews();
  }, [loadLatestNews]);

  useEffect(() => {
    if (activeTab === 'local' && localArticles.length === 0) {
      loadLocalNews();
    }
  }, [activeTab, localArticles.length, loadLocalNews]);

  return (
    <AppShell>
      <PageHeader
        title="Market News"
        description="Stay updated with the latest financial news"
      />

      {/* Tabs */}
      <div className="flex gap-4 mb-8 border-b border-border/50 max-w-2xl mx-auto">
        <button
          onClick={() => setActiveTab('global')}
          className={`pb-3 text-label-caps transition-colors ${activeTab === 'global'
            ? 'text-primary border-b-[3px] border-primary'
            : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          GLOBAL NEWS
        </button>
        <button
          onClick={() => setActiveTab('local')}
          className={`pb-3 text-label-caps transition-colors ${activeTab === 'local'
            ? 'text-primary border-b-[3px] border-primary'
            : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          LOCAL NEWS
        </button>
      </div>

      {/* Global News Tab */}
      {activeTab === 'global' && (
        <>
          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="mb-8">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  value={searchTicker}
                  onChange={(e) => setSearchTicker(e.target.value)}
                  placeholder="Search ticker (e.g., AAPL)"
                  className="pl-10"
                />
              </div>
              <Button type="submit" disabled={searchLoading}>
                {searchLoading ? "Searching..." : "Search"}
              </Button>
            </div>
          </form>

          {searchLoading && (
            <div className="flex items-center gap-2 text-sm text-primary mb-6">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Searching for {searchTicker.toUpperCase()}...
            </div>
          )}

          {loading && <NewsSkeletonLoader />}

          {!loading && error && (
            <NewsErrorCard error={error} onRetry={loadLatestNews} />
          )}

          {!loading && !error && (
            <div className="space-y-12 max-w-2xl mx-auto">
              {/* Stock-specific News */}
              {isSearching && stockArticles.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <h2 className="text-3xl font-semibold tracking-tight">{lastSearchedTicker} NEWS</h2>
                    <Badge variant="secondary" className="font-mono bg-primary/20 text-primary border-none">{stockArticles.length} ARTICLES</Badge>
                  </div>
                  <div className="grid gap-6">
                    {stockArticles.map((article, index) => (
                      <a
                        key={`stock-${index}-${article.title}`}
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group"
                      >
                        <div className="bg-card rounded-2xl border border-primary/20 hover:border-primary transition-all overflow-hidden flex flex-col md:flex-row shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
                          {article.image_url && (
                            <div className="w-full md:w-48 h-48 md:h-auto flex-shrink-0 overflow-hidden bg-muted">
                              <Image
                                src={article.image_url}
                                alt={article.title}
                                width={192}
                                height={144}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            </div>
                          )}
                          <div className="p-6 flex flex-col justify-between flex-1">
                            <div>
                              <div className="mb-3">
                                <Badge variant="secondary" className="text-label-caps tracking-widest border-none">STOCK UPDATE</Badge>
                              </div>
                              <h3 className="text-2xl font-semibold mb-3 group-hover:text-primary transition-colors line-clamp-2 leading-tight">
                                {article.title}
                              </h3>
                              {article.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                                  {article.description}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/50">
                              <span className="text-xs text-muted-foreground font-mono">
                                {formatDate(article.published_at)}
                              </span>
                              <div className="flex items-center gap-3">
                                <SentimentButton
                                  isAnalyzing={analyzingArticles.has(article.title)}
                                  onAnalyze={(e) => handleSentimentAnalysis(article.title, e)}
                                />
                                <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* General News */}
              <div>
                <h2 className="text-3xl font-semibold mb-6 tracking-tight">
                  {isSearching ? "GENERAL NEWS" : "LATEST UPDATES"}
                </h2>
                {generalArticles.length === 0 ? (
                  <EmptyState variant="news" />
                ) : (
                  <div className="grid gap-6">
                    {generalArticles.map((article, index) => (
                      <a
                        key={`general-${index}-${article.title}`}
                        href={article.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group"
                      >
                        <div className={cn(
                          "rounded-2xl transition-all overflow-hidden flex flex-col md:flex-row shadow-[0_4px_24px_rgba(0,0,0,0.2)]",
                          index === 0 ? "bg-card border border-primary hover:shadow-[0_0_20px_rgba(74,142,255,0.15)]" : "bg-card border border-transparent hover:border-border"
                        )}>
                          {article.image && (
                            <div className="w-full md:w-48 h-48 md:h-auto flex-shrink-0 overflow-hidden bg-muted">
                              <Image
                                src={article.image}
                                alt={article.title}
                                width={192}
                                height={144}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = "none";
                                }}
                              />
                            </div>
                          )}
                          <div className="p-6 flex flex-col justify-between flex-1">
                            <div>
                              <div className="mb-3">
                                <Badge variant="secondary" className="text-label-caps tracking-widest border-none">MARKET NEWS</Badge>
                              </div>
                              <h3 className="text-2xl font-semibold mb-3 group-hover:text-primary transition-colors line-clamp-2 leading-tight">
                                {article.title}
                              </h3>
                              {article.content && (
                                <div
                                  className="text-sm text-muted-foreground line-clamp-2 leading-relaxed"
                                  dangerouslySetInnerHTML={{ __html: article.content }}
                                />
                              )}
                            </div>
                            <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/50">
                              <span className="text-xs text-muted-foreground font-mono">
                                {formatDate(article.date)}
                              </span>
                              <div className="flex items-center gap-3">
                                <SentimentButton
                                  isAnalyzing={analyzingArticles.has(article.title)}
                                  onAnalyze={(e) => handleSentimentAnalysis(article.title, e)}
                                />
                                <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Local News Tab */}
      {activeTab === 'local' && (
        <>
          {localLoading && <NewsSkeletonLoader />}

          {!localLoading && error && (
            <NewsErrorCard error={error} onRetry={loadLocalNews} />
          )}

          {!localLoading && !error && localArticles.length === 0 && (
            <EmptyState variant="news" />
          )}

          {!localLoading && !error && localArticles.length > 0 && (
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-3xl font-semibold tracking-tight">DAWN BUSINESS NEWS</h2>
                <Badge variant="secondary" className="font-mono bg-primary/20 text-primary border-none">{localArticles.length} ARTICLES</Badge>
              </div>
              <div className="grid gap-6">
                {localArticles.map((article, index) => (
                  <a
                    key={`local-${index}-${article.title}`}
                    href={article.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group"
                  >
                    <div className="bg-card rounded-2xl border border-transparent hover:border-border transition-all overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
                      <div className="p-6">
                        <div>
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <Badge variant="secondary" className="text-label-caps tracking-widest border-none">LOCAL UPDATE</Badge>
                            <Badge variant="outline" className="flex-shrink-0 text-[10px] font-mono border-border text-muted-foreground">
                              {article.source}
                            </Badge>
                          </div>
                          <h3 className="text-2xl font-semibold mb-3 group-hover:text-primary transition-colors line-clamp-2 leading-tight">
                            {article.title}
                          </h3>
                          {article.contentSnippet && (
                            <p className="text-sm text-muted-foreground line-clamp-3 mb-6 leading-relaxed">
                              {article.contentSnippet}
                            </p>
                          )}
                          <div className="flex items-center justify-between pt-4 border-t border-border/50">
                            <span className="text-xs text-muted-foreground font-mono">
                              {formatDate(article.pubDate)}
                            </span>
                            <div className="flex items-center gap-3">
                              <SentimentButton
                                isAnalyzing={analyzingArticles.has(article.title)}
                                onAnalyze={(e) => handleSentimentAnalysis(article.title, e)}
                              />
                              <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
