'use client'
import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { createChart, IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts';
import { Card, CardContent } from "@/components/ui/card";
import TopBar from "@/components/topbar"

interface CandleData {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
}

interface KlineData {
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

interface MarketStatus {
    isConnected: boolean;
    lastUpdateTime: number;
    isMarketClosed: boolean;
}

export default function Charts() {
    const [tickData, setTickData] = useState<any>(null);
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
    const socketRef = useRef<Socket | null>(null);
    const [currentCandle, setCurrentCandle] = useState<CandleData | null>(null);
    const [stock, setStock] = useState<string>('HBL');
    const [timeframe, setTimeframe] = useState<string>('1m');
    const [historicalData, setHistoricalData] = useState<CandleData[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
    const [marketStatus, setMarketStatus] = useState<MarketStatus>({
        isConnected: false,
        lastUpdateTime: 0,
        isMarketClosed: false
    });
    const CANDLE_INTERVAL = 1 * 60 * 1000;
    const MARKET_CLOSED_TIMEOUT = 5000;
    const marketCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

    const getCandleStartTime = (timestamp: number) => {
        return Math.floor(timestamp / CANDLE_INTERVAL) * CANDLE_INTERVAL;
    };

    const initializeChart = () => {
        if (!chartContainerRef.current || chartRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth,
            height: 500,
            layout: {
                background: { color: 'transparent' },
                textColor: '#E4E6EB',
            },
            grid: {
                vertLines: { color: '#2D3139' },
                horzLines: { color: '#2D3139' },
            },
            timeScale: {
                timeVisible: true,
                secondsVisible: true,
                borderColor: '#2D3139',
                rightOffset: 12,
                barSpacing: 10,
                fixLeftEdge: false,
                fixRightEdge: false,
                lockVisibleTimeRangeOnResize: false,
            },
            rightPriceScale: {
                borderColor: '#2D3139',
                scaleMargins: {
                    top: 0.1,
                    bottom: 0.1,
                },
                autoScale: true,
            },
            crosshair: {
                mode: 1,
                vertLine: {
                    color: '#758696',
                    width: 1,
                    style: 2,
                },
                horzLine: {
                    color: '#758696',
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
    };

    const fetchHistoricalData = async (symbol: string, tf: string) => {
        setIsLoadingHistory(true);
        try {
            const response = await fetch(
                `${API_BASE_URL}/stocks/${encodeURIComponent(symbol)}/klines/${tf}?limit=100`
            );
            const result = await response.json();

            if (result.data && Array.isArray(result.data)) {
                const candles: CandleData[] = result.data.map((kline: KlineData) => ({
                    time: Math.floor(kline.timestamp / 1000),
                    open: kline.open,
                    high: kline.high,
                    low: kline.low,
                    close: kline.close,
                    volume: kline.volume,
                }));

                setHistoricalData(candles);
                console.log(`Loaded ${candles.length} historical candles for ${symbol}`);
            } else {
                setHistoricalData([]);
            }
        } catch (error) {
            console.error('Failed to fetch historical data:', error);
            setHistoricalData([]);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const updateChartData = () => {
        if (!candlestickSeriesRef.current) return;

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
    };

    const connectWebSocket = (symbol: string) => {
        if (socketRef.current) {
            socketRef.current.close();
        }

        const socket: Socket = io(`${API_BASE_URL}/ws`);
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('WebSocket connected');
            setMarketStatus(prev => ({
                ...prev,
                isConnected: true,
                lastUpdateTime: Date.now()
            }));
            socket.emit("subscribeSymbol", symbol);
        });

        socket.on('disconnect', () => {
            console.log('WebSocket disconnected');
            setMarketStatus(prev => ({
                ...prev,
                isConnected: false
            }));
        });

        socket.on("subscribed", (data) => {
            console.log('Subscribed to:', data.symbol);
        });

        socket.on("tickUpdate", (data) => {
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
    };

    useEffect(() => {
        initializeChart();

        return () => {
            if (chartRef.current) {
                chartRef.current.remove();
                chartRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        setCurrentCandle(null);
        setTickData(null);

        fetchHistoricalData(stock, timeframe);
        connectWebSocket(stock);

        if (marketCheckIntervalRef.current) {
            clearInterval(marketCheckIntervalRef.current);
        }

        marketCheckIntervalRef.current = setInterval(() => {
            setMarketStatus(prev => {
                const timeSinceLastUpdate = Date.now() - prev.lastUpdateTime;
                const shouldMarkClosed = prev.isConnected &&
                                       prev.lastUpdateTime > 0 &&
                                       timeSinceLastUpdate > MARKET_CLOSED_TIMEOUT;

                if (shouldMarkClosed && !prev.isMarketClosed) {
                    console.log('Market appears to be closed - no data in 5 seconds');
                }

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
    }, [stock, timeframe]);

    useEffect(() => {
        updateChartData();
    }, [historicalData, currentCandle]);

    const getStatusText = () => {
        if (isLoadingHistory) return "Loading historical data...";
        if (!marketStatus.isConnected) return "Connecting...";
        if (marketStatus.isMarketClosed) return "Market Closed";
        if (tickData) return "Live - Market Open";
        return "Waiting for data...";
    };

    const getStatusColor = () => {
        if (isLoadingHistory) return "text-yellow-400";
        if (!marketStatus.isConnected) return "text-orange-400";
        if (marketStatus.isMarketClosed) return "text-red-400";
        if (tickData) return "text-green-400";
        return "text-gray-400";
    };

    return (
        <div className="min-h-screen bg-[#111418]">
            <TopBar/>
            <div className="mx-auto max-w-7xl p-6">
                <div className="grid gap-6 lg:grid-cols-3">
                    <Card className="overflow-hidden bg-[#1C1F24] border-[#2D3139] lg:col-span-2 p-0">
                        <CardContent className="p-4">
                            <div className="mb-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h2 className="text-2xl font-bold text-[#E4E6EB]">
                                        {stock} Chart
                                    </h2>
                                    <div className="flex items-center gap-2">
                                        <div className={`flex items-center gap-2 ${getStatusColor()}`}>
                                            <div className={`w-2 h-2 rounded-full ${
                                                tickData && !marketStatus.isMarketClosed ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
                                            }`}></div>
                                            <span className="text-sm font-medium">{getStatusText()}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 text-sm text-[#9BA1A6]">
                                    <span>Timeframe: {timeframe}</span>
                                    <span>•</span>
                                    <span>Historical: {historicalData.length}</span>
                                    <span>•</span>
                                    <span>Current Price: {currentCandle?.close?.toFixed(2) || tickData?.tick?.c?.toFixed(2) || 'N/A'}</span>
                                </div>
                            </div>

                            <div
                                ref={chartContainerRef}
                                className="w-full h-[500px] bg-[#1C1F24] rounded-lg border border-[#2D3139]"
                            />
                        </CardContent>
                    </Card>

                    <Card className="bg-[#1C1F24] border-[#2D3139] h-fit">
                        <CardContent className="p-6">
                            <h3 className="text-lg font-semibold text-[#E4E6EB] mb-4">Chart Settings</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm text-[#9BA1A6] mb-2 block">Stock Symbol</label>
                                    <select
                                        value={stock}
                                        onChange={(e) => setStock(e.target.value)}
                                        className="w-full bg-[#2D3139] text-[#E4E6EB] border border-[#3D4149] rounded-lg px-4 py-2.5 focus:border-[#3b82f6] focus:outline-none transition-colors"
                                    >
                                        <option value="HBL">HBL - Habib Bank Limited</option>
                                        <option value="UBL">UBL - United Bank Limited</option>
                                        <option value="MCB">MCB - MCB Bank Limited</option>
                                        <option value="HUBC">HUBC - Hub Power Company</option>
                                        <option value="FFC">FFC - Fauji Fertilizer</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-sm text-[#9BA1A6] mb-2 block">Timeframe</label>
                                    <select
                                        value={timeframe}
                                        onChange={(e) => setTimeframe(e.target.value)}
                                        className="w-full bg-[#2D3139] text-[#E4E6EB] border border-[#3D4149] rounded-lg px-4 py-2.5 focus:border-[#3b82f6] focus:outline-none transition-colors"
                                    >
                                        <option value="1m">1 Minute</option>
                                        <option value="5m">5 Minutes</option>
                                        <option value="15m">15 Minutes</option>
                                        <option value="1h">1 Hour</option>
                                        <option value="4h">4 Hours</option>
                                        <option value="1d">1 Day</option>
                                    </select>
                                </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-[#2D3139]">
                                <h3 className="text-lg font-medium text-[#E4E6EB] mb-3">Current Candle</h3>
                                <div className="space-y-2">
                                    {currentCandle ? (
                                        <div className="font-mono text-sm bg-[#2D3139] p-4 rounded-lg">
                                            <div className="grid grid-cols-2 gap-3">
                                                <span className="text-[#9BA1A6]">Open:</span>
                                                <span className="text-[#E4E6EB] font-semibold">{currentCandle.open?.toFixed(2)}</span>
                                                <span className="text-[#9BA1A6]">High:</span>
                                                <span className="text-green-400 font-semibold">{currentCandle.high?.toFixed(2)}</span>
                                                <span className="text-[#9BA1A6]">Low:</span>
                                                <span className="text-red-400 font-semibold">{currentCandle.low?.toFixed(2)}</span>
                                                <span className="text-[#9BA1A6]">Close:</span>
                                                <span className="text-[#E4E6EB] font-semibold">{currentCandle.close?.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-6 text-[#9BA1A6] bg-[#2D3139] rounded-lg">
                                            No active candle
                                        </div>
                                    )}
                                </div>
                            </div>

                            {marketStatus.isMarketClosed && (
                                <div className="mt-4 p-3 bg-red-900/20 border border-red-900/50 rounded-lg">
                                    <p className="text-sm text-red-400">
                                        <span className="font-semibold">Market Closed</span>
                                        <br />
                                        Showing historical data only
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
