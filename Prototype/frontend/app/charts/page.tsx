'use client';

import { useEffect, useState, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { createChart, IChartApi, ISeriesApi, UTCTimestamp, ColorType, CrosshairMode } from 'lightweight-charts';
import { Activity, Building2, LineChart, Plus, Minus, TrendingUp, TrendingDown } from "lucide-react";
import { AppShell } from "@/components/layout";
import { PageHeader } from "@/components/common";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { http, ApiException } from "@/lib/http";
import { formatDecimal, formatPercent, formatVolume } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SellJournalInput, type SellReasonType } from "@/components/portfolio/SellJournalInput";
import { parseKlines, Candle, calculateSMA, calculateLatestSMA } from "@/lib/chartUtils";
import { useTheme } from "next-themes";
import { toast } from "sonner";

interface TickOHLC {
  o: number;
  h: number;
  l: number;
  c: number;
  v?: number; // Volume might be provided in websockets
  val?: number; // Value
  chg?: number;
  chgPct?: number;
}

interface TickData {
  symbol: string;
  source: string;
  timestamp: number;
  tick: TickOHLC;
}

type CandleData = Candle;

interface MarketStatus {
  isConnected: boolean;
  isMarketClosed: boolean;
  lastUpdateTime: number | null;
}



interface CompanyProfile {
  businessDescription: string;
  keyPeople: { name: string; position: string }[];
  financialStats?: {
    shares?: {
      raw: string;
      numeric: number;
    };
  };
}

interface Fundamentals {
  sector: string;
  marketCap: string;
  peRatio: number;
  dividendYield: number;
  freeFloat: string;
}

interface PortfolioItem {
  symbol: string;
  quantity: number;
}

interface PortfolioData {
  balance: string;
  portfolio: PortfolioItem[];
}

const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || (isLocalhost ? 'http://localhost:3001/api' : 'https://tradeup-syai.onrender.com/api');
// WS_URL must point to the socket server root (no /api prefix — Socket.IO namespaces are separate from REST routes)
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || (isLocalhost ? 'http://localhost:3001' : 'https://tradeup-syai.onrender.com');
const CANDLE_INTERVAL = 1 * 60 * 1000;
const MARKET_CLOSED_TIMEOUT = 5000;

const TIMEFRAMES = [
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
  { label: '15m', value: '15m' },
  { label: '1h', value: '1h' },
  { label: '4h', value: '4h' },
  { label: '1d', value: '1d' },
];

