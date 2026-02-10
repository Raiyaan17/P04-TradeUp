'use client';

import { useEffect, useState, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { createChart, IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts';
import { Activity, AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/layout";
import { PageHeader } from "@/components/common";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { http } from "@/lib/http";
import { formatDecimal } from "@/lib/format";
import { cn } from "@/lib/utils";
import { parseKlines, Candle } from "@/lib/chartUtils";

interface TickOHLC {
  o: number;
  h: number;
  l: number;
  c: number;
}

interface TickData {
  tick: TickOHLC;
  timestamp: number;
}

// Use Candle type from chartUtils for consistency
type CandleData = Candle;

interface MarketStatus {
  isConnected: boolean;
  lastUpdateTime: number;
  isMarketClosed: boolean;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
const CANDLE_INTERVAL = 1 * 60 * 1000;
const MARKET_CLOSED_TIMEOUT = 5000;

export default function Charts() {
  const [tickData, setTickData] = useState<TickData | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [currentCandle, setCurrentCandle] = useState<CandleData | null>(null);
  const [stock, setStock] = useState<string>('HBL');
  const [timeframe, setTimeframe] = useState<string>('1m');
  const [historicalData, setHistoricalData] = useState<CandleData[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [hasReceivedTick, setHasReceivedTick] = useState<boolean>(false);
  const marketCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [marketStatus, setMarketStatus] = useState<MarketStatus>({
    isConnected: false,
    lastUpdateTime: 0,
    isMarketClosed: false
  });

  const getCandleStartTime = useCallback((timestamp: number) => {
    return Math.floor(timestamp / CANDLE_INTERVAL) * CANDLE_INTERVAL;
  }, []);

  const initializeChart = useCallback(() => {
    if (!chartContainerRef.current || chartRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 500,
      layout: {
        background: { color: 'transparent' },
        textColor: '#171717',
      },
      grid: {
        vertLines: { color: '#e5e5e5' },
        horzLines: { color: '#e5e5e5' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: true,
        borderColor: '#e5e5e5',
        rightOffset: 12,
        barSpacing: 10,
        fixLeftEdge: false,
        fixRightEdge: false,
        lockVisibleTimeRangeOnResize: false,
      },
      rightPriceScale: {
        borderColor: '#e5e5e5',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
        autoScale: true,
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#737373',
          width: 1,
          style: 2,
        },
        horzLine: {
          color: '#737373',
          width: 1,
          style: 2,
        },
      },
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;

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
      const result = await http.get<{ data: unknown[] }>(
        `/stocks/${encodeURIComponent(symbol)}/klines/${tf}?limit=100`,
        { noAuth: true }
      );

      if (result.data && Array.isArray(result.data)) {
        // Use robust parser that handles both array and object formats
        const candles = parseKlines(result.data);

        setHistoricalData(candles);
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

  const updateChartData = useCallback(() => {
    if (!candlestickSeriesRef.current) {
      return;
    }

    const allData = currentCandle
      ? [...historicalData, currentCandle]
      : historicalData;

    if (allData.length > 0) {
      const sortedData = [...allData].sort((a, b) => a.time - b.time);

      const uniqueData = sortedData.reduce((acc: CandleData[], candle) => {
        const existingIndex = acc.findIndex(c => c.time === candle.time);
        if (existingIndex >= 0) {
          acc[existingIndex] = candle;
        } else {
          acc.push(candle);
        }
        return acc;
      }, []);

      const chartData = uniqueData.map(candle => ({
        time: candle.time as UTCTimestamp,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      }));

      candlestickSeriesRef.current.setData(chartData);

      if (chartRef.current) {
        chartRef.current.timeScale().fitContent();
      }
    }
  }, [historicalData, currentCandle]);

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
      console.log('Connected via:', socket.io.engine.transport.name); // 'polling' or 'websocket'

      socket.io.engine.on("upgrade", () => {
        console.log('Transport upgraded to:', socket.io.engine.transport.name); // 'websocket'
      });

      setMarketStatus(prev => ({
        ...prev,
        isConnected: true,
        // Don't treat "connected" as "received market data".
        // lastUpdateTime is updated when we receive actual ticks.
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

          return {
            time: candleTimeInSeconds,
            open: tick.o,
            high: tick.h,
            low: tick.l,
            close: tick.c,
          };
        } else {
          return {
            ...prev,
            high: Math.max(prev.high, tick.h),
            low: Math.min(prev.low, tick.l),
            close: tick.c,
          };
        }
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

    fetchHistoricalData(stock, timeframe);
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
  }, [stock, timeframe, connectWebSocket, fetchHistoricalData, hasReceivedTick]);

  useEffect(() => {
    updateChartData();
  }, [updateChartData]);

  const getStatusText = () => {
    if (isLoadingHistory) return "Loading historical data...";
    if (!marketStatus.isConnected) return "Connecting...";
    if (!hasReceivedTick) return "Connected - waiting for live data...";
    if (marketStatus.isMarketClosed) return "Market Closed";
    if (tickData) return "Live - Market Open";
    return "Waiting for data...";
  };

  const getStatusVariant = (): "default" | "secondary" | "success" | "warning" | "error" => {
    if (isLoadingHistory) return "warning";
    if (!marketStatus.isConnected) return "warning";
    if (marketStatus.isMarketClosed) return "error";
    if (tickData) return "success";
    return "secondary";
  };

  return (
    <AppShell>
      <PageHeader
        title="Markets"
        description="Live stock charts and market data"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Chart Card */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">{stock} Chart</CardTitle>
              <Badge variant={getStatusVariant()}>
                <Activity className="mr-1 h-3 w-3" />
                {getStatusText()}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Timeframe: {timeframe}</span>
              <span>•</span>
              <span>Historical: {historicalData.length}</span>
              <span>•</span>
              <span>Current: {formatDecimal(currentCandle?.close ?? tickData?.tick?.c)}</span>
            </div>
          </CardHeader>
          <CardContent>
            <div
              ref={setChartContainerEl}
              className="w-full h-[500px] rounded-lg border border-border"
            />
          </CardContent>
        </Card>

        {/* Settings Card */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Chart Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Stock Symbol</label>
                <select
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="w-full bg-secondary text-foreground border border-border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-ring focus:outline-none transition-colors"
                >
                  <option value="HBL">HBL - Habib Bank Limited</option>
                  <option value="UBL">UBL - United Bank Limited</option>
                  <option value="MCB">MCB - MCB Bank Limited</option>
                  <option value="HUBC">HUBC - Hub Power Company</option>
                  <option value="FFC">FFC - Fauji Fertilizer</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Timeframe</label>
                <select
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value)}
                  className="w-full bg-secondary text-foreground border border-border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-ring focus:outline-none transition-colors"
                >
                  <option value="1m">1 Minute</option>
                  <option value="5m">5 Minutes</option>
                  <option value="15m">15 Minutes</option>
                  <option value="1h">1 Hour</option>
                  <option value="4h">4 Hours</option>
                  <option value="1d">1 Day</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Current Candle Card */}
          <Card>
            <CardHeader>
              <CardTitle>Current Candle</CardTitle>
            </CardHeader>
            <CardContent>
              {currentCandle ? (
                <div className="grid grid-cols-2 gap-3 font-mono text-sm">
                  <div className="text-muted-foreground">Open:</div>
                  <div className="font-semibold">{formatDecimal(currentCandle.open)}</div>
                  <div className="text-muted-foreground">High:</div>
                  <div className="font-semibold text-emerald-400">{formatDecimal(currentCandle.high)}</div>
                  <div className="text-muted-foreground">Low:</div>
                  <div className="font-semibold text-rose-400">{formatDecimal(currentCandle.low)}</div>
                  <div className="text-muted-foreground">Close:</div>
                  <div className="font-semibold">{formatDecimal(currentCandle.close)}</div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No active candle</p>
              )}
            </CardContent>
          </Card>

          {/* Market Status Warning */}
          {marketStatus.isMarketClosed && (
            <Card className="border-destructive/50 bg-destructive/10">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-destructive">Market Closed</p>
                    <p className="text-sm text-muted-foreground">Showing historical data only</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Raw Tick Data (debug) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Latest Tick Data</CardTitle>
            </CardHeader>
            <CardContent>
              {tickData ? (
                <pre className={cn(
                  "font-mono text-xs bg-muted p-3 rounded-md max-h-32 overflow-y-auto",
                  "text-muted-foreground whitespace-pre-wrap"
                )}>
                  {JSON.stringify(tickData, null, 2)}
                </pre>
              ) : (
                <p className="text-sm text-muted-foreground">Waiting for data...</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
