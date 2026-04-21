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
import { http } from "@/lib/http";
import { cn } from "@/lib/utils";
import { formatDecimal } from "@/lib/format";
import * as io from "socket.io-client";
import { createChart, IChartApi, ISeriesApi } from "lightweight-charts";
import {
  Play,
  TrendingUp,
  Activity,
  BarChart3,
  Users,
} from "lucide-react";

const STOCKS = ["PSX", "HBL", "UBL", "MCB", "HUBC", "FFC"];
const COLORS = [
  "#3b82f6", // PSX
  "#10b981", // HBL
  "#f59e0b", // UBL
  "#ef4444", // MCB
  "#8b5cf6", // HUBC
  "#ec4899", // FFC
];

interface LeaderboardEntry {
  userId: number;
  username: string;
  pnl: number;
  rank: number;
}

export default function OraclePage() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [tournament, setTournament] = useState<any>(null);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [balance, setBalance] = useState<number>(0);

  const [startingCash, setStartingCash] = useState(100000);
  
  // Active game states
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentPrices, setCurrentPrices] = useState<Record<string, number>>({});
  const [tickMinute, setTickMinute] = useState(0);

  // Trading form
  const [selectedStock, setSelectedStock] = useState("HBL");
  const [tradeQuantity, setTradeQuantity] = useState(10);

  // Chart ref
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRefs = useRef<Record<string, ISeriesApi<"Line">>>({});
  const timeRef = useRef<number>(1);

  // Load Initial state
  useEffect(() => {
    checkTournament();
  }, [user]);

  const checkTournament = async () => {
    if (!user) return;
    try {
      setLoading(true);
      // Try to fetch tournament
      const res: any = await http.get("/oracle/tournament/active");
      if (res && res.id) {
        setTournament(res);
        joinTournament(res.id);
      }
    } catch (e) {
      console.log("No active tournament");
    } finally {
      setLoading(false);
    }
  };

  const startTournament = async () => {
    try {
      setLoading(true);
      const res: any = await http.post("/oracle/tournament/start", { startingCash });
      setTournament(res);
      joinTournament(res.id);
    } catch {
      toast.error("Failed to start tournament");
    } finally {
      setLoading(false);
    }
  };

  const joinTournament = async (id: string) => {
    try {
      await http.post("/oracle/tournament/join", { tournamentId: id });
      toast.success("Joined Tournament!");
    } catch {
      toast.error("Failed to join");
    }
  };

  useEffect(() => {
    if (!tournament) return;

    // Determine the base URL for the WebSocket namespace
    // Assuming backend is same domain but on the default port or from environment
    const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3001";
    
    const socket = io.connect(`${WS_URL}/tournament`, {
      withCredentials: true,
    });

    socket.on("connect", () => {
      console.log("Connected to Tournament Live Feed");
    });

    socket.on("tournamentTick", (data: { tick: any, news: any, leaderboard: LeaderboardEntry[] }) => {
      setTickMinute(data.tick.minute);
      setLeaderboard(data.leaderboard);
      
      const prices: Record<string, number> = {
        PSX: data.tick.PSX,
        HBL: data.tick.HBL,
        UBL: data.tick.UBL,
        MCB: data.tick.MCB,
        HUBC: data.tick.HUBC,
        FFC: data.tick.FFC,
      };
      
      setCurrentPrices(prices);
      updateChart(prices, data.tick.minute);
      updateUserBalance(data.leaderboard);
    });

    return () => {
      socket.disconnect();
    };
  }, [tournament]);

  const updateUserBalance = async (lb: LeaderboardEntry[]) => {
      // In a real app we'd fetch portfolio on tick, or the WS would send user-specific data
      // For now we'll fetch the portfolio periodically or rely on local state updates after trade
      // To keep prototype simple, just find our PNL from leaderboard
  };

  const updateChart = (prices: Record<string, number>, minute: number) => {
    if (!chartRef.current) return;
    
    // In lightweight-charts, time must be increasing. We will just use 'minute' as an absolute index wrapper
    // Actually we need to pass a valid timestamp format. For simplicity, just use current unix wrapped
    const timeAxis = Math.floor(Date.now() / 1000) as any;
    
    STOCKS.forEach(stock => {
      const sRef = seriesRefs.current[stock];
      if (sRef && prices[stock]) {
         sRef.update({ time: timeAxis, value: prices[stock] });
      }
    });
  };

  // Initialize Chart
  useEffect(() => {
    if (!tournament || !chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: "solid" as any, color: "transparent" },
        textColor: "#9ca3af",
      },
      grid: {
        vertLines: { color: "#374151" },
        horzLines: { color: "#374151" },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: true,
      },
    });

    STOCKS.forEach((stock, idx) => {
      const series = chart.addLineSeries({
        color: COLORS[idx],
        lineWidth: 2,
        title: stock
      });
      seriesRefs.current[stock] = series;
    });

    chartRef.current = chart;

    return () => {
      chart.remove();
      chartRef.current = null;
    };
  }, [tournament]);

  const handleTrade = async (action: "buy" | "sell") => {
    try {
      await http.post(`/oracle/tournament/${action}`, {
        tournamentId: tournament.id,
        stockSymbol: selectedStock,
        quantity: tradeQuantity,
      });
      toast.success(`Successfully ${action === 'buy' ? 'bought' : 'sold'} ${tradeQuantity} ${selectedStock}`);
    } catch (e: any) {
      toast.error(e.message || "Trade failed");
    }
  };

  const handleEndTournament = async () => {
    try {
      await http.post("/oracle/tournament/end", { tournamentId: tournament.id });
      toast.success("Tournament Ended");
      setTournament(null);
      window.location.reload();
    } catch (e: any) {
      toast.error(e.message || "Failed to end tournament");
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex h-96 items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      </AppShell>
    );
  }

  // Lobby
  if (!tournament) {
    return (
      <AppShell>
        <PageHeader title="Tournament Oracle" description="Global 1-Hour Real-Time Market Competition" />
        <Card className="max-w-md mx-auto mt-12 bg-card/60 backdrop-blur">
          <CardHeader>
            <CardTitle>Start New Tournament</CardTitle>
            <CardDescription>No active tournament found. You can start one!</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground block mb-2">Starting Cash (PKR)</label>
              <input 
                type="number" 
                value={startingCash} 
                onChange={e => setStartingCash(Number(e.target.value))}
                className="w-full bg-background border px-3 py-2 rounded focus:ring-2 ring-primary outline-none" 
              />
            </div>
            <Button size="lg" className="w-full" onClick={startTournament}>
              <Play className="mr-2 w-4 h-4" /> Start Global Tournament
            </Button>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader 
        title="Tournament Oracle" 
        description="Global 1-Hour Real-Time Market Competition" 
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-6">
        
        {/* Left Col: Chart & Panel */}
        <div className="col-span-1 lg:col-span-3 space-y-6">
          <Card className="border-2 border-primary/20 shadow-xl shadow-primary/5">
            <CardHeader className="flex flex-row justify-between items-center bg-muted/30">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="text-primary w-5 h-5" /> Live Simulation
                </CardTitle>
                <CardDescription>Minute {tickMinute} / 60</CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {STOCKS.map((s, idx) => (
                   <Badge key={s} variant="outline" style={{ borderColor: COLORS[idx], color: COLORS[idx] }}>
                     {s} {currentPrices[s] ? formatDecimal(currentPrices[s]) : "---"}
                   </Badge>
                ))}
                <div className="w-px h-6 bg-border mx-2" />
                <Button variant="destructive" size="sm" onClick={handleEndTournament}>
                  End Tournament
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div ref={chartContainerRef} className="h-[400px] w-full" />
            </CardContent>
          </Card>

          <Card className="bg-card/50">
            <CardHeader>
              <CardTitle>Trading Terminal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Select Asset</label>
                  <select 
                    value={selectedStock}
                    onChange={e => setSelectedStock(e.target.value)}
                    className="w-full bg-background border px-3 py-2 rounded outline-none"
                  >
                    {STOCKS.filter(s => s !== "PSX").map(s => (
                       <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Quantity</label>
                  <input 
                    type="number" 
                    value={tradeQuantity}
                    onChange={e => setTradeQuantity(Number(e.target.value))}
                    className="w-full bg-background border px-3 py-2 rounded outline-none"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleTrade("buy")}>BUY</Button>
                  <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={() => handleTrade("sell")}>SELL</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Leaderboard */}
        <div className="col-span-1 border rounded-lg bg-card overflow-hidden">
          <div className="bg-muted px-4 py-3 border-b flex items-center gap-2 font-semibold">
            <Users className="w-4 h-4" /> Leaderboard
          </div>
          <div className="divide-y max-h-[600px] overflow-y-auto">
             {leaderboard.length === 0 ? (
                <p className="p-6 text-center text-muted-foreground text-sm">Waiting for players...</p>
             ) : (
                leaderboard.map(entry => (
                  <div key={entry.userId} className={cn(
                    "p-4 flex flex-col gap-1 transition-colors",
                    entry.userId === user?.id ? "bg-primary/10" : "hover:bg-muted/50"
                  )}>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-sm">#{entry.rank} {entry.username} {entry.userId === user?.id && "(You)"}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">PNL:</span>
                      <span className={cn("font-bold", entry.pnl >= 0 ? "text-emerald-500" : "text-red-500")}>
                        {entry.pnl > 0 ? "+" : ""}{formatDecimal(entry.pnl)}
                      </span>
                    </div>
                  </div>
                ))
             )}
          </div>
        </div>

      </div>
    </AppShell>
  );
}
