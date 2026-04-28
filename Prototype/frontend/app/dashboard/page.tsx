"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { Plus, Minus, Check, RefreshCcw, ChevronUp, ChevronDown, Search, Flame, TrendingUp, TrendingDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { isBalanceUnset } from "@/lib/userService";
import { formatUSD } from "@/lib/format";
import { AppShell } from "@/components/layout";
import { PageHeader, EmptyState } from "@/components/common";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { http, ApiException } from "@/lib/http";
import { formatDecimal, formatPercent, formatVolume, formatTimeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Tick {
  c?: number;
  price?: number;
  p?: number;
  chg?: number;
  change?: number;
  chgPct?: number;
  changePct?: number;
  pct?: number;
  percentChange?: number;
  changePercent?: number;
  pc?: number;
  prev?: number;
  previous?: number;
  prevClose?: number;
  v?: number;
  volume?: number;
}

interface StockData {
  symbol: string;
  name?: string | null;
  marketType?: string;
  tick?: Tick | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [featured, setFeatured] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [watchlist, setWatchlist] = useState<Set<string>>(new Set());
  const [watchlistRows, setWatchlistRows] = useState<StockData[]>([]);
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [removing, setRemoving] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"all" | "hot" | "gainers" | "losers">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [insights, setInsights] = useState<{
    gainers: StockData[];
    losers: StockData[];
    hot: StockData[];
  }>({
    gainers: [],
    losers: [],
    hot: [],
  });

  const [showWalletPopup, setShowWalletPopup] = useState<boolean>(false);
  const [sortConfig, setSortConfig] = useState<{ key: "pct" | null; direction: "asc" | "desc" | null }>({
    key: "pct",
    direction: null,
  });

  const { user, refreshUser } = useUser() || {};
  const tokenRef = useRef<string | null>(null);

  // Load token from localStorage once on mount
  useEffect(() => {
    tokenRef.current =
      (typeof window !== "undefined" && localStorage.getItem("access_token")) || null;
  }, []);

  const normalizeStock = useCallback((json: Record<string, unknown>, fallbackSymbol?: string): StockData => {
    const stock = (json?.stock as Record<string, unknown>) ?? json ?? {};
    return {
      symbol: (stock.symbol as string) ?? fallbackSymbol ?? "—",
      name: (stock.name as string) ?? null,
      marketType: (stock.marketType as string) ?? "REG",
      tick: (json?.tick ?? stock?.tick ?? json?.currentTick ?? null) as Tick | null,
    };
  }, []);

  const fetchFeatured = useCallback(async () => {
    setError(null);
    try {
      const json = await http.get<StockData[]>("/stocks/featured", { noAuth: true });
      setFeatured(Array.isArray(json) ? json : []);
      setLastUpdated(new Date());
    } catch (e) {
      const message = e instanceof ApiException ? e.message : "Failed to load stocks";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchInsights = useCallback(async () => {
    try {
      const json = await http.get<{ gainers: Record<string, unknown>[]; losers: Record<string, unknown>[]; hot: Record<string, unknown>[] }>("/stocks/insights", { noAuth: true });
      if (json) {
        setInsights({
          gainers: (json.gainers || []).map(x => normalizeStock(x)),
          losers: (json.losers || []).map(x => normalizeStock(x)),
          hot: (json.hot || []).map(x => normalizeStock(x)),
        });
      }
    } catch (e) {
      console.error("Failed to fetch insights:", e);
    }
  }, [normalizeStock]);

  const fetchWatchlist = useCallback(async () => {
    if (!tokenRef.current) {
      setWatchlist(new Set());
      setWatchlistRows([]);
      return;
    }
    try {
      const json = await http.get<{ symbols?: string[] } | { symbol: string }[]>("/watchlist");
      let symbols: string[] = [];
      if (Array.isArray(json)) {
        symbols = json.map((x) => x?.symbol).filter(Boolean);
      } else if (Array.isArray(json?.symbols)) {
        symbols = json.symbols.filter((s) => typeof s === "string");
      }

      setWatchlist(new Set(symbols));

      const rows = await Promise.all(
        symbols.map(async (sym) => {
          try {
            const raw = await http.get<Record<string, unknown>>(`/stocks/${encodeURIComponent(sym)}`);
            return normalizeStock(raw, sym);
          } catch {
            return { symbol: sym, name: null, marketType: "REG", tick: null };
          }
        })
      );
      setWatchlistRows(rows);
    } catch {
      setWatchlist(new Set());
      setWatchlistRows([]);
    }
  }, [normalizeStock]);

  useEffect(() => {
    // Show wallet popup for new users who haven't funded yet
    if (isBalanceUnset(user?.balance)) {
      setShowWalletPopup(true);
    }
  }, [user?.balance]);

  useEffect(() => {
    fetchFeatured();
    fetchWatchlist();
    fetchInsights();

    const idFeatured = setInterval(fetchFeatured, 10_000);
    const idInsights = setInterval(fetchInsights, 20_000);
    const idWatch = setInterval(() => {
      if (tokenRef.current) fetchWatchlist();
    }, 30_000);

    const onVis = () => {
      if (document.hidden) {
        clearInterval(idFeatured);
        clearInterval(idWatch);
        clearInterval(idInsights);
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      clearInterval(idFeatured);
      clearInterval(idWatch);
      clearInterval(idInsights);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [fetchFeatured, fetchWatchlist, fetchInsights]);

  const saveSymbol = useCallback(async (symbol: string) => {
    if (!tokenRef.current) {
      toast.error("Please sign in to use your watchlist.");
      return;
    }
    if (saving.has(symbol) || watchlist.has(symbol)) return;

    const nextSaving = new Set(saving);
    nextSaving.add(symbol);
    setSaving(nextSaving);

    try {
      await http.post("/watchlist", { symbol });

      let normalized: StockData = { symbol, name: null, marketType: "REG", tick: null };
      try {
        const raw = await http.get<Record<string, unknown>>(`/stocks/${encodeURIComponent(symbol)}`);
        normalized = normalizeStock(raw, symbol);
      } catch {
        // ignore; keep minimal fallback
      }

      const next = new Set(watchlist);
      next.add(symbol);
      setWatchlist(next);
      setWatchlistRows((prev) => [normalized, ...prev]);
      toast.success(`${symbol} added to watchlist`);
    } catch (e) {
      const message = e instanceof ApiException ? e.message : "Could not save to watchlist.";
      toast.error(message);
    } finally {
      const s2 = new Set(saving);
      s2.delete(symbol);
      setSaving(s2);
    }
  }, [normalizeStock, saving, watchlist]);

  const removeSymbol = useCallback(async (symbol: string) => {
    if (!tokenRef.current) return;
    if (removing.has(symbol)) return;

    const nextRemoving = new Set(removing);
    nextRemoving.add(symbol);
    setRemoving(nextRemoving);

    try {
      await http.delete(`/watchlist/${encodeURIComponent(symbol)}`);
      const next = new Set(watchlist);
      next.delete(symbol);
      setWatchlist(next);
      setWatchlistRows((prev) => prev.filter((r) => r?.symbol !== symbol));
      toast.success(`${symbol} removed from watchlist`);
    } catch (e) {
      const message = e instanceof ApiException ? e.message : "Could not remove from watchlist.";
      toast.error(message);
    } finally {
      const r2 = new Set(removing);
      r2.delete(symbol);
      setRemoving(r2);
    }
  }, [removing, watchlist]);

  // Note: refreshUser is already called by UserContext on mount,
  // so we don't need to call it again here.

  const handleFundWallet = async (amount: number) => {
    try {
      if (!user) return;
      await http.post("/users/fund-wallet", { amount });
      await refreshUser?.();
      setShowWalletPopup(false);
      toast.success(`${formatUSD(amount)} added to your wallet`);
    } catch (error) {
      console.error("Error funding wallet:", error);
      toast.error("Failed to fund wallet");
    }
  };

  const toggleSort = (key: "pct") => {
    setSortConfig((prev) => {
      if (prev.key !== key) return { key, direction: "desc" };
      if (prev.direction === "desc") return { key, direction: "asc" };
      if (prev.direction === "asc") return { key, direction: null };
      return { key, direction: "desc" };
    });
  };

  const getSortedItems = useCallback((items: StockData[]) => {
    if (!sortConfig.key || !sortConfig.direction) return items;

    return [...items].sort((a, b) => {
      const { pct: pctA } = getChange(a.tick);
      const { pct: pctB } = getChange(b.tick);

      const aVal = isFinite(pctA) ? pctA : -Infinity;
      const bVal = isFinite(pctB) ? pctB : -Infinity;

      if (sortConfig.direction === "asc") return aVal - bVal;
      return bVal - aVal;
    });
  }, [sortConfig]);

  const handleRowClick = (symbol: string) => {
    router.push(`/charts?symbol=${encodeURIComponent(symbol)}`);
  };

  const activeItems = activeTab === "all" 
      ? featured 
      : activeTab === "hot" 
        ? insights.hot 
        : activeTab === "gainers" 
          ? insights.gainers 
          : insights.losers;

  const filteredItems = getSortedItems(activeItems).filter(s => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return s.symbol.toLowerCase().includes(q) || (s.name && s.name.toLowerCase().includes(q));
  });

  return (
    <AppShell requireAuth={false}>
      {/* Wallet Popup */}
      {showWalletPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle>Fund Your Wallet</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const amount = parseFloat(formData.get("amount") as string);
                  if (amount > 0) handleFundWallet(amount);
                }}
              >
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Input
                      id="amount"
                      name="amount"
                      type="number"
                      placeholder="Enter amount"
                      required
                      min="1"
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Add Funds
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      <PageHeader
        title="Market Snapshot"
        description="Live stock activity from Pakistan Stock Exchange"
        actions={
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-xs text-muted-foreground">
                Updated {formatTimeAgo(lastUpdated)}
              </span>
            )}
            <Button
              onClick={() => {
                setLoading(true);
                fetchFeatured();
                fetchWatchlist();
              }}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        }
      />

      {/* Watchlist Section */}
      {tokenRef.current && (
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle>Your Watchlist</CardTitle>
              {watchlistRows.length === 0 && (
                <span className="text-sm text-muted-foreground">
                  No stocks yet — add from the Market Snapshot list.
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {watchlistRows.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Last</TableHead>
                    <TableHead 
                      className="text-right cursor-pointer select-none hover:text-foreground transition-colors"
                      onClick={() => toggleSort("pct")}
                    >
                      <div className="flex items-center justify-end gap-1">
                        % Change
                        {sortConfig.key === "pct" && (
                          sortConfig.direction === "asc" ? <ChevronUp className="h-4 w-4" /> : 
                          sortConfig.direction === "desc" ? <ChevronDown className="h-4 w-4" /> : null
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Volume</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getSortedItems(watchlistRows).map((row, i) => {
                    const s = row?.symbol ?? `w-${i}`;
                    const price = getPrice(row?.tick);
                    const { pct } = getChange(row?.tick);
                    const vol = getVolume(row?.tick);
                    const isRemoving = removing.has(s);

                    return (
                      <TableRow 
                        key={s}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handleRowClick(s)}
                      >
                        <TableCell className="font-medium">{row?.symbol ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{row?.name ?? "—"}</TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          {formatDecimal(price)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant="outline"
                            className={cn(
                              "font-mono rounded-sm border-transparent px-2 py-0.5",
                              pct > 0 ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20" :
                              pct < 0 ? "bg-rose-500/10 text-rose-500 hover:bg-rose-500/20" :
                              "bg-muted text-muted-foreground"
                            )}
                          >
                            {formatPercent(pct)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatVolume(vol)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeSymbol(s);
                            }}
                            disabled={isRemoving}
                          >
                            {isRemoving ? (
                              <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            ) : (
                              <Minus className="h-3 w-3" />
                            )}
                            <span className="ml-1">Remove</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <EmptyState variant="watchlist" />
            )}
          </CardContent>
        </Card>
      )}

      {/* Market Snapshot Section */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3">
              <CardTitle>Market Snapshot</CardTitle>
              {error && <Badge variant="error">{error}</Badge>}
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search symbols..."
                  className="pl-8 bg-secondary border-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap items-center gap-1 bg-muted/50 p-1 rounded-lg w-full sm:w-auto">
                <button
                onClick={() => setActiveTab("all")}
                className={cn(
                  "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                  activeTab === "all" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                All
              </button>
              <button
                onClick={() => setActiveTab("hot")}
                title="Top 10 stocks with the highest total value traded (turnover) today."
                className={cn(
                  "px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1.5",
                  activeTab === "hot" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Flame className="h-4 w-4 text-orange-500" /> Hot
              </button>
              <button
                onClick={() => setActiveTab("gainers")}
                title="Top 10 highest percentage price increases today."
                className={cn(
                  "px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1.5",
                  activeTab === "gainers" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <TrendingUp className="h-4 w-4 text-emerald-500" /> Gainers
              </button>
              <button
                onClick={() => setActiveTab("losers")}
                title="Top 10 highest percentage price decreases today."
                className={cn(
                  "px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1.5",
                  activeTab === "losers" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <TrendingDown className="h-4 w-4 text-rose-500" /> Losers
              </button>
            </div>
          </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <SkeletonTable />
          ) : filteredItems.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Last</TableHead>
                  <TableHead 
                    className="text-right cursor-pointer select-none hover:text-foreground transition-colors"
                    onClick={() => toggleSort("pct")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      % Change
                      {sortConfig.key === "pct" && (
                        sortConfig.direction === "asc" ? <ChevronUp className="h-4 w-4" /> : 
                        sortConfig.direction === "desc" ? <ChevronDown className="h-4 w-4" /> : null
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Volume</TableHead>
                  <TableHead className="text-right">Watch</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((row, i) => {
                  const s = row?.symbol ?? `${activeTab}-${i}`;
                  const price = getPrice(row?.tick);
                  const { pct } = getChange(row?.tick);
                  const vol = getVolume(row?.tick);
                  const isSaved = watchlist.has(s);
                  const isSaving = saving.has(s);
                  const canSave = !!tokenRef.current && !isSaved && !isSaving;

                  return (
                    <TableRow 
                      key={s}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleRowClick(s)}
                    >
                      <TableCell className="font-medium">{row?.symbol ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{row?.name ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {formatDecimal(price)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-mono rounded-sm border-transparent px-2 py-0.5",
                            pct > 0 ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20" :
                            pct < 0 ? "bg-rose-500/10 text-rose-500 hover:bg-rose-500/20" :
                            "bg-muted text-muted-foreground"
                          )}
                        >
                          {formatPercent(pct)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatVolume(vol)}
                      </TableCell>
                      <TableCell className="text-right">
                        {isSaved ? (
                          <Badge variant="success">
                            <Check className="mr-1 h-3 w-3" /> Saved
                          </Badge>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              saveSymbol(s);
                            }}
                            disabled={!canSave}
                            title={tokenRef.current ? "Save to watchlist" : "Sign in to save"}
                          >
                            {isSaving ? (
                              <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            ) : (
                              <Plus className="h-3 w-3" />
                            )}
                            <span className="ml-1">Save</span>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              variant="search"
              description={`No stocks found matching "${searchQuery}"`}
            />
          )}
        </CardContent>
      </Card>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Early read-only view for prices. Live ticks can replace polling next.
      </p>
    </AppShell>
  );
}

/* ---------------- Skeleton ---------------- */
function SkeletonTable() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: 8 }).map((__, j) => (
            <div key={j} className="h-4 w-24 rounded bg-muted animate-pulse" />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ---------------- Field mappers & formatting ---------------- */
function getPrice(tick: Tick | null | undefined): number {
  if (!tick) return NaN;
  return num(tick.c ?? tick.price ?? tick.p);
}

function getChange(tick: Tick | null | undefined): { chg: number; pct: number } {
  if (!tick) return { chg: NaN, pct: NaN };

  const chg = num(tick.chg ?? tick.change);
  let pct = num(tick.chgPct ?? tick.changePct ?? tick.pct ?? tick.percentChange ?? tick.changePercent);

  if (!isFinite(pct)) {
    const price = num(tick.c ?? tick.price ?? tick.p);
    const prev = num(
      tick.pc ?? tick.prev ?? tick.previous ?? tick.prevClose ??
      (isFinite(price) && isFinite(chg) ? price - chg : NaN)
    );
    pct = isFinite(prev) && prev !== 0 && isFinite(chg) ? (chg / prev) * 100 : NaN;
  }

  return { chg: isFinite(chg) ? chg : NaN, pct: isFinite(pct) ? pct : NaN };
}

function getVolume(tick: Tick | null | undefined): number {
  if (!tick) return NaN;
  return num(tick.v ?? tick.volume);
}

function num(x: unknown): number {
  const n = typeof x === "string" ? parseFloat(x) : x;
  return typeof n === "number" && isFinite(n) ? n : NaN;
}
