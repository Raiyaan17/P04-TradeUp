"use client";

import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useUser } from "@/context/UserContext";
import { AppShell } from "@/components/layout";
import { PageHeader } from "@/components/common";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { oracleService } from "@/lib/oracleService";
import { http } from "@/lib/http";
import { cn } from "@/lib/utils";
import { formatDecimal } from "@/lib/format";
import type {
  Preset,
  PresetType,
  SimulationScenario,
  NewsItem,
  TradingDecision,
  FinalPortfolio,
  AnalysisResult,
} from "@/types/oracle";
import {
  Play,
  Pause,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  CheckCircle2,
  XCircle,
  BarChart3,
  Newspaper,
  Sparkles,
} from "lucide-react";

const PRESET_ICONS: Record<PresetType, React.ReactNode> = {
  STEADY_CLIMB: <TrendingUp className="h-8 w-8" />,
  FLASH_CRASH: <TrendingDown className="h-8 w-8" />,
  IMF_ROLLERCOASTER: <Activity className="h-8 w-8" />,
  REALISTIC_OUTLOOK: <Sparkles className="h-8 w-8" />,
};

const PRESET_COLORS: Record<PresetType, string> = {
  STEADY_CLIMB:
    "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20",
  FLASH_CRASH:
    "bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-500/20",
  IMF_ROLLERCOASTER:
    "bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20",
  REALISTIC_OUTLOOK:
    "bg-purple-500/10 text-purple-600 border-purple-500/20 hover:bg-purple-500/20",
};

const SPEEDS = [0.5, 1, 2, 5];
const HISTORICAL_CANDLE_COUNT = 30;

interface HistoricalPrice {
  day: number; // negative index from simulation start (-30, -29, ...)
  price: number;
}

