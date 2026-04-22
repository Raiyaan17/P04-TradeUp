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
import {
  Play,
  Activity,
  Users,
  Radio,
  Newspaper,
  Briefcase,
  Trophy
} from "lucide-react";

// Types
interface LeaderboardEntry {
  userId: number;
  username: string;
  pnl: number;
  rank: number;
}

interface TournamentNewsItem {
  day: number;
  headline: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}

const STOCKS = ["PSX", "HBL", "UBL", "MCB", "HUBC", "FFC"];
const COLORS = [
  "#3b82f6", // PSX
  "#10b981", // HBL
  "#f59e0b", // UBL
  "#ef4444", // MCB
  "#8b5cf6", // HUBC
  "#ec4899", // FFC
];

function PercentageChart({ history, currentMinute, stocksToRender, colors }: { history: Record<string, number>[], currentMinute: number, stocksToRender: string[], colors: string[] }) {
  if (history.length === 0) return <div className="h-full flex items-center justify-center text-muted-foreground">Waiting for market open...</div>;

  const firstPoint = history[0];
  const data = history.map(point => {
    let percentages: Record<string, number> = {};
    stocksToRender.forEach(s => {
      const startPrice = firstPoint[s];
      const currentPrice = point[s];
      if (startPrice) {
        percentages[s] = ((currentPrice - startPrice) / startPrice) * 100;
      } else {
        percentages[s] = 0;
      }
    });
    return percentages;
  });

  let minPct = 0;
  let maxPct = 0;
  data.forEach(d => {
    stocksToRender.forEach(s => {
      if (d[s] < minPct) minPct = d[s];
      if (d[s] > maxPct) maxPct = d[s];
    });
  });

  minPct -= 0.2;
  maxPct += 0.2;

  const width = 800;
  const height = 400;
  const paddingY = 40;

  // Total ticks is 30. We graph continuously up to 30.
  const getX = (index: number) => (index / 30) * width;
  const getY = (value: number) => {
    const range = maxPct - minPct;
    const normalized = range === 0 ? 0.5 : (value - minPct) / range;
    return height - paddingY - (normalized * (height - 2 * paddingY));
  };

  return (
    <div className="w-full h-full relative font-mono min-h-[250px]">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full h-full overflow-visible">
        {/* Grid lines and percentage labels */}
        {[maxPct, maxPct / 2, 0, minPct / 2, minPct].map((val, i) => {
          if (val === undefined || isNaN(val)) return null;
          const y = getY(val);
          return (
            <g key={i}>
              <line x1="0" y1={y} x2={width} y2={y} stroke="#374151" strokeWidth={val === 0 ? 2 : 1} strokeDasharray={val === 0 ? "0" : "4 4"} opacity={0.5} />
              <text x="0" y={y - 5} fill="#9ca3af" fontSize="12">{val > 0 ? '+' : ''}{val.toFixed(2)}%</text>
            </g>
          );
        })}

        {/* Lines */}
        {stocksToRender.map((stock, i) => {
          const points = data.map((d, index) => `${getX(index)},${getY(d[stock])}`).join(" ");
          return (
            <polyline
              key={`line-${stock}`}
              fill="none"
              stroke={colors[i]}
              strokeWidth="2.5"
              points={points}
              style={{ strokeLinejoin: "round", strokeLinecap: "round" }}
            />
          );
        })}

        {/* Current Time Indicator Line */}
        <line x1={getX(history.length - 1)} y1="0" x2={getX(history.length - 1)} y2={height} stroke="#ef4444" strokeWidth="1" strokeDasharray="4 4" opacity={0.6} />
      </svg>
    </div>
  );
}