export default function Charts() {
  const { resolvedTheme } = useTheme();
  const [tickData, setTickData] = useState<TickData | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const sma50SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const sma200SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const [currentCandle, setCurrentCandle] = useState<CandleData | null>(null);
  const [stock, setStock] = useState<string>('');
  const [timeframe, setTimeframe] = useState<string>('1d'); // Default to 1d as in mockup
  const [historicalData, setHistoricalData] = useState<CandleData[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const hasReceivedTickRef = useRef<boolean>(false);

  // Company Profile states
  const [companyData, setCompanyData] = useState<CompanyProfile | null>(null);
  const [fundamentalsData, setFundamentalsData] = useState<Fundamentals | null>(null);
  const [isLoadingCompany, setIsLoadingCompany] = useState<boolean>(false);

  const marketCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [marketStatus, setMarketStatus] = useState<MarketStatus>({
    isConnected: false,
    lastUpdateTime: null,
    isMarketClosed: false
  });

  // Active module selection (Chart vs Company)
  const [activeModule, setActiveModule] = useState<'chart' | 'company'>('chart');

  // Trade quantities 
  const [buyQuantity, setBuyQuantity] = useState<number>(1);
  const [sellQuantity, setSellQuantity] = useState<number>(1);

  // Custom Overlays
  const [showSMA50, setShowSMA50] = useState<boolean>(true);
  const [showSMA200, setShowSMA200] = useState<boolean>(true);

  // Submission states
  const [isSubmittingBuy, setIsSubmittingBuy] = useState<boolean>(false);
  const [isSubmittingSell, setIsSubmittingSell] = useState<boolean>(false);

  // Sell journal state
  const [sellReason, setSellReason] = useState<SellReasonType | null>(null);
  const [sellNote, setSellNote] = useState('');
  const [sellDialogOpen, setSellDialogOpen] = useState(false);

  // Portfolio data
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);

  // Handle URL parameters for initial symbol selection
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const symbolParam = params.get('symbol');
      if (symbolParam && symbolParam !== stock) {
        setStock(symbolParam);
      }
    }
  }, [stock]);

  const getCandleStartTime = useCallback((timestamp: number) => {
    return Math.floor(timestamp / CANDLE_INTERVAL) * CANDLE_INTERVAL;
  }, []);

  const initializeChart = useCallback(() => {
    if (!chartContainerRef.current || chartRef.current) return;

    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#9ca3af' : '#4b5563'; // gray-400 : gray-600
    const gridColor = isDark ? '#374151' : '#e5e7eb'; // gray-700 : gray-200

    // Use our app's Tailwind colors for the chart
    // Background: transparent so it blends with the Card
    // Grid/Text: muted foregrounds
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 500,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: textColor,
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: gridColor,
        rightOffset: 12,
        barSpacing: 10,
        fixLeftEdge: false,
        fixRightEdge: false,
        lockVisibleTimeRangeOnResize: false,
      },
      rightPriceScale: {
        borderColor: gridColor,
        autoScale: true,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: 'rgba(156, 163, 175, 0.5)', // gray-400 with opacity
          width: 1,
          style: 1, // LineStyle.Dotted
          labelBackgroundColor: '#374151', // gray-700
        },
        horzLine: {
          color: 'rgba(156, 163, 175, 0.5)',
          width: 1,
          style: 1, // LineStyle.Dotted
          labelBackgroundColor: '#374151',
        },
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: false, // Must be false so trackpad scroll pans instead of zooms
        pinch: true,
      },
      // @ts-expect-error - kinetics option types are missing in this version
      kinetics: {
        bottom: true,
        left: true,
      },
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#22c55e', // text-emerald-500
      downColor: '#ef4444', // text-rose-500
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    candlestickSeriesRef.current = candlestickSeries;

    const volumeSeries = chart.addHistogramSeries({
      color: '#26a69a',
      priceFormat: { type: 'volume' },
      priceScaleId: '', // Set as an overlay by using an empty priceScaleId
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8, // highest point of the series will be at 80% of the chart height
        bottom: 0,
      },
    });
    volumeSeriesRef.current = volumeSeries;

    const sma50Series = chart.addLineSeries({
      color: '#3B82F6', // Blue for 50 SMA
      lineWidth: 2,
      title: '50 SMA',
      visible: showSMA50,
    });
    sma50SeriesRef.current = sma50Series;

    const sma200Series = chart.addLineSeries({
      color: '#F97316', // Orange for 200 SMA
      lineWidth: 2,
      title: '200 SMA',
      visible: showSMA200,
    });
    sma200SeriesRef.current = sma200Series;

    chartRef.current = chart;

    const resizeObserver = new ResizeObserver(() => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    });

    if (chartContainerRef.current) {
      resizeObserver.observe(chartContainerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedTheme]); // showSMA50/showSMA200 intentionally omitted — toggling them via applyOptions, not re-creating the chart

  // Update SMA visibilities when states change
  useEffect(() => {
    if (sma50SeriesRef.current) sma50SeriesRef.current.applyOptions({ visible: showSMA50 });
  }, [showSMA50]);

  useEffect(() => {
    if (sma200SeriesRef.current) sma200SeriesRef.current.applyOptions({ visible: showSMA200 });
  }, [showSMA200]);

  // Update chart colors when theme changes dynamically
  useEffect(() => {
    if (chartRef.current) {
      const isDark = resolvedTheme === 'dark';
      const textColor = isDark ? '#9ca3af' : '#4b5563';
      const gridColor = isDark ? '#374151' : '#e5e7eb';

      chartRef.current.applyOptions({
        layout: {
          textColor: textColor,
        },
        grid: {
          vertLines: { color: gridColor },
          horzLines: { color: gridColor },
        },
        timeScale: {
          borderColor: gridColor,
        },
        rightPriceScale: {
          borderColor: gridColor,
        },
      });
    }
  }, [resolvedTheme]);

  const setChartContainerEl = useCallback((el: HTMLDivElement | null) => {
    chartContainerRef.current = el;

    if (el && !chartRef.current) {
      console.log('Mounting Chart Container - Turbopack Cache Bust');
      initializeChart();
    }
  }, [initializeChart]);

  const fetchHistoricalData = useCallback(async (symbol: string, tf: string, signal?: AbortSignal) => {
    try {
      setIsLoadingHistory(true);
      setHistoricalData([]);
      if (candlestickSeriesRef.current) candlestickSeriesRef.current.setData([]);
      if (volumeSeriesRef.current) volumeSeriesRef.current.setData([]);
      if (sma50SeriesRef.current) sma50SeriesRef.current.setData([]);
      if (sma200SeriesRef.current) sma200SeriesRef.current.setData([]);

      const result = await http.get<{ data: unknown[] }>(
        `/stocks/${encodeURIComponent(symbol)}/klines/${tf}?limit=100`,
        { noAuth: true, signal }
      );

      if (signal?.aborted) return;

      if (result && result.data && Array.isArray(result.data)) {
        const parsedData = parseKlines(result.data);

        // Deduplicate initial parsedData before feeding it to chart API to prevent duplicate-time hard crashes 
        const uniqueData = parsedData.reduce((acc: Candle[], candle) => {
          const existingIndex = acc.findIndex(c => c.time === candle.time);
          if (existingIndex >= 0) acc[existingIndex] = candle;
          else acc.push(candle);
          return acc;
        }, []);

        setHistoricalData(uniqueData);

        if (candlestickSeriesRef.current) {
          const chartData = uniqueData.map(candle => ({
            time: candle.time as UTCTimestamp,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
          }));
          candlestickSeriesRef.current.setData(chartData);
        }

        if (volumeSeriesRef.current) {
          const volumeData = uniqueData.map(c => ({
            time: c.time as UTCTimestamp,
            value: c.volume || 0,
            color: c.close >= c.open ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)', // Match current green/red with opacity
          }));
          volumeSeriesRef.current.setData(volumeData);
        }

        if (sma50SeriesRef.current) {
          const sma50Data = calculateSMA(uniqueData, 50).map(d => ({ time: d.time as UTCTimestamp, value: d.value }));
          sma50SeriesRef.current.setData(sma50Data);
        }

        if (sma200SeriesRef.current) {
          const sma200Data = calculateSMA(uniqueData, 200).map(d => ({ time: d.time as UTCTimestamp, value: d.value }));
          sma200SeriesRef.current.setData(sma200Data);
        }

        // Force WebAssembly engine to snap camera viewport back onto the active dataset
        // Prevents small timeframe vectors from vanishing outside macro viewport edges.
        if (chartRef.current) {
          chartRef.current.timeScale().fitContent();
        }
      } else {
        setHistoricalData([]);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      if (signal?.aborted) return;
      console.error('Failed to fetch historical data:', error);
      setHistoricalData([]);
    } finally {
      if (!signal?.aborted) {
        setIsLoadingHistory(false);
      }
    }
  }, []);

  const fetchCompanyData = useCallback(async (symbol: string, signal?: AbortSignal) => {
    setIsLoadingCompany(true);
    try {
      const [companyRes, fundRes] = await Promise.all([
        http.get<{ data: CompanyProfile }>(`/stocks/${encodeURIComponent(symbol)}/company`, { noAuth: true, signal }),
        http.get<{ data: Fundamentals }>(`/stocks/${encodeURIComponent(symbol)}/fundamentals`, { noAuth: true, signal })
      ]);

      if (signal?.aborted) return;

      if (companyRes?.data) setCompanyData(companyRes.data);
      else setCompanyData(null);

      if (fundRes?.data) setFundamentalsData(fundRes.data);
      else setFundamentalsData(null);
    } catch (error) {
      console.error('Failed to fetch company data:', error);
      setCompanyData(null);
      setFundamentalsData(null);
    } finally {
      setIsLoadingCompany(false);
    }
  }, []);

  interface RestTickResponse {
    tick: {
      open?: number; high?: number; low?: number; price?: number;
      volume?: number; value?: number; change?: number; changePercent?: number; timestamp?: number;
    } | null;
  }

  const fetchInitialTick = useCallback(async (symbol: string) => {
    try {
      const res = await http.get<RestTickResponse>(`/stocks/${encodeURIComponent(symbol)}`, { noAuth: true });
      if (res?.tick) {
        // Map REST response (long keys) to WebSocket format (short keys) so the rest of the app works seamlessly
        const mappedTick: TickOHLC = {
          o: res.tick.open || 0,
          h: res.tick.high || 0,
          l: res.tick.low || 0,
          c: res.tick.price || 0,
          v: res.tick.volume || 0,
          val: res.tick.value || 0,
          chg: res.tick.change || 0,
          chgPct: res.tick.changePercent || 0,
        };
        setTickData({
          symbol: symbol, // Add symbol
          source: 'REST', // Add source
          tick: mappedTick,
          timestamp: res.tick.timestamp ? res.tick.timestamp * 1000 : Date.now()
        });
        hasReceivedTickRef.current = true;
      }
    } catch (error) {
      console.error('Failed to fetch initial tick:', error);
    }
  }, []);



  const connectWebSocket = useCallback((symbol: string) => {
    if (socketRef.current) {
      socketRef.current.close();
    }

    const socket: Socket = io(`${WS_URL}/ws`, {
      withCredentials: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      autoConnect: true,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setMarketStatus(prev => ({
        ...prev,
        isConnected: true,
        lastUpdateTime: prev.lastUpdateTime
      }));
      socket.emit("subscribeSymbol", symbol);
    });

    socket.on('disconnect', () => {
      setMarketStatus(prev => ({
        ...prev,
        isConnected: false
      }));
    });

    socket.on("tickUpdate", (data: TickData) => {
      hasReceivedTickRef.current = true;
      setTickData(data);
      setMarketStatus(prev => ({
        ...prev,
        lastUpdateTime: Date.now(),
        isMarketClosed: false
      }));

      const tick = data.tick;
      if (!tick) return;

      const tickTime = data.timestamp || Date.now();
      const candleStartTime = getCandleStartTime(tickTime);
      const candleTimeInSeconds = Math.floor(candleStartTime / 1000);

      setCurrentCandle((prev) => {
        let newCandle;
        if (!prev || prev.time !== candleTimeInSeconds) {
          if (prev && prev.time !== candleTimeInSeconds) {
            setHistoricalData(oldData => {
              const exists = oldData.some(candle => candle.time === prev.time);
              if (!exists) {
                return [...oldData, prev];
              }
              return oldData;
            });
          }

          newCandle = {
            time: candleTimeInSeconds,
            open: tick.o,
            high: tick.h,
            low: tick.l,
            close: tick.c,
            volume: tick.v ?? 0,
          };
        } else {
          newCandle = {
            ...prev,
            high: Math.max(prev.high, tick.h),
            low: Math.min(prev.low, tick.l),
            close: tick.c,
            volume: tick.v ?? prev.volume ?? 0,
          };
        }

        // Send tick directly to the chart to append/update the last candle
        if (candlestickSeriesRef.current) {
          candlestickSeriesRef.current.update({
            time: newCandle.time as UTCTimestamp,
            open: newCandle.open,
            high: newCandle.high,
            low: newCandle.low,
            close: newCandle.close,
          });
        }

        if (volumeSeriesRef.current) {
          volumeSeriesRef.current.update({
            time: newCandle.time as UTCTimestamp,
            value: newCandle.volume || 0,
            color: newCandle.close >= newCandle.open ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)'
          });
        }

        // Live recalculate SMA lines
        // For SMA, we need to consider if we have enough historical data. Since performance is critical, 
        // we use a utility method to parse the rolling buffer directly.

        if (sma50SeriesRef.current && showSMA50) {
          setHistoricalData(hData => {
            const nextSMA50 = calculateLatestSMA(hData, newCandle as Candle, 50);
            if (nextSMA50 !== null) {
              sma50SeriesRef.current!.update({ time: newCandle.time as UTCTimestamp, value: nextSMA50 });
            }
            return hData; // React state setter safely accesses state without triggering redraw if we return unchanged
          });
        }

        if (sma200SeriesRef.current && showSMA200) {
          setHistoricalData(hData => {
            const nextSMA200 = calculateLatestSMA(hData, newCandle as Candle, 200);
            if (nextSMA200 !== null) {
              sma200SeriesRef.current!.update({ time: newCandle.time as UTCTimestamp, value: nextSMA200 });
            }
            return hData;
          });
        }

        return newCandle;
      });
    });
  }, [getCandleStartTime, showSMA50, showSMA200]);

  const fetchPortfolio = useCallback(async () => {
    try {
      const data = await http.get<PortfolioData>('/trades/portfolio');
      setPortfolioData(data);
    } catch (err) {
      console.error("Failed to fetch portfolio:", err);
    }
  }, []);

  const handleBuySubmit = async () => {
    if (!stock || buyQuantity <= 0 || isSubmittingBuy) return;

    try {
      setIsSubmittingBuy(true);
      await http.post("/trades/buy", {
        symbol: stock,
        quantity: buyQuantity,
      });
      toast.success(`Successfully bought ${buyQuantity} shares of ${stock}!`);
      setBuyQuantity(1); // Reset after successful buy
      fetchPortfolio(); // Refresh holdings
    } catch (err) {
      const message = err instanceof ApiException ? err.message : "Failed to place buy order. Please try again.";
      toast.error(message);
    } finally {
      setIsSubmittingBuy(false);
    }
  };

  const handleSellSubmit = async () => {
    if (!stock || sellQuantity <= 0 || isSubmittingSell) return;

    try {
      setIsSubmittingSell(true);
      await http.post("/trades/sell", {
        symbol: stock,
        quantity: sellQuantity,
        ...(sellReason ? { sellReason } : {}),
        ...(sellNote.trim() ? { sellNote: sellNote.trim() } : {}),
      });
      toast.success(`Successfully sold ${sellQuantity} shares of ${stock}!`);
      setSellQuantity(1);
      setSellReason(null);
      setSellNote('');
      setSellDialogOpen(false);
      fetchPortfolio();
    } catch (err) {
      const message = err instanceof ApiException ? err.message : "Failed to place sell order. Please try again.";
      toast.error(message);
    } finally {
      setIsSubmittingSell(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
    initializeChart();
    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [initializeChart, fetchPortfolio]);

  useEffect(() => {
    const abortController = new AbortController();

    if (!stock) return;

    setCurrentCandle(null);
    setTickData(null);
    setCompanyData(null);
    setFundamentalsData(null);
    hasReceivedTickRef.current = false;

    // Initial fetch
    fetchHistoricalData(stock, timeframe, abortController.signal);
    fetchCompanyData(stock, abortController.signal);
    fetchInitialTick(stock);
    connectWebSocket(stock);

    if (marketCheckIntervalRef.current) {
      clearInterval(marketCheckIntervalRef.current);
    }

    marketCheckIntervalRef.current = setInterval(() => {
      setMarketStatus(prev => {
        const timeSinceLastUpdate = prev.lastUpdateTime ? Date.now() - prev.lastUpdateTime : 0;
        const shouldMarkClosed = prev.isConnected &&
          hasReceivedTickRef.current &&
          prev.lastUpdateTime !== null &&
          timeSinceLastUpdate > MARKET_CLOSED_TIMEOUT;

        return {
          ...prev,
          isMarketClosed: shouldMarkClosed
        };
      });
    }, 1000);

    return () => {
      abortController.abort();
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      if (marketCheckIntervalRef.current) {
        clearInterval(marketCheckIntervalRef.current);
      }
    };
  }, [stock, timeframe, connectWebSocket, fetchHistoricalData, fetchCompanyData, fetchInitialTick]);



  // Derive stats for top bar
  // Ideally this comes from a dedicated 24h ticker API. For now, use the current tick or fallback
  const currentPrice = currentCandle?.close ?? tickData?.tick?.c ?? (historicalData.length > 0 ? historicalData[historicalData.length - 1].close : 0);
  const changeAmt = tickData?.tick?.chg ?? tickData?.tick?.change ?? 0;
  const changePct = tickData?.tick?.chgPct ?? tickData?.tick?.percentChange ?? 0;
  const isPositive = changeAmt >= 0;

  // Calculate mock 24h stats from historical data if 24h ticker isn't providing it yet
  const high24h = tickData?.tick?.h ?? tickData?.tick?.high ?? (historicalData.length > 0 ? Math.max(...historicalData.slice(-24).map(c => c.high)) : 0);
  const low24h = tickData?.tick?.l ?? tickData?.tick?.low ?? (historicalData.length > 0 ? Math.min(...historicalData.slice(-24).map(c => c.low)) : 0);
  const vol24h = tickData?.tick?.v ?? tickData?.tick?.volume ?? 0;
  const value24h = tickData?.tick?.val ?? tickData?.tick?.value ?? 0;

  const getStatusVariant = (): "default" | "secondary" | "success" | "warning" | "error" => {
    if (isLoadingHistory) return "warning";
    if (!marketStatus.isConnected) return "warning";
    if (marketStatus.isMarketClosed) return "error";
    if (tickData) return "success";
    return "secondary";
  };

  const getStatusText = () => {
    if (isLoadingHistory) return "Loading data...";
    if (!marketStatus.isConnected) return "Connecting...";
    if (!hasReceivedTickRef.current) return "Connected - waiting for data...";
    if (marketStatus.isMarketClosed) return "Market Closed";
    if (tickData) return "Live - Market Open";
    return "Waiting...";
  };

  return (
    <AppShell requireAuth={false}>
      <PageHeader
        title="Asset Analysis"
        description="Advanced charting and market statistics"
        actions={
          <Badge variant={getStatusVariant()}>
            <Activity className="mr-1 h-3 w-3" />
            {getStatusText()}
          </Badge>
        }
      />

      <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto">

        {/* Top Header Banner */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{stock}</h1>
            <Badge variant="secondary" className="font-mono bg-muted/50 rounded-sm">REG</Badge>
          </div>

          <div className="flex flex-col sm:flex-row items-baseline gap-6 border-b border-border pb-6">
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-semibold tabular-nums tracking-tight">
                {currentPrice > 0 ? formatDecimal(currentPrice) : '---'}
              </span>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "font-mono rounded-sm border-transparent px-2 py-0.5 text-sm",
                    isPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                  )}
                >
                  {formatPercent(changePct)}
                </Badge>
                <span className={cn(
                  "text-sm font-medium tabular-nums",
                  isPositive ? "text-emerald-500" : "text-rose-500"
                )}>
                  {isPositive ? '+' : ''}{formatDecimal(changeAmt)}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-8 sm:ml-auto">
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1 uppercase tracking-wider">24h High</p>
                <p className="font-mono text-sm">{high24h > 0 ? formatDecimal(high24h) : '---'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1 uppercase tracking-wider">24h Low</p>
                <p className="font-mono text-sm">{low24h > 0 ? formatDecimal(low24h) : '---'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1 uppercase tracking-wider">24h Vol</p>
                <p className="font-mono text-sm">{vol24h > 0 ? formatVolume(vol24h) : '---'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1 uppercase tracking-wider">24h Value</p>
                <p className="font-mono text-sm">{value24h > 0 ? formatVolume(value24h) : '---'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Blocks */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card
            className={cn(
              "cursor-pointer transition-colors hover:bg-muted/50",
              activeModule === 'chart' ? "border-primary shadow-sm" : "border-transparent bg-secondary/30"
            )}
            onClick={() => setActiveModule('chart')}
          >
            <CardContent className="flex flex-col items-center justify-center p-6 gap-2">
              <LineChart className={cn("h-6 w-6", activeModule === 'chart' ? "text-primary" : "text-muted-foreground")} />
              <div className="text-center">
                <p className={cn("font-medium", activeModule === 'chart' ? "text-foreground" : "text-muted-foreground")}>Chart</p>
                <p className="text-xs text-muted-foreground">{timeframe} Timeframe</p>
              </div>
            </CardContent>
          </Card>

          <Card
            className={cn(
              "cursor-pointer transition-colors hover:bg-muted/50",
              activeModule === 'company' ? "border-primary shadow-sm" : "border-transparent bg-secondary/30"
            )}
            onClick={() => setActiveModule('company')}
          >
            <CardContent className="flex flex-col items-center justify-center p-6 gap-2">
              <Building2 className={cn("h-6 w-6", activeModule === 'company' ? "text-primary" : "text-muted-foreground")} />
              <div className="text-center">
                <p className={cn("font-medium", activeModule === 'company' ? "text-foreground" : "text-muted-foreground")}>Company</p>
                <p className="text-xs text-muted-foreground">Profile Available</p>
              </div>
            </CardContent>
          </Card>

          {/* Buy Card */}
          <Card className="border-emerald-500/20 bg-emerald-500/5 transition-colors hover:bg-emerald-500/10">
            <CardContent className="flex flex-col items-center justify-between p-4 h-full gap-3">
              <div className="flex flex-col w-full gap-2 mb-1">
                <div className="flex items-center w-full justify-between">
                  <span className="font-semibold text-emerald-500 flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" /> Buy {stock}
                  </span>
                  <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 bg-emerald-500/10 text-[10px] px-1.5 font-mono">
                    {currentPrice > 0 ? formatDecimal(currentPrice) : '---'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Buying Power</span>
                  <span className="font-mono text-emerald-500">PKR {portfolioData ? formatDecimal(parseFloat(portfolioData.balance)) : '---'}</span>
                </div>
              </div>

              <div className="flex items-center w-full gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-colors"
                  onClick={() => setBuyQuantity(Math.max(1, buyQuantity - 1))}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <Input
                  type="number"
                  min={1}
                  value={buyQuantity}
                  onChange={(e) => setBuyQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="h-8 text-center font-mono border-emerald-500/30 focus-visible:ring-emerald-500"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-colors"
                  onClick={() => setBuyQuantity(buyQuantity + 1)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>

              <Button
                className="w-full h-8 bg-emerald-500 hover:bg-emerald-600 text-white font-medium shadow-none transition-colors"
                onClick={handleBuySubmit}
                disabled={isSubmittingBuy}
              >
                {isSubmittingBuy ? "Processing..." : "Execute Buy"}
              </Button>
            </CardContent>
          </Card>

          {/* Sell Card */}
          <Card className="border-rose-500/20 bg-rose-500/5 transition-colors hover:bg-rose-500/10">
            <CardContent className="flex flex-col items-center justify-between p-4 h-full gap-3">
              <div className="flex flex-col w-full gap-2 mb-1">
                <div className="flex items-center w-full justify-between">
                  <span className="font-semibold text-rose-500 flex items-center gap-1">
                    <TrendingDown className="w-4 h-4" /> Sell {stock}
                  </span>
                  <Badge variant="outline" className="text-rose-500 border-rose-500/30 bg-rose-500/10 text-[10px] px-1.5 font-mono">
                    {currentPrice > 0 ? formatDecimal(currentPrice) : '---'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Available</span>
                  <button
                    onClick={() => {
                      const avail = portfolioData?.portfolio.find(p => p.symbol === stock)?.quantity || 0;
                      if (avail > 0) setSellQuantity(avail);
                    }}
                    className="font-mono text-rose-500 hover:underline transition-all"
                  >
                    {portfolioData?.portfolio.find(p => p.symbol === stock)?.quantity || 0} Shares
                  </button>
                </div>
              </div>

              <div className="flex items-center w-full gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 border-rose-500/30 text-rose-500 hover:bg-rose-500 hover:text-white transition-colors"
                  onClick={() => setSellQuantity(Math.max(1, sellQuantity - 1))}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <Input
                  type="number"
                  min={1}
                  value={sellQuantity}
                  onChange={(e) => setSellQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="h-8 text-center font-mono border-rose-500/30 focus-visible:ring-rose-500"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 border-rose-500/30 text-rose-500 hover:bg-rose-500 hover:text-white transition-colors"
                  onClick={() => setSellQuantity(sellQuantity + 1)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>

              <Button
                className="w-full h-8 bg-rose-500 hover:bg-rose-600 text-white font-medium shadow-none transition-colors"
                onClick={() => {
                  setSellReason(null);
                  setSellNote('');
                  setSellDialogOpen(true);
                }}
                disabled={isSubmittingSell}
              >
                Sell
              </Button>
            </CardContent>
          </Card>

          {/* Sell Confirmation & Journaling Dialog */}
          <Dialog open={sellDialogOpen} onOpenChange={setSellDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Confirm Sale</DialogTitle>
                <DialogDescription>
                  You are about to sell {sellQuantity} shares of {stock} at market price.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <SellJournalInput
                  sellReason={sellReason}
                  onReasonChange={setSellReason}
                  sellNote={sellNote}
                  onNoteChange={setSellNote}
                  compact
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSellDialogOpen(false)} disabled={isSubmittingSell}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleSellSubmit}
                  disabled={isSubmittingSell}
                >
                  {isSubmittingSell ? "Processing..." : "Confirm Sell"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Main Content Area */}
        <Card className={cn("flex flex-col overflow-hidden border-border bg-card", activeModule !== 'chart' && "hidden")}>
          {/* Chart Toolbar */}
          <div className="flex items-center justify-between p-2 border-b border-border/50 bg-secondary/20 overflow-x-auto">
            <div className="flex items-center gap-1 shrink-0">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf.value}
                  onClick={() => setTimeframe(tf.value)}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium transition-colors rounded-md",
                    timeframe === tf.value
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {tf.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4 shrink-0 mx-4">
              <div
                className="flex items-center space-x-2 border-l border-border/50 pl-4"
                title="Price above 50 SMA = short-term uptrend"
              >
                <Checkbox
                  id="sma50"
                  checked={showSMA50}
                  onCheckedChange={(c: boolean | "indeterminate") => setShowSMA50(c === true)}
                />
                <label
                  htmlFor="sma50"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-blue-500 cursor-pointer"
                >
                  50 SMA
                </label>
              </div>

              <div
                className="flex items-center space-x-2"
                title="200 SMA acts as a long-term baseline"
              >
                <Checkbox
                  id="sma200"
                  checked={showSMA200}
                  onCheckedChange={(c: boolean | "indeterminate") => setShowSMA200(c === true)}
                />
                <label
                  htmlFor="sma200"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-orange-500 cursor-pointer"
                >
                  200 SMA
                </label>
              </div>
            </div>
          </div>

          {/* Chart Container */}
          <CardContent className="p-0 relative">
            {isLoadingHistory && historicalData.length === 0 && (
              <div className="absolute inset-0 z-10 flex flex-col gap-4 items-center justify-center bg-card/80 backdrop-blur-sm">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-muted-foreground font-medium">Loading chart data...</p>
              </div>
            )}
            <div
              ref={setChartContainerEl}
              className="w-full h-[500px]"
            />
          </CardContent>
        </Card>

        <div className={cn("flex flex-col gap-6", activeModule !== 'company' && "hidden")}>
          {isLoadingCompany ? (
            <Card className="border-border">
              <CardContent className="p-12 flex items-center justify-center text-muted-foreground flex-col gap-4">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p>Loading company profile for {stock}...</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Description & People */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                  <Card className="border-border">
                    <CardContent className="p-6">
                      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-primary" />
                        About {stock}
                      </h2>
                      {companyData ? (
                        <p className="text-muted-foreground leading-relaxed text-sm">
                          {companyData.businessDescription}
                        </p>
                      ) : (
                        <p className="text-muted-foreground italic text-sm">No business description available.</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-border">
                    <CardContent className="p-6">
                      <h2 className="text-xl font-semibold mb-4">Executive Leadership</h2>
                      {companyData?.keyPeople && companyData.keyPeople.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {companyData.keyPeople.map((person, idx) => (
                            <div key={idx} className="flex flex-col p-3 bg-secondary/20 rounded-lg border border-border/50">
                              <span className="font-medium text-foreground">{person.name}</span>
                              <span className="text-xs text-muted-foreground mt-0.5">{person.position}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground italic text-sm">Leadership details not available.</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column: Fundamentals */}
                <div className="flex flex-col gap-6">
                  <Card className="border-border h-full">
                    <CardContent className="p-6 flex flex-col h-full">
                      <h2 className="text-xl font-semibold mb-4 line-clamp-1">Fundamentals</h2>
                      {fundamentalsData ? (
                        <div className="grid grid-cols-1 gap-y-4 flex-grow">
                          <div className="flex justify-between items-center py-2 border-b border-border/50">
                            <span className="text-sm text-muted-foreground">Market Cap</span>
                            <span className="text-sm font-medium font-mono">{fundamentalsData.marketCap || '---'}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-border/50">
                            <span className="text-sm text-muted-foreground">Outstanding Shares</span>
                            <span className="text-sm font-medium font-mono">{companyData?.financialStats?.shares?.raw || '---'}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-border/50">
                            <span className="text-sm text-muted-foreground">P/E Ratio</span>
                            <span className="text-sm font-medium font-mono">
                              {fundamentalsData.peRatio ? formatDecimal(fundamentalsData.peRatio) : '---'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-2">
                            <span className="text-sm text-muted-foreground">Free Float</span>
                            <span className="text-sm font-medium font-mono">{fundamentalsData.freeFloat || '---'}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center flex-grow text-muted-foreground gap-2">
                          <Activity className="w-8 h-8 opacity-20" />
                          <p className="text-sm italic">Fundamentals unavailable</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          )}
        </div>

      </div>
    </AppShell>
  );
}
