'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { Activity, Search } from 'lucide-react';
import { AppShell } from '@/components/layout';
import { PageHeader, EmptyState } from '@/components/common';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { http } from '@/lib/http';
import { formatDecimal, formatVolume } from '@/lib/format';
import { cn } from '@/lib/utils';

// --- Types ---
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

interface TickUpdateMessage {
    type: string;
    symbol: string;
    tick: {
        o: number;
        h: number;
        l: number;
        c: number;
        v: number;
        chg: number;
        chgPct: number;
    };
    timestamp: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

// --- Field Extractors ---
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

// --- Main Component ---
export default function MarketsPage() {
    const router = useRouter();
    const [stocks, setStocks] = useState<StockData[]>([]);
    const [filteredStocks, setFilteredStocks] = useState<StockData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
    const socketRef = useRef<Socket | null>(null);

    // 1. Initial Data Fetch
    const fetchMarketData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await http.get<StockData[]>('/stocks/featured', { noAuth: true });
            if (Array.isArray(data)) {
                setStocks(data);
                setFilteredStocks(data);
            }
        } catch (error) {
            console.error('Failed to fetch market data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMarketData();
    }, [fetchMarketData]);

    // 2. WebSocket Connection for Live Updates
    useEffect(() => {
        const socket = io(`${API_BASE_URL}/ws`, {
            withCredentials: true,
            reconnectionAttempts: 5,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            setWsStatus('connected');
            // Subscribe to all featured symbols we currently tracked
            // Note: Ideally the backend has a 'subscribeAllFeatured' but we'll emit individually for now
            // relying on the initial REST load to give us the list.
            stocks.forEach(stock => {
                socket.emit("subscribeSymbol", stock.symbol);
            });
        });

        socket.on('disconnect', () => {
            setWsStatus('error');
        });

        socket.on('tickUpdate', (msg: TickUpdateMessage) => {
            setStocks(prev => prev.map(stock => {
                if (stock.symbol === msg.symbol) {
                    return {
                        ...stock,
                        tick: {
                            ...stock.tick,
                            c: msg.tick.c,
                            v: msg.tick.v,
                            chg: msg.tick.chg,
                            chgPct: msg.tick.chgPct
                        }
                    };
                }
                return stock;
            }));
        });

        return () => {
            socket.close();
        };
    }, [stocks.length]); // Re-run if stock list gets populated/changes length

    // 3. Search Filter
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredStocks(stocks);
            return;
        }
        const query = searchQuery.toLowerCase();
        const filtered = stocks.filter(
            s => s.symbol.toLowerCase().includes(query) || (s.name && s.name.toLowerCase().includes(query))
        );
        setFilteredStocks(filtered);
    }, [searchQuery, stocks]);

    // 4. Row Click Handler
    const handleRowClick = (symbol: string) => {
        router.push(`/charts?symbol=${encodeURIComponent(symbol)}`);
    };

    return (
        <AppShell requireAuth={false}>
            <PageHeader
                title="Markets"
                description="Real-time data for Pakistan Stock Exchange featured assets."
                actions={
                    <div className="flex items-center gap-3">
                        <Badge variant={wsStatus === 'connected' ? 'success' : 'warning'}>
                            <Activity className="mr-1 h-3 w-3" />
                            {wsStatus === 'connected' ? 'Live Data' : 'Connecting...'}
                        </Badge>
                    </div>
                }
            />

            <Card>
                <CardHeader className="pb-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <CardTitle>Market Data</CardTitle>
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
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                        </div>
                    ) : filteredStocks.length > 0 ? (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead>Symbol</TableHead>
                                        <TableHead className="text-right">Price (PKR)</TableHead>
                                        <TableHead className="text-right">Volume</TableHead>
                                        <TableHead className="text-right">Change %</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredStocks.map((stock) => {
                                        const price = getPrice(stock.tick);
                                        const { chg, pct } = getChange(stock.tick);
                                        const vol = getVolume(stock.tick);

                                        return (
                                            <TableRow
                                                key={stock.symbol}
                                                className="cursor-pointer hover:bg-muted/50 transition-colors"
                                                onClick={() => handleRowClick(stock.symbol)}
                                            >
                                                <TableCell className="font-semibold">{stock.symbol}</TableCell>
                                                <TableCell className="text-right tabular-nums font-medium">
                                                    {formatDecimal(price)}
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums">
                                                    {formatVolume(vol)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Badge
                                                        variant="outline"
                                                        className={cn(
                                                            "font-mono rounded-sm border-transparent",
                                                            chg > 0 ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20" :
                                                                chg < 0 ? "bg-rose-500/10 text-rose-500 hover:bg-rose-500/20" :
                                                                    "bg-muted text-muted-foreground"
                                                        )}
                                                    >
                                                        {isFinite(pct) ? `${pct > 0 ? '+' : ''}${pct.toFixed(2)}%` : "—"}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <EmptyState
                            variant="search"
                            description={`No stocks found matching "${searchQuery}"`}
                        />
                    )}
                </CardContent>
            </Card>
        </AppShell>
    );
}
