'use client';

import { useEffect, useState, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { createChart, IChartApi, ISeriesApi, UTCTimestamp, ColorType, CrosshairMode } from 'lightweight-charts';
import { Activity, AlertTriangle, Building2, LineChart } from "lucide-react";
import { AppShell } from "@/components/layout";
import { PageHeader } from "@/components/common";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { http } from "@/lib/http";
import { formatDecimal, formatVolume } from "@/lib/format";
import { cn } from "@/lib/utils";
import { parseKlines, Candle } from "@/lib/chartUtils";

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
  tick: TickOHLC;
  timestamp: number;
}

type CandleData = Candle;

interface MarketStatus {
  isConnected: boolean;
  lastUpdateTime: number;
  isMarketClosed: boolean;
}

// Stats interface for the top bar
interface DailyStats {
  high24h: number;
  low24h: number;
  vol24h: number;
  value24h: number; // Not always available, but requested in design
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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
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
  const [tickData, setTickData] = useState<TickData | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const [currentCandle, setCurrentCandle] = useState<CandleData | null>(null);
  const [stock, setStock] = useState<string>('HBL');
  const [timeframe, setTimeframe] = useState<string>('1d'); // Default to 1d as in mockup
  const [historicalData, setHistoricalData] = useState<CandleData[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [hasReceivedTick, setHasReceivedTick] = useState<boolean>(false);

  // Company Profile states
  const [companyData, setCompanyData] = useState<CompanyProfile | null>(null);
  const [fundamentalsData, setFundamentalsData] = useState<Fundamentals | null>(null);
  const [isLoadingCompany, setIsLoadingCompany] = useState<boolean>(false);

  const marketCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [marketStatus, setMarketStatus] = useState<MarketStatus>({
    isConnected: false,
    lastUpdateTime: 0,
    isMarketClosed: false
  });

  // Active module selection (Chart vs Company)
  const [activeModule, setActiveModule] = useState<'chart' | 'company'>('chart');

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

    // Use our app's Tailwind colors for the chart
    // Background: transparent so it blends with the Card
    // Grid/Text: muted foregrounds
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 500,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'hsl(var(--muted-foreground))',
      },
      grid: {
        vertLines: { color: 'hsl(var(--border) / 0.5)' },
        horzLines: { color: 'hsl(var(--border) / 0.5)' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: 'hsl(var(--border))',
        rightOffset: 12,
        barSpacing: 10,
        fixLeftEdge: false,
        fixRightEdge: false,
        lockVisibleTimeRangeOnResize: false,
      },
      rightPriceScale: {
        borderColor: 'hsl(var(--border))',
        autoScale: true,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: 'hsl(var(--muted-foreground) / 0.5)',
          width: 1,
          style: 2,
          labelBackgroundColor: 'hsl(var(--secondary))',
        },
        horzLine: {
          color: 'hsl(var(--muted-foreground) / 0.5)',
          width: 1,
          style: 2,
          labelBackgroundColor: 'hsl(var(--secondary))',
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

    const volumeSeries = chart.addHistogramSeries({
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '', // Overlay over main chart
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8, // highest point of the series will be at 80% of the chart height
        bottom: 0,
      },
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;
    volumeSeriesRef.current = volumeSeries;

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
  }, []);

  const setChartContainerEl = useCallback((el: HTMLDivElement | null) => {
    chartContainerRef.current = el;

    if (el && !chartRef.current) {
      initializeChart();
    }
  }, [initializeChart]);

  const fetchHistoricalData = useCallback(async (symbol: string, tf: string) => {
    setIsLoadingHistory(true);
    try {
      // The wrapper returns { symbol, timeframe, data: [...] }
      const result = await http.get<{ data: unknown[] }>(
        `/stocks/${encodeURIComponent(symbol)}/klines/${tf}?limit=100`,
        { noAuth: true }
      );

      if (result && result.data && Array.isArray(result.data)) {
        const candles = parseKlines(result.data);
        setHistoricalData(candles);

        // Push initial full dataset to chart directly
        if (candlestickSeriesRef.current) {
          const uniqueData = candles.reduce((acc: CandleData[], candle) => {
            const existingIndex = acc.findIndex(c => c.time === candle.time);
            if (existingIndex >= 0) acc[existingIndex] = candle;
            else acc.push(candle);
            return acc;
          }, []);

          const chartData = uniqueData.map(candle => ({
            time: candle.time as UTCTimestamp,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
          })).sort((a, b) => a.time - b.time);

          candlestickSeriesRef.current.setData(chartData);

          const volumeData = uniqueData.map(candle => ({
            time: candle.time as UTCTimestamp,
            value: candle.volume || 0,
            color: candle.close >= candle.open ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)'
          })).sort((a, b) => a.time - b.time);

          if (volumeSeriesRef.current) {
            volumeSeriesRef.current.setData(volumeData);
          }

          if (chartRef.current) {
            // chartRef.current.timeScale().fitContent();
          }
        }
      } else {
        setHistoricalData([]);
      }
    } catch (error) {
      console.error('Failed to fetch historical data:', error);
      setHistoricalData([]);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  const fetchCompanyData = useCallback(async (symbol: string) => {
    setIsLoadingCompany(true);
    try {
      const [companyRes, fundRes] = await Promise.all([
        http.get<{ data: CompanyProfile }>(`/stocks/${encodeURIComponent(symbol)}/company`, { noAuth: true }),
        http.get<{ data: Fundamentals }>(`/stocks/${encodeURIComponent(symbol)}/fundamentals`, { noAuth: true })
      ]);

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

  const fetchInitialTick = useCallback(async (symbol: string) => {
    try {
      const res = await http.get<{ tick: any }>(`/stocks/${encodeURIComponent(symbol)}`, { noAuth: true });
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
          tick: mappedTick,
          timestamp: res.tick.timestamp ? res.tick.timestamp * 1000 : Date.now()
        });
        setHasReceivedTick(true);
      }
    } catch (error) {
      console.error('Failed to fetch initial tick:', error);
    }
  }, []);



  const connectWebSocket = useCallback((symbol: string) => {
    if (socketRef.current) {
      socketRef.current.close();
    }

    const socket: Socket = io(`${API_BASE_URL}/ws`, {
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
      setHasReceivedTick(true);
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

        return newCandle;
      });
    });
  }, [getCandleStartTime]);

  useEffect(() => {
    initializeChart();
    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [initializeChart]);

  useEffect(() => {
    setCurrentCandle(null);
    setTickData(null);
    setHasReceivedTick(false);

    // Initial fetch
    fetchHistoricalData(stock, timeframe);
    fetchCompanyData(stock);
    fetchInitialTick(stock);
    connectWebSocket(stock);

    if (marketCheckIntervalRef.current) {
      clearInterval(marketCheckIntervalRef.current);
    }

    marketCheckIntervalRef.current = setInterval(() => {
      setMarketStatus(prev => {
        const timeSinceLastUpdate = Date.now() - prev.lastUpdateTime;
        const shouldMarkClosed = prev.isConnected &&
          hasReceivedTick &&
          prev.lastUpdateTime > 0 &&
          timeSinceLastUpdate > MARKET_CLOSED_TIMEOUT;

        return {
          ...prev,
          isMarketClosed: shouldMarkClosed
        };
      });
    }, 1000);

    return () => {
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
  const changeAmt = tickData?.tick?.chg ?? 0;
  const changePct = tickData?.tick?.chgPct ?? 0;
  const isPositive = changeAmt >= 0;

  // Calculate mock 24h stats from historical data if 24h ticker isn't providing it yet
  const high24h = tickData?.tick?.h ?? (historicalData.length > 0 ? Math.max(...historicalData.slice(-24).map(c => c.high)) : 0);
  const low24h = tickData?.tick?.l ?? (historicalData.length > 0 ? Math.min(...historicalData.slice(-24).map(c => c.low)) : 0);
  const vol24h = tickData?.tick?.v ?? 0;
  const value24h = tickData?.tick?.val ?? 0;

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
    if (!hasReceivedTick) return "Connected - waiting for data...";
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
                  {isPositive ? '+' : ''}{changePct.toFixed(2)}%
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
        </div>

        {/* Main Content Area */}
        <Card className={cn("flex flex-col overflow-hidden border-border bg-card", activeModule !== 'chart' && "hidden")}>
          {/* Chart Toolbar */}
          <div className="flex items-center justify-between p-2 border-b border-border/50 bg-secondary/20">
            <div className="flex items-center gap-1">
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

          </div>

          {/* Chart Container */}
          <CardContent className="p-0">
            {isLoadingHistory && historicalData.length === 0 ? (
              <div className="w-full h-[500px] flex items-center justify-center text-muted-foreground flex-col gap-4">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p>Loading chart data...</p>
              </div>
            ) : (
              <div
                ref={setChartContainerEl}
                className="w-full h-[500px]"
              />
            )}
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
                              {fundamentalsData.peRatio ? fundamentalsData.peRatio.toFixed(2) : '---'}
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