export default function OraclePage() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);

  // Settings
  const [startingCash, setStartingCash] = useState(100000);
  const [speed, setSpeed] = useState<"normal" | "fast">("normal");

  // Game Data
  const [activeTournaments, setActiveTournaments] = useState<any[]>([]);
  const [tournament, setTournament] = useState<any>(null);
  const [portfolio, setPortfolio] = useState<{ balance: number, holdings: any[] }>({ balance: 0, holdings: [] });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentPrices, setCurrentPrices] = useState<Record<string, number>>({});
  const [priceHistory, setPriceHistory] = useState<Record<string, number>[]>([]);
  const [news, setNews] = useState<TournamentNewsItem[]>([]);
  const [tickDay, setTickDay] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);

  // Trading form
  const [selectedStock, setSelectedStock] = useState("HBL");
  const [tradeQuantity, setTradeQuantity] = useState(10);

  // End of feed ref
  const newsEndRef = useRef<HTMLDivElement>(null);

  // Load Initial state
  useEffect(() => {
    checkTournament();
  }, [user]);

  useEffect(() => {
    newsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [news]);

  useEffect(() => {
    if (isGameOver && tournament?.id) {
      http.get(`/oracle/tournament/${tournament.id}/analysis`)
        .then((res: any) => {
          if (res && res.analysis) setAnalysis(res.analysis);
        })
        .catch(err => console.error("Failed to fetch analysis", err));
    }
  }, [isGameOver, tournament]);

  const fetchPortfolio = async () => {
    try {
      const res: any = await http.get("/oracle/tournament/portfolio");
      if (res) {
        setPortfolio(res);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const checkTournament = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res: any = await http.get("/oracle/tournament/list");
      if (Array.isArray(res)) {
        setActiveTournaments(res);
      }
    } catch (e) {
      console.log("Failed to fetch tournaments");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGame = async (t: any) => {
    try {
      setLoading(true);
      await http.post("/oracle/tournament/join", { tournamentId: t.id });
      setTournament(t);
      connectWS();
      fetchPortfolio();
      toast.success("Joined Tournament!");
    } catch (e) {
      toast.error("Failed to join");
    } finally {
      setLoading(false);
    }
  };

  const startTournament = async () => {
    try {
      setLoading(true);
      const res: any = await http.post("/oracle/tournament/start", { startingCash, speed });
      setTournament(res);
      connectWS();
      fetchPortfolio();
      toast.success("Joined Tournament!");
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

  const connectWS = () => {
    const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
    const WS_URL = process.env.NEXT_PUBLIC_WS_URL || (isLocalhost ? "http://localhost:3001" : "");

    const socket = io.connect(`${WS_URL}/tournament`, {
      withCredentials: true,
    });

    socket.on("connect", () => {
      console.log("Connected to Tournament Live Feed");
    });

    socket.on("tournamentTick", (data: { tick: any, news: any, leaderboard: LeaderboardEntry[] }) => {
      if (!data.tick || Object.keys(data.tick).length === 0 || data.tick.status === 'completed' || data.tick.day > 30) {
        return;
      }

      setTickDay(data.tick.day);
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
      setPriceHistory(prev => [...prev, prices]);

      if (data.news && data.news.length > 0) {
        data.news.forEach((n: any) => {
          toast(n.headline, {
            description: `DAY ${n.day} • ${n.sentiment.toUpperCase()}`,
            duration: 3000,
            icon: <Newspaper className="w-4 h-4 text-primary" />
          });
        });
        
        setTimeout(() => {
          setNews(prev => {
            const existing = new Set(prev.map(p => p.headline));
            const newItems = data.news.filter((n: any) => !existing.has(n.headline));
            return [...prev, ...newItems];
          });
        }, 3000);
      }

      // Auto refetch portfolio to catch dynamic leaderboard balance, though we can skip doing this on every tick.
      fetchPortfolio();
    });

    socket.on("tournamentEnd", (finalLeaderboard: LeaderboardEntry[]) => {
      setLeaderboard(finalLeaderboard);
      setIsGameOver(true);
      toast.success("Tournament Completed!");
    });

    return () => {
      socket.disconnect();
    };
  };

  const handleTrade = async (action: "buy" | "sell") => {
    try {
      await http.post(`/oracle/tournament/${action}`, {
        tournamentId: tournament.id,
        stockSymbol: selectedStock,
        quantity: tradeQuantity,
      });
      toast.success(`Successfully ${action === 'buy' ? 'bought' : 'sold'} ${tradeQuantity} ${selectedStock}`);
      fetchPortfolio();
    } catch (e: any) {
      toast.error(e.message || "Trade failed");
    }
  };

  const handleEndTournament = async () => {
    try {
      await http.post("/oracle/tournament/end", { tournamentId: tournament.id });
      toast.success("Tournament Ended prematurely. Please wait for the final whistle.");
    } catch (e: any) {
      if (e?.message === "Tournament not active" || e?.message?.includes("not active")) {
        toast.error("Tournament already ended. Returning to lobby.");
      } else {
        toast.error(e.message || "Failed to end tournament");
      }
    } finally {
      // Always reset back to lobby if we are trying to abort an untracked/stuck tournament
      setTournament(null);
      setIsGameOver(false);
      window.location.reload();
    }
  };

  const handleRestart = () => {
    window.location.reload();
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

  // Lobby View
  if (!tournament) {
    return (
      <AppShell>
        <PageHeader title="Tournament Oracle" description="Global 1-Month Real-Time Market Competition" />

        <div className="max-w-4xl mx-auto mt-8 space-y-12">

          <div className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Radio className="w-6 h-6 text-primary animate-pulse" /> Ongoing Games
            </h2>
            {activeTournaments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeTournaments.map(t => {
                  const isParticipant = t.participants?.some((p: any) => p.userId === user?.id);
                  return (
                    <Card key={t.id} className="bg-card shadow-lg border-primary/20 hover:border-primary/50 transition-colors">
                      <CardHeader>
                        <CardTitle className="text-xl flex justify-between items-center">
                          Global Tournament
                          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20">Active</Badge>
                        </CardTitle>
                        <CardDescription>Join in progress!</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Players:</span>
                          <span className="font-bold">{t.participants?.length || 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Starting Cash:</span>
                          <span className="font-bold">{formatDecimal(t.startingCash)} PKR</span>
                        </div>
                        <Button
                          className={cn("w-full font-bold", isParticipant ? "bg-primary" : "bg-emerald-600 hover:bg-emerald-700")}
                          onClick={() => handleJoinGame(t)}
                        >
                          <Play className="mr-2 w-4 h-4 fill-current" /> {isParticipant ? "Enter Game" : "Join Game"}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="bg-muted/30 border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Activity className="w-12 h-12 mb-4 opacity-20" />
                  <p>No ongoing games found.</p>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-muted" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-4 text-muted-foreground font-semibold">Or</span>
            </div>
          </div>

          <Card className="max-w-md mx-auto bg-card/60 backdrop-blur shadow-2xl border-primary/20">
            <CardHeader>
              <CardTitle>Start New Tournament</CardTitle>
              <CardDescription>Initialize your own global trading simulation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="text-sm font-semibold mb-2 block">Starting Cash (PKR)</label>
                <input
                  type="number"
                  value={startingCash}
                  onChange={e => setStartingCash(Number(e.target.value))}
                  className="w-full bg-background border px-3 py-2 rounded focus:ring-2 ring-primary outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-semibold mb-2 block">Simulation Speed</label>
                <div className="flex bg-muted rounded-md p-1">
                  <button
                    onClick={() => setSpeed("normal")}
                    className={cn("flex-1 py-1.5 text-sm rounded transition", speed === "normal" ? "bg-background shadow font-semibold" : "opacity-70")}
                  >
                    Normal (1 Month in 60 mins)
                  </button>
                  <button
                    onClick={() => setSpeed("fast")}
                    className={cn("flex-1 py-1.5 text-sm rounded transition", speed === "fast" ? "bg-background shadow font-semibold text-primary" : "opacity-70")}
                  >
                    Fast (1 Month in 5 mins)
                  </button>
                </div>
              </div>
              <Button size="lg" className="w-full font-semibold" onClick={startTournament}>
                <Play className="mr-2 w-5 h-5 fill-current" /> Initialize Global Tournament
              </Button>
            </CardContent>
          </Card>

        </div>
      </AppShell>
    );
  }

  // End Game View
  if (isGameOver) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto space-y-8 mt-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
          <div className="text-center space-y-4">
            <Trophy className="w-20 h-20 text-yellow-500 mx-auto" />
            <h1 className="text-4xl font-black">Tournament Finished</h1>
            <p className="text-muted-foreground text-lg">The market has closed. Here are the final results.</p>
          </div>

          <Card className="border-4 border-yellow-500/20 bg-card overflow-hidden">
            <div className="bg-muted px-6 py-4 flex items-center justify-between border-b">
              <div className="flex items-center gap-2 font-bold text-lg">
                <Users className="w-5 h-5 text-primary" /> Final Leaderboard
              </div>
            </div>
            <div className="divide-y">
              {leaderboard.map(entry => (
                <div key={entry.userId} className={cn(
                  "p-6 flex items-center justify-between transition-colors",
                  entry.userId === user?.id ? "bg-primary/10" : "hover:bg-muted/50"
                )}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-lg text-primary">
                      #{entry.rank}
                    </div>
                    <span className="font-semibold text-lg">{entry.username} {entry.userId === user?.id && <span className="text-sm text-primary font-normal ml-2">(You)</span>}</span>
                  </div>
                  <div className={cn("text-xl font-bold", entry.pnl >= 0 ? "text-emerald-500" : "text-red-500")}>
                    {entry.pnl >= 0 ? "+" : ""}{formatDecimal(entry.pnl)} PKR
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {analysis && (
            <Card className="border-4 border-primary/20 bg-card overflow-hidden">
              <div className="bg-muted px-6 py-4 flex items-center justify-between border-b">
                <div className="flex items-center gap-2 font-bold text-lg">
                  <Briefcase className="w-5 h-5 text-primary" /> AI Performance Analysis
                </div>
              </div>
              <div className="p-6 prose prose-invert max-w-none text-foreground/90 whitespace-pre-wrap leading-relaxed">
                {analysis}
              </div>
            </Card>
          )}

          <div className="flex justify-center">
            <Button size="lg" variant="outline" onClick={handleRestart}>
              Return To Lobby
            </Button>
          </div>
        </div>
      </AppShell>
    )
  }

  // Active Simulation View
  return (
    <AppShell>
      <PageHeader
        title="Tournament Oracle"
        description="Global 1-Month Real-Time Market Competition"
      />

      <div className="flex flex-col gap-6 mt-6">

        {/* Top Section: Charts & Leaderboard */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Col: Charts */}
          <div className="col-span-1 lg:col-span-3 space-y-6">
            <Card className="border-2 border-primary/20 shadow-xl shadow-primary/5 bg-card/95">
              <CardHeader className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center bg-muted/40 pb-4 border-b">
                <div className="mb-4 sm:mb-0">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Activity className="text-primary w-5 h-5 animate-pulse" /> Live Performance View
                  </CardTitle>
                  <CardDescription>Tracking percentage change from Day 1 | Time remaining: {30 - tickDay} Days</CardDescription>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {STOCKS.map((s, idx) => {
                    const startPrice = priceHistory[0]?.[s] || 0;
                    const curPrice = currentPrices[s] || 0;
                    const pctChange = startPrice ? (((curPrice - startPrice) / startPrice) * 100) : 0;
                    return (
                      <Badge key={s} variant="outline" className="px-2 py-1 flex items-center gap-1" style={{ borderColor: COLORS[idx] }}>
                        <span style={{ color: COLORS[idx] }} className="font-bold">{s}</span>
                        <span className="text-muted-foreground">{currentPrices[s] ? formatDecimal(currentPrices[s]) : "---"}</span>
                        <span className={cn("text-xs ml-1", pctChange >= 0 ? "text-emerald-400" : "text-red-400")}>
                          ({pctChange > 0 ? '+' : ''}{pctChange.toFixed(2)}%)
                        </span>
                      </Badge>
                    );
                  })}
                </div>
              </CardHeader>
              <CardContent className="pt-6 relative flex flex-col gap-8">
                <div className="w-full relative min-h-[280px]">
                  <div className="absolute -top-2 left-0 z-10 bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full border shadow-sm">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                       <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#3b82f6" }}></span> KSE 100 Benchmark
                    </h3>
                  </div>
                  <PercentageChart history={priceHistory} currentMinute={tickDay} stocksToRender={["PSX"]} colors={["#3b82f6"]} />
                </div>
                
                <div className="w-full h-[1px] bg-border/50"></div>

                <div className="w-full relative min-h-[280px]">
                  <div className="absolute -top-2 left-0 z-10 bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full border shadow-sm flex items-center gap-3">
                    <h3 className="text-sm font-bold text-foreground">Component Stocks</h3>
                  </div>
                  <PercentageChart history={priceHistory} currentMinute={tickDay} stocksToRender={["HBL", "UBL", "MCB", "HUBC", "FFC"]} colors={["#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"]} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Col: Leaderboard */}
          <div className="col-span-1 flex flex-col gap-6">
            <Card className="flex-1 flex flex-col overflow-hidden max-h-[660px]">
              <div className="bg-muted px-4 py-3 border-b flex items-center justify-between font-semibold">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" /> Leaderboard
                </div>
                <Badge variant="secondary" className="text-xs">{leaderboard.length} Players</Badge>
              </div>
              <div className="divide-y overflow-y-auto flex-1">
                {leaderboard.length === 0 ? (
                  <p className="p-6 text-center text-muted-foreground text-sm">Waiting for players...</p>
                ) : (
                  leaderboard.map((entry, idx) => (
                    <div key={entry.userId} className={cn(
                      "p-4 flex flex-col gap-1 transition-colors relative",
                      entry.userId === user?.id ? "bg-primary/10" : "hover:bg-muted/50"
                    )}>
                      {idx === 0 && <div className="absolute top-0 right-0 w-1 h-full bg-emerald-500" />}
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-sm">#{entry.rank} {entry.username} {entry.userId === user?.id && <span className="text-primary">(You)</span>}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground text-xs font-mono">PNL</span>
                        <span className={cn("font-bold font-mono tracking-tight", entry.pnl >= 0 ? "text-emerald-500" : "text-red-500")}>
                          {entry.pnl > 0 ? "+" : ""}{formatDecimal(entry.pnl)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
            <div className="flex justify-center pt-2">
              <Button variant="ghost" size="sm" onClick={handleEndTournament} className="text-muted-foreground text-xs hover:text-red-500 transition-colors">Abort Simulation</Button>
            </div>
          </div>
        </div>

        {/* Bottom Section: Trading Panel & Huge News Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-12">
          
          {/* Col 1: Terminal & Portfolio */}
          <div className="col-span-1 space-y-6">
            <Card className="bg-card/50 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Available Cash</p>
                  <p className="text-xl font-bold text-emerald-500">{formatDecimal(portfolio.balance)}</p>
                </div>
              </div>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 mb-2"><Radio className="w-5 h-5 text-primary" /> Trading Terminal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-muted-foreground">Select Asset</label>
                      <select
                        value={selectedStock}
                        onChange={e => setSelectedStock(e.target.value)}
                        className="w-full bg-background border px-3 py-2 rounded-md outline-none focus:ring-2 focus:ring-primary/50 transition"
                      >
                        {STOCKS.filter(s => s !== "PSX").map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-muted-foreground">Quantity</label>
                      <input
                        type="number"
                        value={tradeQuantity}
                        min="1"
                        onChange={e => setTradeQuantity(Number(e.target.value))}
                        className="w-full bg-background border px-3 py-2 rounded-md outline-none focus:ring-2 focus:ring-primary/50 transition font-mono"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button className="flex-1 bg-emerald-600/90 hover:bg-emerald-600 font-bold tracking-wide" onClick={() => handleTrade("buy")}>BUY POSITION</Button>
                    <Button className="flex-1 bg-red-600/90 hover:bg-red-600 font-bold tracking-wide" onClick={() => handleTrade("sell")}>SELL POSITION</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-muted/60">
              <CardHeader className="py-4 border-b bg-muted/20">
                <CardTitle className="flex items-center gap-2 text-base"><Briefcase className="w-4 h-4 text-primary" /> Your Active Portfolio</CardTitle>
              </CardHeader>
              <div className="p-0 overflow-y-auto max-h-[220px]">
                {portfolio.holdings.length === 0 ? (
                  <p className="text-center p-6 text-muted-foreground text-sm flex flex-col items-center gap-2">
                    <Activity className="w-8 h-8 opacity-20" />
                    You have no stock holdings yet.
                  </p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-muted text-muted-foreground text-xs uppercase tracking-wider">
                      <tr>
                        <th className="text-left px-4 py-2 font-medium">Asset</th>
                        <th className="text-right px-4 py-2 font-medium">Qty</th>
                        <th className="text-right px-4 py-2 font-medium">Avg Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {portfolio.holdings.map(h => (
                        <tr key={h.stockSymbol} className="hover:bg-muted/30">
                          <td className="px-4 py-2.5 font-bold transition-colors">{h.stockSymbol}</td>
                          <td className="px-4 py-2.5 text-right font-mono">{h.quantity}</td>
                          <td className="px-4 py-2.5 text-right font-mono">{formatDecimal(h.avgPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </Card>
          </div>

          {/* Col 2 & 3: Giant Live Market Feed */}
          <div className="col-span-1 lg:col-span-2 flex flex-col">
            <Card className="flex-1 flex flex-col shadow-lg border-primary/20 relative overflow-hidden min-h-[500px]">
              <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                <Newspaper className="w-48 h-48" />
              </div>
              <div className="bg-muted/80 backdrop-blur-md px-6 py-5 border-b shadow-sm z-10 flex items-center justify-between">
                <div className="flex items-center gap-3 font-bold text-xl text-foreground">
                  <Radio className="w-6 h-6 text-primary animate-pulse" /> Live Market News Feed
                </div>
                <Badge variant="outline" className="bg-background opacity-80">{news.length} updates</Badge>
              </div>
              <div className="flex-1 p-6 space-y-4 bg-muted/5 overflow-y-auto" style={{ maxHeight: '380px' }}>
                {news.length === 0 ? (
                  <div className="flex flex-col items-center justify-center pt-12 text-muted-foreground">
                     <Activity className="w-12 h-12 mb-4 opacity-20" />
                     <p className="text-lg">Awaiting market events...</p>
                  </div>
                ) : (
                  news.map((item, idx) => (
                    <div key={idx} className="bg-card border border-border/60 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow animate-in slide-in-from-left-4 fade-in duration-500">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="font-mono text-sm font-bold text-muted-foreground bg-muted/50 px-2 py-0.5">DAY {item.day}</Badge>
                          <Badge variant="outline" className={cn(
                            "text-xs uppercase px-2 py-0.5 border font-semibold tracking-wider",
                            item.sentiment === 'positive' && "bg-emerald-500/10 text-emerald-500 border-emerald-500/40",
                            item.sentiment === 'negative' && "bg-red-500/10 text-red-500 border-red-500/40",
                            item.sentiment === 'neutral' && "bg-slate-500/10 text-slate-500 border-slate-500/40"
                          )}>{item.sentiment}</Badge>
                        </div>
                      </div>
                      <p className="font-medium text-lg lg:text-xl leading-relaxed text-foreground/90 tracking-wide mt-1">
                        {item.headline}
                      </p>
                    </div>
                  ))
                )}
                <div ref={newsEndRef} />
              </div>
            </Card>
          </div>

        </div>

      </div>
    </AppShell>
  );
}