export default function OraclePage() {
  useUser();
  const [presets, setPresets] = useState<Preset[]>([]);
  const [symbols, setSymbols] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState<PresetType | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("");
  const [scenario, setScenario] = useState<SimulationScenario | null>(null);
  const [simulationStatus, setSimulationStatus] = useState<
    "IDLE" | "LOADING" | "RUNNING" | "PAUSED" | "COMPLETED"
  >("IDLE");
  const [currentDay, setCurrentDay] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [portfolio, setPortfolio] = useState<FinalPortfolio>({
    cash: 100000,
    shares: 0,
    currentPrice: 0,
  });
  const [decisions, setDecisions] = useState<TradingDecision[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [historicalPrices, setHistoricalPrices] = useState<HistoricalPrice[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadPresets();
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const loadPresets = async () => {
    try {
      setLoading(true);
      const data = await oracleService.getPresets();
      setPresets(data.presets);
      setSymbols(data.symbols);
      if (data.symbols.length > 0) {
        setSelectedSymbol(data.symbols[0]);
      }
    } catch {
      toast.error("Failed to load simulation presets");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoricalKlines = async (symbol: string): Promise<HistoricalPrice[]> => {
    try {
      const result = await http.get<{ data: Array<{ timestamp: number; close: number }> }>(
        `/stocks/${encodeURIComponent(symbol)}/klines/1d?limit=${HISTORICAL_CANDLE_COUNT}`,
        { noAuth: true },
      );
      if (result.data && Array.isArray(result.data)) {
        // Map to HistoricalPrice with negative day indices
        return result.data
          .slice(-HISTORICAL_CANDLE_COUNT)
          .map((k, i, arr) => ({
            day: i - arr.length, // e.g. -30, -29, ..., -1
            price: k.close,
          }));
      }
    } catch (err) {
      console.warn("Could not fetch historical klines for oracle chart:", err);
    }
    return [];
  };

  const startSimulation = async () => {
    if (!selectedPreset || !selectedSymbol) {
      toast.error("Please select a preset and stock symbol");
      return;
    }

    try {
      setSimulationStatus("LOADING");
      // Fetch simulation + historical data in parallel
      const [data, histPrices] = await Promise.all([
        oracleService.startSimulation(selectedPreset, selectedSymbol),
        fetchHistoricalKlines(selectedSymbol),
      ]);
      setHistoricalPrices(histPrices);
      setScenario(data);
      setCurrentDay(0);
      setPortfolio({
        cash: 100000,
        shares: 0,
        currentPrice: data.basePrice,
      });
      setDecisions([]);
      setAnalysis(null);
      setSimulationStatus("RUNNING");
      startTickEngine(data);
    } catch {
      toast.error("Failed to start simulation");
      setSimulationStatus("IDLE");
    }
  };

  const startTickEngine = (simData: SimulationScenario) => {
    const intervalMs = 10000 / speed;

    intervalRef.current = setInterval(() => {
      setCurrentDay((prev) => {
        const nextDay = prev + 1;
        if (nextDay >= simData.trajectory.length) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          setSimulationStatus("COMPLETED");
          return prev;
        }

        const currentPrice = simData.trajectory[nextDay].cumulativePrice;
        setPortfolio((p) => ({ ...p, currentPrice }));
        return nextDay;
      });
    }, intervalMs);
  };

  const pauseSimulation = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setSimulationStatus("PAUSED");
  };

  const resumeSimulation = () => {
    if (scenario) {
      setSimulationStatus("RUNNING");
      startTickEngine(scenario);
    }
  };

  const resetSimulation = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setScenario(null);
    setSimulationStatus("IDLE");
    setCurrentDay(0);
    setPortfolio({ cash: 100000, shares: 0, currentPrice: 0 });
    setDecisions([]);
    setAnalysis(null);
    setSelectedPreset(null);
    setHistoricalPrices([]);
  };

  const executeTrade = (action: "buy" | "sell", quantity: number) => {
    if (!scenario || simulationStatus !== "RUNNING") return;

    const currentPrice = scenario.trajectory[currentDay].cumulativePrice;
    const total = currentPrice * quantity;

    if (action === "buy") {
      if (total > portfolio.cash) {
        toast.error("Insufficient cash for this trade");
        return;
      }
      setPortfolio((p) => ({
        cash: p.cash - total,
        shares: p.shares + quantity,
        currentPrice,
      }));
    } else {
      if (quantity > portfolio.shares) {
        toast.error("Insufficient shares for this trade");
        return;
      }
      setPortfolio((p) => ({
        cash: p.cash + total,
        shares: p.shares - quantity,
        currentPrice,
      }));
    }

    setDecisions((d) => [
      ...d,
      { day: currentDay, action, quantity, price: currentPrice },
    ]);

    toast.success(
      `${action.toUpperCase()} ${quantity} shares at ${formatDecimal(
        currentPrice,
      )} PKR`,
    );
  };

  const analyzeResults = async () => {
    if (!scenario) return;

    try {
      const result = await oracleService.analyzeSimulation(
        scenario.id,
        decisions,
        {
          ...portfolio,
          currentPrice: portfolio.currentPrice,
        },
      );
      setAnalysis(result);
    } catch {
      toast.error("Failed to analyze results");
    }
  };

  const getCurrentNews = (): NewsItem[] => {
    if (!scenario) return [];
    return scenario.news.filter((n) => n.day <= currentDay + 1).slice(-3);
  };

  const getPortfolioValue = () =>
    portfolio.cash + portfolio.shares * portfolio.currentPrice;

  const getProfitLoss = () => getPortfolioValue() - 100000;

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="Market Oracle"
        description="Experience 30-day market scenarios powered by AI"
      />

      {simulationStatus === "IDLE" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Select Stock Symbol</CardTitle>
              <CardDescription>Choose which stock to simulate</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {symbols.map((symbol) => (
                  <Button
                    key={symbol}
                    variant={selectedSymbol === symbol ? "default" : "outline"}
                    onClick={() => setSelectedSymbol(symbol)}
                  >
                    {symbol}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {presets.map((preset) => (
              <Card
                key={preset.type}
                className={cn(
                  "cursor-pointer transition-all hover:scale-105 border-2",
                  selectedPreset === preset.type
                    ? "ring-2 ring-primary border-primary"
                    : "border-transparent",
                  PRESET_COLORS[preset.type],
                )}
                onClick={() => setSelectedPreset(preset.type)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    {PRESET_ICONS[preset.type]}
                    {preset.isPro && (
                      <Badge variant="secondary" className="text-xs">
                        PRO
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg mt-2">{preset.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm opacity-80">{preset.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-center">
            <Button
              size="lg"
              onClick={startSimulation}
              disabled={!selectedPreset || !selectedSymbol}
              className="w-full md:w-auto"
            >
              <Play className="mr-2 h-4 w-4" />
              Start Simulation
            </Button>
          </div>
        </div>
      )}

      {(simulationStatus === "LOADING" ||
        simulationStatus === "RUNNING" ||
        simulationStatus === "PAUSED") && (
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>
                      {scenario?.stockSymbol} -{" "}
                      {presets.find((p) => p.type === scenario?.presetType)?.name}
                    </CardTitle>
                    <CardDescription>Day {currentDay + 1} of 30</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        simulationStatus === "RUNNING" ? "default" : "secondary"
                      }
                    >
                      {simulationStatus === "RUNNING" ? (
                        <>
                          <Zap className="mr-1 h-3 w-3" /> Running
                        </>
                      ) : (
                        <>
                          <Pause className="mr-1 h-3 w-3" /> Paused
                        </>
                      )}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="w-full bg-muted rounded-full h-2 mb-4">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((currentDay + 1) / 30) * 100}%` }}
                  />
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  {simulationStatus === "RUNNING" ? (
                    <Button variant="outline" size="sm" onClick={pauseSimulation}>
                      <Pause className="mr-2 h-4 w-4" /> Pause
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resumeSimulation}
                    >
                      <Play className="mr-2 h-4 w-4" /> Resume
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={resetSimulation}>
                    <RotateCcw className="mr-2 h-4 w-4" /> Reset
                  </Button>
                  <div className="flex items-center gap-2 ml-4">
                    <span className="text-sm text-muted-foreground">Speed:</span>
                    <div className="flex gap-1">
                      {SPEEDS.map((s) => (
                        <Button
                          key={s}
                          variant={speed === s ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSpeed(s)}
                          className="px-2"
                        >
                          {s}x
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Price Chart
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80 bg-muted rounded-lg p-4">
                    {scenario && (() => {
                      // --- Data preparation ---
                      const visibleSimPoints = scenario.trajectory.slice(0, currentDay + 1);
                      const histCount = historicalPrices.length;
                      const simTotalCount = scenario.trajectory.length; // 30
                      const totalXSlots = histCount + simTotalCount; // e.g. 30 hist + 30 sim = 60

                      // Combine all prices for Y-axis range
                      const allSimPrices = scenario.trajectory.map(t => t.cumulativePrice);
                      const allHistPrices = historicalPrices.map(h => h.price);
                      const allPrices = [...allHistPrices, ...allSimPrices];
                      const minPrice = Math.min(...allPrices) * 0.995;
                      const maxPrice = Math.max(...allPrices) * 1.005;
                      const priceRange = maxPrice - minPrice || 1;

                      // SVG dimensions
                      const svgW = 700;
                      const svgH = 260;
                      const padL = 55;
                      const padR = 10;
                      const padT = 10;
                      const padB = 30;
                      const chartW = svgW - padL - padR;
                      const chartH = svgH - padT - padB;

                      // Mapping helpers
                      const toX = (slotIdx: number) =>
                        padL + (slotIdx / Math.max(totalXSlots - 1, 1)) * chartW;
                      const toY = (price: number) =>
                        padT + chartH - ((price - minPrice) / priceRange) * chartH;

                      // --- Historical line path ---
                      const histLinePath = historicalPrices
                        .map((hp, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(hp.price).toFixed(1)}`)
                        .join(" ");

                      // --- Simulation line path (starts from end of history) ---
                      const simStartSlot = histCount; // first sim slot index
                      const simLinePath = visibleSimPoints
                        .map((pt, i) => {
                          const slotIdx = simStartSlot + i;
                          return `${i === 0 ? "M" : "L"} ${toX(slotIdx).toFixed(1)} ${toY(pt.cumulativePrice).toFixed(1)}`;
                        })
                        .join(" ");

                      // Simulation area fill
                      const simAreaPath = visibleSimPoints.length > 0
                        ? `${simLinePath} L ${toX(simStartSlot + visibleSimPoints.length - 1).toFixed(1)} ${(padT + chartH).toFixed(1)} L ${toX(simStartSlot).toFixed(1)} ${(padT + chartH).toFixed(1)} Z`
                        : "";

                      // Connector line from last historical point to first sim point
                      const connectorPath = histCount > 0 && visibleSimPoints.length > 0
                        ? `M ${toX(histCount - 1).toFixed(1)} ${toY(historicalPrices[histCount - 1].price).toFixed(1)} L ${toX(simStartSlot).toFixed(1)} ${toY(visibleSimPoints[0].cumulativePrice).toFixed(1)}`
                        : "";

                      // Current price & trend
                      const currentPrice = visibleSimPoints[visibleSimPoints.length - 1]?.cumulativePrice ?? scenario.basePrice;
                      const isUp = currentPrice >= scenario.basePrice;

                      // Y-axis grid
                      const yGridCount = 4;
                      const yGridLines = Array.from({ length: yGridCount + 1 }, (_, i) => {
                        const price = minPrice + (priceRange * i) / yGridCount;
                        return { price, y: toY(price) };
                      });

                      // X-axis labels for historical section (every 5 days)
                      const histXLabels = historicalPrices.filter((_, i) => i % 10 === 0);
                      // X-axis labels for simulation (every 5 days, showing day number)
                      const simXLabels = scenario.trajectory.filter((_, i) => i % 5 === 0 || i === simTotalCount - 1);

                      const simStrokeColor = isUp ? "#10b981" : "#ef4444";
                      const histStrokeColor = "#6b7280"; // gray-500
                      const gradId = "simGrad";

                      // Divider X position (boundary between historical and simulation)
                      const dividerX = histCount > 0 ? toX(histCount - 0.5) : padL;

                      return (
                        <svg
                          viewBox={`0 0 ${svgW} ${svgH}`}
                          className="w-full h-full"
                          preserveAspectRatio="xMidYMid meet"
                        >
                          <defs>
                            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={simStrokeColor} stopOpacity={0.3} />
                              <stop offset="100%" stopColor={simStrokeColor} stopOpacity={0.02} />
                            </linearGradient>
                          </defs>

                          {/* Y-axis grid lines & labels */}
                          {yGridLines.map((g, i) => (
                            <g key={`yg-${i}`}>
                              <line
                                x1={padL} y1={g.y} x2={svgW - padR} y2={g.y}
                                stroke="currentColor" strokeOpacity={0.1} strokeDasharray="4 4"
                              />
                              <text
                                x={padL - 6} y={g.y + 4}
                                textAnchor="end" fill="currentColor" fillOpacity={0.5} fontSize="10"
                              >
                                {g.price.toFixed(0)}
                              </text>
                            </g>
                          ))}

                          {/* Divider line between historical and simulation */}
                          {histCount > 0 && (
                            <line
                              x1={dividerX} y1={padT} x2={dividerX} y2={padT + chartH}
                              stroke="currentColor" strokeOpacity={0.15} strokeDasharray="6 3"
                            />
                          )}

                          {/* Section labels */}
                          {histCount > 0 && (
                            <>
                              <text
                                x={padL + (dividerX - padL) / 2} y={padT + 14}
                                textAnchor="middle" fill="#6b7280" fontSize="9" fontStyle="italic"
                              >
                                Historical
                              </text>
                              <text
                                x={dividerX + (svgW - padR - dividerX) / 2} y={padT + 14}
                                textAnchor="middle" fill={simStrokeColor} fontSize="9" fontStyle="italic"
                              >
                                Simulation
                              </text>
                            </>
                          )}

                          {/* Historical X-axis labels */}
                          {histXLabels.map((hp) => {
                            const idx = historicalPrices.indexOf(hp);
                            return (
                              <text
                                key={`hx-${hp.day}`}
                                x={toX(idx)} y={svgH - 4}
                                textAnchor="middle" fill="#6b7280" fillOpacity={0.6} fontSize="9"
                              >
                                {hp.day}d
                              </text>
                            );
                          })}

                          {/* Simulation X-axis labels */}
                          {simXLabels.map((pt) => {
                            const simIdx = scenario.trajectory.indexOf(pt);
                            return (
                              <text
                                key={`sx-${pt.day}`}
                                x={toX(simStartSlot + simIdx)} y={svgH - 4}
                                textAnchor="middle" fill="currentColor" fillOpacity={0.5} fontSize="10"
                              >
                                {pt.day}
                              </text>
                            );
                          })}

                          {/* Historical line */}
                          {histCount > 1 && (
                            <path
                              d={histLinePath}
                              fill="none"
                              stroke={histStrokeColor}
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeOpacity={0.5}
                            />
                          )}

                          {/* Connector (dashed) from last historical to first sim */}
                          {connectorPath && (
                            <path
                              d={connectorPath}
                              fill="none"
                              stroke={simStrokeColor}
                              strokeWidth="1.5"
                              strokeDasharray="4 3"
                              strokeOpacity={0.5}
                            />
                          )}

                          {/* Simulation area fill */}
                          {visibleSimPoints.length > 1 && (
                            <path d={simAreaPath} fill={`url(#${gradId})`} />
                          )}

                          {/* Simulation line */}
                          {visibleSimPoints.length > 1 && (
                            <path
                              d={simLinePath}
                              fill="none"
                              stroke={simStrokeColor}
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          )}

                          {/* Current price dot (pulsing) */}
                          {visibleSimPoints.length > 0 && (
                            <g>
                              <circle
                                cx={toX(simStartSlot + visibleSimPoints.length - 1)}
                                cy={toY(currentPrice)}
                                r="5" fill={simStrokeColor}
                              />
                              <circle
                                cx={toX(simStartSlot + visibleSimPoints.length - 1)}
                                cy={toY(currentPrice)}
                                r="8" fill={simStrokeColor} fillOpacity={0.3}
                              >
                                <animate attributeName="r" values="6;10;6" dur="2s" repeatCount="indefinite" />
                                <animate attributeName="fill-opacity" values="0.3;0.1;0.3" dur="2s" repeatCount="indefinite" />
                              </circle>
                            </g>
                          )}

                          {/* Single sim point dot */}
                          {visibleSimPoints.length === 1 && (
                            <circle
                              cx={toX(simStartSlot)}
                              cy={toY(visibleSimPoints[0].cumulativePrice)}
                              r="4" fill={simStrokeColor}
                            />
                          )}
                        </svg>
                      );
                    })()}
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Current Price
                      </p>
                      <p className="text-2xl font-bold">
                        {formatDecimal(portfolio.currentPrice)} PKR
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        Change from Base
                      </p>
                      <p
                        className={cn(
                          "text-2xl font-bold",
                          portfolio.currentPrice >= (scenario?.basePrice || 0)
                            ? "text-emerald-600"
                            : "text-red-600",
                        )}
                      >
                        {portfolio.currentPrice >= (scenario?.basePrice || 0)
                          ? "+"
                          : ""}
                        {formatDecimal(
                          ((portfolio.currentPrice - (scenario?.basePrice || 0)) /
                            (scenario?.basePrice || 1)) *
                          100,
                        )}
                        %
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Newspaper className="h-5 w-5" />
                    Market News
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {getCurrentNews().map((news, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "p-3 rounded-lg border-l-4",
                        news.sentiment === "positive" &&
                        "border-emerald-500 bg-emerald-50/50",
                        news.sentiment === "negative" &&
                        "border-red-500 bg-red-50/50",
                        news.sentiment === "neutral" &&
                        "border-blue-500 bg-blue-50/50",
                      )}
                    >
                      <p className="text-xs text-muted-foreground mb-1">
                        Day {news.day}
                      </p>
                      <p className="text-sm font-medium">{news.headline}</p>
                    </div>
                  ))}
                  {getCurrentNews().length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      News will appear as the simulation progresses...
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Trading Panel</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Cash</p>
                    <p className="text-xl font-semibold">
                      {formatDecimal(portfolio.cash)} PKR
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Shares</p>
                    <p className="text-xl font-semibold">{portfolio.shares}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Portfolio Value
                    </p>
                    <p className="text-xl font-semibold">
                      {formatDecimal(getPortfolioValue())} PKR
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">P&L</p>
                    <p
                      className={cn(
                        "text-xl font-semibold",
                        getProfitLoss() >= 0
                          ? "text-emerald-600"
                          : "text-red-600",
                      )}
                    >
                      {getProfitLoss() >= 0 ? "+" : ""}
                      {formatDecimal(getProfitLoss())} PKR
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    onClick={() => executeTrade("buy", 10)}
                    disabled={simulationStatus !== "RUNNING"}
                    className="flex-1"
                  >
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Buy 10 Shares
                  </Button>
                  <Button
                    onClick={() => executeTrade("sell", 10)}
                    disabled={
                      simulationStatus !== "RUNNING" || portfolio.shares < 10
                    }
                    variant="outline"
                    className="flex-1"
                  >
                    <TrendingDown className="mr-2 h-4 w-4" />
                    Sell 10 Shares
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

      {simulationStatus === "COMPLETED" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                Simulation Complete!
              </CardTitle>
              <CardDescription>
                {scenario?.stockSymbol} -{" "}
                {presets.find((p) => p.type === scenario?.presetType)?.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Final Portfolio Value
                  </p>
                  <p className="text-3xl font-bold">
                    {formatDecimal(getPortfolioValue())} PKR
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Total Profit/Loss
                  </p>
                  <p
                    className={cn(
                      "text-3xl font-bold",
                      getProfitLoss() >= 0
                        ? "text-emerald-600"
                        : "text-red-600",
                    )}
                  >
                    {getProfitLoss() >= 0 ? "+" : ""}
                    {formatDecimal(getProfitLoss())} PKR
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Return %</p>
                  <p
                    className={cn(
                      "text-3xl font-bold",
                      getProfitLoss() >= 0
                        ? "text-emerald-600"
                        : "text-red-600",
                    )}
                  >
                    {getProfitLoss() >= 0 ? "+" : ""}
                    {formatDecimal((getProfitLoss() / 100000) * 100)}%
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-6 justify-center">
                <Button onClick={analyzeResults} disabled={!!analysis}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {analysis ? "Analysis Complete" : "Get AI Analysis"}
                </Button>
                <Button variant="outline" onClick={resetSimulation}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Start New Simulation
                </Button>
              </div>
            </CardContent>
          </Card>

          {analysis && (
            <Card>
              <CardHeader>
                <CardTitle>AI Performance Analysis</CardTitle>
                <CardDescription>Score: {analysis.score}/100</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-2">Summary</h4>
                  <p className="text-muted-foreground">{analysis.summary}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      Strengths
                    </h4>
                    <ul className="space-y-1">
                      {analysis.strengths.map((s, i) => (
                        <li key={i} className="text-sm text-muted-foreground">
                          • {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      Areas to Improve
                    </h4>
                    <ul className="space-y-1">
                      {analysis.weaknesses.map((w, i) => (
                        <li key={i} className="text-sm text-muted-foreground">
                          • {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      Recommendations
                    </h4>
                    <ul className="space-y-1">
                      {analysis.recommendations.map((r, i) => (
                        <li key={i} className="text-sm text-muted-foreground">
                          • {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Trade History</CardTitle>
            </CardHeader>
            <CardContent>
              {decisions.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No trades executed during this simulation
                </p>
              ) : (
                <div className="space-y-2">
                  {decisions.map((decision, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg",
                        decision.action === "buy"
                          ? "bg-emerald-50"
                          : "bg-red-50",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={
                            decision.action === "buy" ? "default" : "secondary"
                          }
                        >
                          {decision.action.toUpperCase()}
                        </Badge>
                        <span className="text-sm">Day {decision.day}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {decision.quantity} shares
                        </p>
                        <p className="text-sm text-muted-foreground">
                          @ {formatDecimal(decision.price)} PKR
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
