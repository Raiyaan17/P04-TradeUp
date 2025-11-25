"use client";
import React from "react";
import { useRouter } from "next/navigation";
import TopBar from '@/components/topbar';

/**
 * Dashboard — PSX stocks list + Watchlist (add/remove)
 *
 * Shows:
 *  - Your Watchlist (authenticated) — with Remove action
 *  - Featured stocks — with Save to watchlist
 *  - Auto-refresh Featured every 10s
 *
 * Endpoints assumed (tweak paths if yours differ):
 *  - GET  /stocks/featured                 -> Array<{ symbol, name?, marketType, tick }>
 *  - GET  /stocks/:symbol                  -> { symbol, name?, marketType, tick }
 *  - GET  /watchlist                       -> { symbols: string[] } OR Array<{ symbol: string }>
 *  - POST /watchlist       body: {symbol}  -> 200/201
 *  - DELETE /watchlist/:symbol             -> 200/204
 */

interface Tick {
  c?: number;
  price?: number;
  p?: number;
  chg?: number;
  change?: number;
  chgPct?: number;
  changePct?: number;
  pct?: number;
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

interface ApiStockResponse {
  stock?: StockData;
  tick?: Tick;
  currentTick?: Tick;
  symbol?: string;
  name?: string | null;
  marketType?: string;
}

interface WatchlistResponse {
  symbols?: string[];
}

interface WatchlistItem {
  symbol: string;
}

export default function DashboardPage() {
  const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE_URL
      ? process.env.NEXT_PUBLIC_API_BASE_URL
      : "http://localhost:3001";

  const [featured, setFeatured] = React.useState<StockData[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null);

  const [watchlist, setWatchlist] = React.useState<Set<string>>(new Set());
  const [watchlistRows, setWatchlistRows] = React.useState<StockData[]>([]);
  const [saving, setSaving] = React.useState<Set<string>>(new Set());
  const [removing, setRemoving] = React.useState<Set<string>>(new Set());

  const tokenRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    tokenRef.current =
      (typeof window !== "undefined" && localStorage.getItem("access_token")) || null;
  }, []);

  const [authed, setAuthed] = React.useState(false);
  React.useEffect(() => {
    setAuthed(!!tokenRef.current);
  }, []);

  const router = useRouter();
  function signOut() {
    // Clear token
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
    }
    tokenRef.current = null;
    setAuthed(false);
    setWatchlist(new Set());
    setWatchlistRows([]);

    router.push("/");
  }



  // ---------- Tiny API helpers ----------
  async function apiGet(path: string): Promise<unknown> {
    const res = await fetch(`${API_BASE}${path}`, {
      cache: "no-store",
      headers: tokenRef.current ? { Authorization: `Bearer ${tokenRef.current}` } : {},
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((json as { message?: string; error?: string })?.message || (json as { message?: string; error?: string })?.error || "Request failed");
    return json;
  }
  async function apiPost(path: string, body: Record<string, unknown>): Promise<unknown> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(tokenRef.current ? { Authorization: `Bearer ${tokenRef.current}` } : {}),
      },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((json as { message?: string; error?: string })?.message || (json as { message?: string; error?: string })?.error || "Request failed");
    return json;
  }
  async function apiDelete(path: string): Promise<unknown> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "DELETE",
      headers: tokenRef.current ? { Authorization: `Bearer ${tokenRef.current}` } : {},
    });
    // Some APIs return no JSON on 204; be tolerant:
    let json: Record<string, unknown> = {};
    try { json = await res.json(); } catch {}
    if (!res.ok) throw new Error(json?.message as string || json?.error as string || "Request failed");
    return json;
  }
  // Normalize any /stocks/:symbol shape into the featured-row shape
