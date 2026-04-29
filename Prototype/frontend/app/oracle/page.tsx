"use client";

import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useUser } from "@/context/UserContext";
import { AppShell } from "@/components/layout";
import { NeonIndicator } from "@/components/common";
import { Card } from "@/components/ui/card";
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

interface TournamentParticipant {
  userId: number;
  username: string;
  balance: number;
}

interface Tournament {
  id: number;
  participants?: TournamentParticipant[];
  startingCash: number;
  speed: string;
}

interface TournamentTick {
  day: number;
  status?: string;
  PSX: number;
  HBL: number;
  UBL: number;
  MCB: number;
  HUBC: number;
  FFC: number;
}

interface TournamentNews {
  day: number;
  headline: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}

interface Holding {
  stockSymbol: string;
  quantity: number;
  avgPrice: number;
}

interface TournamentPortfolio {
  balance: number;
  holdings: Holding[];
}

interface ApiError {
  message: string;
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

function PercentageChart({ history, stocksToRender, colors }: { history: Record<string, number>[], stocksToRender: string[], colors: string[] }) {
  if (history.length === 0) return <div className="h-full flex items-center justify-center text-muted-foreground">Waiting for market open...</div>;

  const firstPoint = history[0];
const data = history.map((point) => {
    const percentages: Record<string, number> = {};
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
const [activeTournaments, setActiveTournaments] = useState<Tournament[]>([]);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [portfolio, setPortfolio] = useState<TournamentPortfolio>({ balance: 0, holdings: [] });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    newsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [news]);

useEffect(() => {
    if (isGameOver && tournament?.id) {
      http.get(`/oracle/tournament/${tournament.id}/analysis`)
        .then((res) => {
          if (res && typeof res === 'object' && 'analysis' in res) {
            setAnalysis((res as { analysis: string }).analysis);
          }
        })
        .catch(err => console.error("Failed to fetch analysis", err));
    }
  }, [isGameOver, tournament]);

const fetchPortfolio = async () => {
    try {
      const res = await http.get("/oracle/tournament/portfolio");
      if (res) {
        setPortfolio(res as TournamentPortfolio);
      }
    } catch (e) {
      console.error(e);
    }
  };

const checkTournament = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await http.get("/oracle/tournament/list");
      if (Array.isArray(res)) {
        setActiveTournaments(res as Tournament[]);
      }
    } catch {
      console.log("Failed to fetch tournaments");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGame = async (t: Tournament) => {
    try {
      setLoading(true);
      await http.post("/oracle/tournament/join", { tournamentId: t.id });
      setTournament(t);
connectWS();
      fetchPortfolio();
      toast.success("Joined Tournament!");
    } catch {
      toast.error("Failed to join");
    } finally {
      setLoading(false);
    }
  };

const startTournament = async () => {
    try {
      setLoading(true);
      const res = await http.post("/oracle/tournament/start", { startingCash, speed });
      setTournament(res as Tournament);
      connectWS();
      fetchPortfolio();
      toast.success("Joined Tournament!");
    } catch {
      toast.error("Failed to start tournament");
    } finally {
      setLoading(false);
    }
};

  const connectWS = () => {
    const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
    const WS_URL = process.env.NEXT_PUBLIC_WS_URL || (isLocalhost ? "http://localhost:3001" : "https://tradeup-syai.onrender.com");

    const socket = io.connect(`${WS_URL}/tournament`, {
      withCredentials: true,
    });

socket.on("connect", () => {
      console.log("Connected to Tournament Live Feed");
    });

    socket.on("tournamentTick", (data: { tick: TournamentTick, news: TournamentNews[], leaderboard: LeaderboardEntry[] }) => {
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
        data.news.forEach((n: TournamentNews) => {
          toast(n.headline, {
            description: `DAY ${n.day} • ${n.sentiment.toUpperCase()}`,
            duration: 3000,
            icon: <Newspaper className="w-4 h-4 text-primary" />
          });
        });
        
        setTimeout(() => {
          setNews(prev => {
            const existing = new Set(prev.map(p => p.headline));
            const newItems = data.news.filter((n: TournamentNews) => !existing.has(n.headline));
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
    if (!tournament?.id) return;
    try {
      await http.post(`/oracle/tournament/${action}`, {
        tournamentId: tournament.id,
        stockSymbol: selectedStock,
        quantity: tradeQuantity,
      });
      toast.success(`Successfully ${action === 'buy' ? 'bought' : 'sold'} ${tradeQuantity} ${selectedStock}`);
      fetchPortfolio();
    } catch (e) {
      const error = e as ApiError;
      toast.error(error.message || "Trade failed");
    }
  };

  const handleEndTournament = async () => {
    if (!tournament?.id) return;
    try {
      await http.post("/oracle/tournament/end", { tournamentId: tournament.id });
      toast.success("Tournament Ended prematurely. Please wait for the final whistle.");
    } catch (e) {
      const error = e as ApiError;
      if (error?.message === "Tournament not active" || error?.message?.includes("not active")) {
        toast.error("Tournament already ended. Returning to lobby.");
      } else {
        toast.error(error.message || "Failed to end tournament");
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
        <div className="py-12 text-center space-y-4">
          <h1 className="text-7xl font-bold tracking-tighter text-primary">ORACLE_NO</h1>
          <p className="text-xl text-muted-foreground font-mono tracking-widest uppercase">Global 1-Month Real-Time Market Competition</p>
        </div>

        <div className="max-w-4xl mx-auto mt-8 space-y-12">

          <div className="space-y-6">
            <h2 className="text-label-caps flex items-center gap-3">
              <NeonIndicator className="bg-primary" /> ONGOING GAMES
            </h2>
            {activeTournaments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
{activeTournaments.map(t => {
                  const isParticipant = t.participants?.some((p: TournamentParticipant) => p.userId === user?.id);
                  return (
                    <div key={t.id} className="bg-card border border-primary rounded-2xl p-6 shadow-[0_0_20px_rgba(74,142,255,0.15)] flex flex-col justify-between">
                      <div className="space-y-2 mb-6">
                        <div className="flex justify-between items-center">
                          <h3 className="text-2xl font-bold">Global Tournament</h3>
                          <Badge variant="secondary" className="bg-primary/20 text-primary border-none text-[10px] tracking-widest font-bold">ACTIVE</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">Join in progress!</p>
                      </div>
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-label-caps text-muted-foreground">PLAYERS</span>
                            <span className="font-bold font-mono text-lg">{t.participants?.length || 0}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-label-caps text-muted-foreground">STARTING CASH</span>
                            <span className="font-bold font-mono text-lg">{formatDecimal(t.startingCash)} PKR</span>
                          </div>
                        </div>
                        <Button
                          className={cn("w-full text-label-caps", isParticipant ? "bg-primary hover:bg-[#5a9aff] shadow-[0_0_12px_rgba(74,142,255,0.4)] text-primary-foreground" : "bg-[#27ae60] hover:bg-[#2ecc71] shadow-[0_0_10px_rgba(39,174,96,0.3)] text-white")}
                          onClick={() => handleJoinGame(t)}
                        >
                          <Play className="mr-2 w-4 h-4 fill-current" /> {isParticipant ? "ENTER GAME" : "JOIN GAME"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-muted/30 border-2 border-dashed border-border/50 rounded-2xl">
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Activity className="w-12 h-12 mb-4 opacity-20" />
                  <p className="text-label-caps">NO ONGOING GAMES FOUND</p>
                </div>
              </div>
            )}
          </div>

          {user?.role === 'ADMIN' && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-muted" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-4 text-muted-foreground font-semibold">Or</span>
                </div>
              </div>

              <div className="bg-card/60 backdrop-blur shadow-2xl border border-primary/20 rounded-2xl max-w-md mx-auto p-6">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold mb-2">Start New Tournament</h3>
                  <p className="text-sm text-muted-foreground">Initialize your own global trading simulation.</p>
                </div>
                <div className="space-y-6">
                  <div>
                    <label className="text-label-caps mb-3 block text-muted-foreground">STARTING CASH (PKR)</label>
                    <input
                      type="number"
                      value={startingCash}
                      onChange={e => setStartingCash(Number(e.target.value))}
                      className="w-full bg-muted border-b-2 border-border border-x-0 border-t-0 px-3 py-2 focus:ring-0 focus:border-primary outline-none font-mono text-lg rounded-t-md rounded-b-none"
                    />
                  </div>
                  <div>
                    <label className="text-label-caps mb-3 block text-muted-foreground">SIMULATION SPEED</label>
                    <div className="flex bg-muted rounded-md p-1">
                      <button
                        onClick={() => setSpeed("normal")}
                        className={cn("flex-1 py-2 text-label-caps rounded transition-colors", speed === "normal" ? "bg-background shadow font-bold text-primary" : "text-muted-foreground hover:text-foreground")}
                      >
                        NORMAL (1M = 60m)
                      </button>
                      <button
                        onClick={() => setSpeed("fast")}
                        className={cn("flex-1 py-2 text-label-caps rounded transition-colors", speed === "fast" ? "bg-background shadow font-bold text-primary" : "text-muted-foreground hover:text-foreground")}
                      >
                        FAST (1M = 5m)
                      </button>
                    </div>
                  </div>
                  <Button size="lg" className="w-full text-label-caps hover:bg-[#5a9aff] shadow-[0_0_12px_rgba(74,142,255,0.4)]" onClick={startTournament}>
                    <Play className="mr-2 w-4 h-4 fill-current" /> INITIALIZE GLOBAL TOURNAMENT
                  </Button>
                </div>
              </div>
            </>
          )}

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
      <div className="py-8 flex justify-between items-center border-b border-border/50">
        <div>
          <h1 className="text-4xl font-bold tracking-tighter text-primary">ORACLE_NO</h1>
          <p className="text-sm text-muted-foreground font-mono tracking-widest uppercase mt-1">SIMULATION ACTIVE</p>
        </div>
        <div className="flex items-center gap-4">
          <NeonIndicator className="bg-emerald-500" />
          <span className="text-label-caps text-emerald-500 font-bold tracking-widest">LIVE CONNECTION</span>
        </div>
      </div>

      <div className="flex flex-col gap-6 mt-6">

        {/* Top Section: Charts & Leaderboard */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Col: Charts */}
          <div className="col-span-1 lg:col-span-3 space-y-6">
            <div className="border border-primary bg-card rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(74,142,255,0.15)] flex flex-col">
              <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center bg-muted/40 p-6 border-b border-border/50">
                <div className="mb-4 sm:mb-0">
                  <h2 className="flex items-center gap-3 text-label-caps mb-2 text-foreground">
                    <Activity className="text-primary w-5 h-5 animate-pulse" /> LIVE PERFORMANCE
                  </h2>
                  <p className="text-xs text-muted-foreground font-mono">TIME REMAINING: {30 - tickDay} DAYS</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {STOCKS.map((s, idx) => {
                    const startPrice = priceHistory[0]?.[s] || 0;
                    const curPrice = currentPrices[s] || 0;
                    const pctChange = startPrice ? (((curPrice - startPrice) / startPrice) * 100) : 0;
                    return (
                      <div key={s} className="px-3 py-1.5 flex items-center gap-2 rounded-lg border border-border bg-background">
                        <span style={{ color: COLORS[idx] }} className="text-label-caps font-bold">{s}</span>
                        <span className="text-muted-foreground font-mono text-sm">{currentPrices[s] ? formatDecimal(currentPrices[s]) : "---"}</span>
                        <span className={cn("text-xs font-mono font-bold ml-1", pctChange >= 0 ? "text-[#27ae60]" : "text-[#eb5757]")}>
                          ({pctChange > 0 ? '+' : ''}{pctChange.toFixed(2)}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="p-6 relative flex flex-col gap-8 flex-1">
                <div className="w-full relative min-h-[280px]">
                  <div className="absolute -top-4 left-0 z-10 px-3 py-1 bg-background border-none">
                    <h3 className="text-label-caps text-foreground flex items-center gap-2">
                       <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#3b82f6" }}></span> KSE 100 BENCHMARK
                    </h3>
                  </div>
                  <PercentageChart history={priceHistory} stocksToRender={["PSX"]} colors={["#3b82f6"]} />
                </div>
                
                <div className="w-full h-[1px] bg-border/50"></div>

                <div className="w-full relative min-h-[280px]">
                  <div className="absolute -top-4 left-0 z-10 px-3 py-1 bg-background border-none">
                    <h3 className="text-label-caps text-foreground">COMPONENT STOCKS</h3>
                  </div>
                  <PercentageChart history={priceHistory} stocksToRender={["HBL", "UBL", "MCB", "HUBC", "FFC"]} colors={["#10b981", "#f59e0b", "#eb5757", "#8b5cf6", "#ec4899"]} />
                </div>
              </div>
            </div>
          </div>

          {/* Right Col: Leaderboard */}
          <div className="col-span-1 flex flex-col gap-6">
            <div className="flex-1 flex flex-col overflow-hidden max-h-[660px] bg-secondary rounded-2xl border-none">
              <div className="bg-muted px-6 py-4 border-b border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-2 text-label-caps">
                  <Users className="w-4 h-4 text-primary" /> LEADERBOARD
                </div>
                <Badge variant="secondary" className="font-mono bg-primary/10 text-primary border-none text-[10px]">{leaderboard.length} PLAYERS</Badge>
              </div>
              <div className="divide-y divide-border/30 overflow-y-auto flex-1">
                {leaderboard.length === 0 ? (
                  <p className="p-8 text-center text-muted-foreground text-label-caps">WAITING FOR PLAYERS...</p>
                ) : (
                  leaderboard.map((entry) => (
                    <div key={entry.userId} className={cn(
                      "p-5 flex flex-col gap-2 transition-colors relative",
                      entry.userId === user?.id ? "bg-primary/10 border-l-4 border-primary" : "hover:bg-muted/30 border-l-4 border-transparent"
                    )}>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-foreground">#{entry.rank} {entry.username} {entry.userId === user?.id && <span className="text-primary ml-1">(YOU)</span>}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-label-caps text-muted-foreground">PNL</span>
                        <span className={cn("font-bold font-mono text-sm tracking-tight", entry.pnl >= 0 ? "text-[#27ae60]" : "text-[#eb5757]")}>
                          {entry.pnl > 0 ? "+" : ""}{formatDecimal(entry.pnl)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="flex justify-center pt-2">
              <Button variant="ghost" size="sm" onClick={handleEndTournament} className="text-muted-foreground text-xs hover:text-red-500 transition-colors">Abort Simulation</Button>
            </div>
          </div>
        </div>

        {/* Bottom Section: Trading Panel & Huge News Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-12">
          
          {/* Col 1: Terminal & Portfolio */}
          <div className="col-span-1 space-y-6">
            <div className="bg-card border border-primary/30 rounded-2xl overflow-hidden shadow-lg relative">
              <div className="p-6 pb-2 border-b border-border/50 flex justify-between items-center">
                <h3 className="flex items-center gap-3 text-label-caps"><Radio className="w-4 h-4 text-primary" /> TRADING TERMINAL</h3>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground tracking-widest uppercase font-bold mb-1">AVAILABLE CASH</p>
                  <p className="text-lg font-mono font-bold text-[#27ae60]">{formatDecimal(portfolio.balance)}</p>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-label-caps text-muted-foreground block">SELECT ASSET</label>
                      <select
                        value={selectedStock}
                        onChange={e => setSelectedStock(e.target.value)}
                        className="w-full bg-muted border-b-2 border-border border-x-0 border-t-0 px-3 py-3 focus:ring-0 focus:border-primary outline-none text-lg font-bold rounded-t-md rounded-b-none transition-colors"
                      >
                        {STOCKS.filter(s => s !== "PSX").map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-label-caps text-muted-foreground block">QUANTITY</label>
                      <input
                        type="number"
                        value={tradeQuantity}
                        min="1"
                        onChange={e => setTradeQuantity(Number(e.target.value))}
                        className="w-full bg-muted border-b-2 border-border border-x-0 border-t-0 px-3 py-3 focus:ring-0 focus:border-primary outline-none font-mono text-lg rounded-t-md rounded-b-none transition-colors"
                      />
                    </div>
                  </div>
                  <div className="flex gap-4 pt-4">
                    <Button className="flex-1 bg-[#27ae60] hover:bg-[#2ecc71] shadow-[0_0_12px_rgba(39,174,96,0.3)] text-white text-label-caps py-6" onClick={() => handleTrade("buy")}>BUY</Button>
                    <Button className="flex-1 bg-[#eb5757] hover:bg-[#ff7675] shadow-[0_0_12px_rgba(235,87,87,0.3)] text-white text-label-caps py-6" onClick={() => handleTrade("sell")}>SELL</Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-secondary border-none rounded-2xl overflow-hidden">
              <div className="py-5 px-6 border-b border-border/50 flex items-center gap-3">
                <Briefcase className="w-4 h-4 text-primary" /> <span className="text-label-caps">ACTIVE PORTFOLIO</span>
              </div>
              <div className="p-0 overflow-y-auto max-h-[220px]">
                {portfolio.holdings.length === 0 ? (
                  <p className="text-center p-8 text-muted-foreground text-label-caps flex flex-col items-center gap-4">
                    <Activity className="w-8 h-8 opacity-20" />
                    NO HOLDINGS YET
                  </p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-muted text-muted-foreground text-label-caps">
                      <tr>
                        <th className="text-left px-6 py-3 font-bold">ASSET</th>
                        <th className="text-right px-6 py-3 font-bold">QTY</th>
                        <th className="text-right px-6 py-3 font-bold">AVG PRICE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {portfolio.holdings.map(h => (
                        <tr key={h.stockSymbol} className="hover:bg-muted/30">
                          <td className="px-6 py-4 font-bold text-lg">{h.stockSymbol}</td>
                          <td className="px-6 py-4 text-right font-mono text-base">{h.quantity}</td>
                          <td className="px-6 py-4 text-right font-mono text-base text-primary">{formatDecimal(h.avgPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          {/* Col 2 & 3: Giant Live Market Feed */}
          <div className="col-span-1 lg:col-span-2 flex flex-col">
            <div className="flex-1 flex flex-col bg-card rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.2)] border border-transparent hover:border-primary/20 transition-colors overflow-hidden min-h-[500px]">
              <div className="bg-muted px-6 py-5 border-b border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-3 text-label-caps text-foreground">
                  <Radio className="w-5 h-5 text-primary animate-pulse" /> LIVE MARKET FEED
                </div>
                <Badge variant="secondary" className="bg-primary/10 text-primary border-none font-mono text-[10px]">{news.length} UPDATES</Badge>
              </div>
              <div className="flex-1 p-6 space-y-6 bg-background overflow-y-auto" style={{ maxHeight: '420px' }}>
                {news.length === 0 ? (
                  <div className="flex flex-col items-center justify-center pt-16 text-muted-foreground">
                     <Activity className="w-12 h-12 mb-6 opacity-20" />
                     <p className="text-label-caps">AWAITING MARKET EVENTS...</p>
                  </div>
                ) : (
                  news.map((item, idx) => (
                    <div key={idx} className="bg-secondary border border-transparent hover:border-primary/30 rounded-xl p-6 transition-all">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="font-mono text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 border-none">DAY {item.day}</Badge>
                          <Badge variant="outline" className={cn(
                            "text-[10px] tracking-widest font-bold border-none",
                            item.sentiment === 'positive' && "bg-[#27ae60]/10 text-[#27ae60]",
                            item.sentiment === 'negative' && "bg-[#eb5757]/10 text-[#eb5757]",
                            item.sentiment === 'neutral' && "bg-slate-500/10 text-slate-500"
                          )}>{item.sentiment.toUpperCase()}</Badge>
                        </div>
                      </div>
                      <p className="text-xl font-medium leading-relaxed text-foreground tracking-tight">
                        {item.headline}
                      </p>
                    </div>
                  ))
                )}
                <div ref={newsEndRef} />
              </div>
            </div>
          </div>

        </div>

      </div>
    </AppShell>
  );
}