function normalizeStock(json: ApiStockResponse, fallbackSymbol?: string): StockData {
  const stock = json?.stock ?? json ?? {};
  return {
    symbol: stock.symbol ?? fallbackSymbol ?? "—",
    name: stock.name ?? null,
    marketType: stock.marketType ?? "REG",
    // tick could be at json.tick, json.stock.tick, or json.currentTick
    tick: json?.tick ?? stock?.tick ?? json?.currentTick ?? null,
  };
}

  // ---------- Loaders ----------
  const fetchFeatured = React.useCallback(async () => {
    setError(null);
    try {
      const json = await apiGet("/stocks/featured");
      setFeatured(Array.isArray(json) ? json as StockData[] : []);
      setLastUpdated(new Date());
    } catch (e: unknown) {
      setError((e as Error)?.message || "Failed to load stocks");
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  const fetchWatchlist = React.useCallback(async () => {
  if (!tokenRef.current) {
    setWatchlist(new Set());
    setWatchlistRows([]);
    return;
  }
  try {
    const json = await apiGet("/watchlist");
    let symbols: string[] = [];
    if (Array.isArray(json)) symbols = (json as WatchlistItem[]).map((x) => x?.symbol).filter(Boolean);
    else if (Array.isArray((json as WatchlistResponse)?.symbols)) symbols = ((json as WatchlistResponse).symbols || []).filter((s) => typeof s === "string");

    setWatchlist(new Set(symbols));

    // Hydrate rows into the same shape as featured
    const rows = await Promise.all(
      symbols.map(async (sym) => {
        try {
          const raw = await apiGet(`/stocks/${encodeURIComponent(sym)}`);
          return normalizeStock(raw as ApiStockResponse, sym);
        } catch {
          // still keep a minimal row if detail fetch fails
          return { symbol: sym, name: null, marketType: "REG", tick: null };
        }
      })
    );
    setWatchlistRows(rows);
  } catch {
    setWatchlist(new Set());
    setWatchlistRows([]);
  }
}, [API_BASE]);


React.useEffect(() => {
  fetchFeatured();
  fetchWatchlist();

  // Refresh featured often; watchlist a bit less to reduce load.
  const idFeatured = setInterval(fetchFeatured, 10_000);
  const idWatch = setInterval(() => {
    if (tokenRef.current) fetchWatchlist();
  }, 30_000);

  // Optional: pause when tab is hidden
  const onVis = () => {
    if (document.hidden) {
      clearInterval(idFeatured);
      clearInterval(idWatch);
    }
  };
  document.addEventListener("visibilitychange", onVis);

  return () => {
    clearInterval(idFeatured);
    clearInterval(idWatch);
    document.removeEventListener("visibilitychange", onVis);
  };
}, [fetchFeatured, fetchWatchlist]);

  // ---------- Actions ----------
  async function saveSymbol(symbol: string) {
  if (!tokenRef.current) {
    alert("Please sign in to use your watchlist.");
    return;
  }
  if (saving.has(symbol) || watchlist.has(symbol)) return;

  const nextSaving = new Set(saving);
  nextSaving.add(symbol);
  setSaving(nextSaving);

  try {
    await apiPost("/watchlist", { symbol });

    // Immediately fetch the fully-detailed row and prepend it
    let normalized = { symbol, name: null, marketType: "REG", tick: null };
    try {
      const raw = await apiGet(`/stocks/${encodeURIComponent(symbol)}`);
      normalized = normalizeStock(raw, symbol);
    } catch {
      // ignore; keep minimal fallback
    }

    const next = new Set(watchlist);
    next.add(symbol);
    setWatchlist(next);
    setWatchlistRows((prev) => [normalized, ...prev]);
  } catch (e: unknown) {
    alert((e as Error)?.message || "Could not save to watchlist.");
  } finally {
    const s2 = new Set(nextSaving);
    s2.delete(symbol);
    setSaving(s2);
  }
}

  async function removeSymbol(symbol: string) {
    if (!tokenRef.current) return;
    if (removing.has(symbol)) return;

    const nextRemoving = new Set(removing);
    nextRemoving.add(symbol);
    setRemoving(nextRemoving);

    try {
      await apiDelete(`/watchlist/${encodeURIComponent(symbol)}`);
      const next = new Set(watchlist);
      next.delete(symbol);
      setWatchlist(next);
      setWatchlistRows((prev) => prev.filter((r) => r?.symbol !== symbol));
    } catch (e: unknown) {
      alert((e as Error)?.message || "Could not remove from watchlist.");
    } finally {
      const r2 = new Set(nextRemoving);
      r2.delete(symbol);
      setRemoving(r2);
    }
  }

  // ---------- UI ----------
  return (
    <main className="min-h-screen w-full bg-[#111418]">
      <TopBar/>
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex items-center justify-between mx-10">
          <div>
            <h2 className="text-base text-[#9BA1A6] text-lg font-bold">Featured PSX stocks</h2>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-xs text-[#9BA1A6]">Updated {timeAgo(lastUpdated)}</span>
            )}
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                fetchFeatured();
                fetchWatchlist();
              }}
              className="rounded-lg bg-[#22c55e] px-4 py-2 text-sm text-white font-medium shadow hover:bg-[#16a34a] transition"
            >
              Refresh
            </button>
          </div>
        </header>

        {/* Watchlist Section */}
        {tokenRef.current && (
          <section className="mb-6 bg-[#181B20] rounded-3xl text-white shadow flex flex-col gap-2 p-7">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold">Your Watchlist</h2>
              {watchlistRows.length === 0 && (
                <span className="text-sm text-[#9BA1A6]">No stocks yet — add from the Featured list.</span>
              )}
            </div>
            {watchlistRows.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-white border-b border-[#23262A]">
                      <th className="px-4 py-3">Symbol</th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Market</th>
                      <th className="px-4 py-3">Last</th>
                      <th className="px-4 py-3">Change</th>
                      <th className="px-4 py-3">%</th>
                      <th className="px-4 py-3">Volume</th>
                      <th className="px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {watchlistRows.map((row, i) => {
                      const s = row?.symbol ?? `w-${i}`;
                      const price = getPrice(row?.tick);
                      const { chg, pct } = getChange(row?.tick);
                      const vol = getVolume(row?.tick);
                      const up = chg > 0;
                      const neutral = chg === 0 || isNaN(chg);
                      const isRemoving = removing.has(s);

                      return (
                        <tr key={s} className="border-b border-[#23262A]">
                          <td className="px-4 py-3 font-medium text-white">{row?.symbol ?? "—"}</td>
                          <td className="px-4 py-3 text-[#E4E6EB]">{row?.name ?? "—"}</td>
                          <td className="px-4 py-3 text-[#E4E6EB]">{row?.marketType ?? "REG"}</td>
                          <td className="px-4 py-3 tabular-nums text-white font-medium">{fmt(price)}</td>
                          <td className={`px-4 py-3 tabular-nums ${neutral ? "text-[#E4E6EB]" : up ? "text-emerald-400" : "text-rose-400"}`}>
                            {fmtSigned(chg)}
                          </td>
                          <td className={`px-4 py-3 tabular-nums ${neutral ? "text-[#E4E6EB]" : up ? "text-emerald-400" : "text-rose-400"}`}>
                            {isFinite(pct) ? `${pct.toFixed(2)}%` : "—"}
                          </td>
                          <td className="px-4 py-3 tabular-nums text-white">{fmtInt(vol)}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => removeSymbol(s)}
                              disabled={isRemoving}
                              className={`inline-flex items-center gap-1 rounded-xl px-2 py-1 text-xs ring-1 transition ${
                                isRemoving
                                  ? "bg-neutral-100 text-neutral-400 ring-black/5 cursor-not-allowed"
                                  : "bg-white hover:bg-neutral-50 ring-black/10 text-neutral-800 shadow"
                              }`}
                              title="Remove from watchlist"
                            >
                              {isRemoving ? <Spinner16 /> : <Minus16 />}
                              Remove
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Featured Stocks Section */}
        <section className="bg-[#181B20] rounded-3xl text-white shadow flex flex-col gap-2 p-7">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">Featured Stocks</h2>
            {error && (
              <span className="text-sm text-[#ef4444] bg-[#181B20] border border-[#ef4444] rounded-xl px-2 py-1">
                {error}
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-white border-b border-[#23262A]">
                  <th className="px-4 py-3">Symbol</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Market</th>
                  <th className="px-4 py-3">Last</th>
                  <th className="px-4 py-3">Change</th>
                  <th className="px-4 py-3">%</th>
                  <th className="px-4 py-3">Volume</th>
                  <th className="px-4 py-3">Watch</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <SkeletonRows columns={8} />
                ) : (
                  featured.map((row, i) => {
                    const s = row?.symbol ?? `s-${i}`;
                    const price = getPrice(row?.tick);
                    const { chg, pct } = getChange(row?.tick);
                    const vol = getVolume(row?.tick);
                    const up = chg > 0;
                    const neutral = chg === 0 || isNaN(chg);
                    const isSaved = watchlist.has(s);
                    const isSaving = saving.has(s);
                    const canSave = !!tokenRef.current && !isSaved && !isSaving;

                    return (
                      <tr key={s} className="border-b border-[#23262A]">
                        <td className="px-4 py-3 font-medium text-white">{row?.symbol ?? "—"}</td>
                        <td className="px-4 py-3 text-[#E4E6EB]">{row?.name ?? "—"}</td>
                        <td className="px-4 py-3 text-[#E4E6EB]">{row?.marketType ?? "REG"}</td>
                        <td className="px-4 py-3 tabular-nums text-white font-medium">{fmt(price)}</td>
                        <td className={`px-4 py-3 tabular-nums ${neutral ? "text-[#E4E6EB]" : up ? "text-emerald-400" : "text-rose-400"}`}>
                          {fmtSigned(chg)}
                        </td>
                        <td className={`px-4 py-3 tabular-nums ${neutral ? "text-[#E4E6EB]" : up ? "text-emerald-400" : "text-rose-400"}`}>
                          {isFinite(pct) ? `${pct.toFixed(2)}%` : "—"}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-white">{fmtInt(vol)}</td>
                        <td className="px-4 py-3">
                          {isSaved ? (
                            <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 text-xs">
                              <Check16 /> Saved
                            </span>
                          ) : (
                            <button
                              onClick={() => saveSymbol(s)}
                              disabled={!canSave}
                              className={`inline-flex items-center gap-1 rounded-xl px-2 py-1 text-xs ring-1 transition ${
                                canSave
                                  ? "bg-white hover:bg-neutral-50 ring-black/10 text-neutral-800 shadow"
                                  : "bg-neutral-100 text-neutral-400 ring-black/5 cursor-not-allowed"
                              }`}
                              title={tokenRef.current ? "Save to watchlist" : "Sign in to save"}
                            >
                              {isSaving ? <Spinner16 /> : <Plus16 />}
                              Save
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <p className="mt-4 text-center text-xs text-[#9BA1A6]">
          Early read-only view for prices. Live ticks can replace polling next.
        </p>
      </div>
    </main>
  );
}

/* ---------------- Skeleton ---------------- */
function SkeletonRows({ columns = 8 }: { columns?: number }) {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="border-b border-black/5">
          {Array.from({ length: columns }).map((__, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-4 w-24 rounded-full bg-neutral-200/70 animate-pulse" />
            </td>
          ))}
        </tr>
      ))}
    </>
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

  let pct = num(tick.chgPct ?? tick.changePct ?? tick.pct);

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
function fmt(n: number) { return isFinite(n) ? n.toFixed(2) : "—"; }
function fmtSigned(n: number) { return isFinite(n) ? (n > 0 ? `+${n.toFixed(2)}` : n.toFixed(2)) : "—"; }
function fmtInt(n: number) { return isFinite(n) ? new Intl.NumberFormat().format(Math.round(n)) : "—"; }
function timeAgo(d: Date) {
  const delta = Math.max(1, Math.round((Date.now() - d.getTime()) / 1000));
  if (delta < 60) return `${delta}s ago`;
  const m = Math.round(delta / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return `${h}h ago`;
}

function Plus16() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function Minus16() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function Check16() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function Spinner16() {
  return (
    <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" aria-label="loading">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" opacity="0.15" fill="none" />
      <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}
