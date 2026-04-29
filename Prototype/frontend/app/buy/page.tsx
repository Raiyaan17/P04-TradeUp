"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";
import { Minus, Plus, Search, Loader2 } from "lucide-react";
import { AppShell } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PriceFlashCell } from "@/components/common";
import { http, ApiException } from "@/lib/http";
import { formatDecimal, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SellJournalInput, type SellReasonType } from "@/components/portfolio/SellJournalInput";
import { SYMBOL_SECTOR_MAP, ACTIVE_SECTORS } from "@/lib/constants";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || (isLocalhost ? 'http://localhost:3001' : 'https://tradeup-syai.onrender.com');

interface Tick {
    price: number;
    change: number;
    percentChange?: number;
    volume?: number;
    value?: number;
}

interface StockData {
    symbol: string;
    name?: string;
    marketType?: string;
    tick?: Tick;
}

export default function TradeTestPage() {
    const [stocks, setStocks] = useState<StockData[]>([]);
    const [liveTicks, setLiveTicks] = useState<Record<string, Tick>>({});
    const [selectedStock, setSelectedStock] = useState<StockData | null>(null);
    const [quantity, setQuantity] = useState<number>(0);
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [selectedSector, setSelectedSector] = useState<string>("All Sectors");
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [executingAction, setExecutingAction] = useState<'buy' | 'sell' | null>(null);
    const isSubmitting = executingAction !== null;
    const [sellReason, setSellReason] = useState<SellReasonType | null>(null);
    const [sellNote, setSellNote] = useState('');
    const [sellDialogOpen, setSellDialogOpen] = useState(false);
    const socketRef = useRef<Socket | null>(null);
    const stocksRef = useRef<StockData[]>([]);

    const fetchAllStocks = useCallback(async (): Promise<void> => {
        try {
            setLoading(true);
            setError(null);
            const data = await http.get<StockData[]>("/stocks/featured");
            setStocks(data);
            stocksRef.current = data;
        } catch (err) {
            const message = err instanceof ApiException ? err.message : "Failed to load stocks";
            setError(message);
        } finally {
            setLoading(false);
        }
    }, []);

    // Mount: fetch REST snapshot, then re-fetch after 3s to catch drip-feed warm-up,
    // then connect WebSocket for continuous live updates.
    useEffect(() => {
        fetchAllStocks();

        // Second fetch after drip-feed has had time to warm up the tick cache
        const warmupTimer = setTimeout(() => fetchAllStocks(), 3000);

        // Socket.IO live tick subscription
        const socket = io(`${WS_URL}/ws`, {
            withCredentials: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            // Subscribe all featured symbols
            stocksRef.current.forEach(s => socket.emit('subscribeSymbol', s.symbol));
        });

        socket.on('tickUpdate', (msg: { symbol: string; [key: string]: unknown }) => {
            if (!msg?.symbol) return;
            const t = msg as unknown as Tick & { symbol: string };
            setLiveTicks(prev => ({
                ...prev,
                [msg.symbol]: {
                    price: Number(t.price || 0),
                    change: Number(t.change ?? 0),
                    percentChange: Number(t.percentChange ?? 0),
                    volume: Number(t.volume ?? 0),
                    value: Number((t as unknown as Record<string, unknown>).value ?? 0),
                },
            }));
        });

        return () => {
            clearTimeout(warmupTimer);
            socket.close();
            socketRef.current = null;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Re-subscribe whenever stocks list changes (after second fetch)
    useEffect(() => {
        if (socketRef.current?.connected && stocks.length > 0) {
            stocks.forEach(s => socketRef.current!.emit('subscribeSymbol', s.symbol));
        }
    }, [stocks]);

    const handleStockSelect = (stock: StockData): void => {
        if (selectedStock?.symbol !== stock.symbol) {
            setQuantity(0);
            setSellReason(null);
            setSellNote('');
        }
        setSelectedStock(stock);
    };

    const handleQuantityIncrement = () => {
        setQuantity((prev) => prev + 1);
    };

    const handleQuantityDecrement = () => {
        setQuantity((prev) => Math.max(0, prev - 1));
    };

    const handleExecuteTrade = async (action: 'buy' | 'sell'): Promise<void> => {
        if (!selectedStock || quantity <= 0 || isSubmitting) return;

        try {
            setExecutingAction(action);
            const endpoint = action === 'buy' ? '/trades/buy' : '/trades/sell';

            const response = await http.post<{ transaction: { price: number; total: number } }>(endpoint, {
                symbol: selectedStock.symbol,
                quantity: quantity,
                ...(action === 'sell' && sellReason ? { sellReason } : {}),
                ...(action === 'sell' && sellNote.trim() ? { sellNote: sellNote.trim() } : {}),
            });

            toast.success(`Successfully ${action === 'buy' ? 'bought' : 'sold'} ${quantity} shares of ${selectedStock.symbol} at PKR ${formatDecimal(response.transaction.price)}!`);
            setQuantity(0);
            setSelectedStock(null);
            setSellReason(null);
            setSellNote('');
        } catch (err) {
            const message = err instanceof ApiException ? err.message : `Failed to place ${action} order. Please try again.`;
            toast.error(message);
        } finally {
            setExecutingAction(null);
        }
    }


    if (error) {
        return (
            <AppShell fullWidth>
                <div className="flex flex-col justify-center items-center h-96 gap-4">
                    <p className="text-xl text-destructive">{error}</p>
                    <Button onClick={fetchAllStocks}>Try Again</Button>
                </div>
            </AppShell>
        );
    }

    // Merge REST snapshot with live WebSocket ticks — WS wins if available
    const getEffectiveTick = (stock: StockData): Tick | undefined => {
        const live = liveTicks[stock.symbol];
        if (live && live.price > 0) return live;
        return stock.tick;
    };

    const currentPrice = selectedStock ? getPrice(getEffectiveTick(selectedStock)) : 0;
    const totalValue = currentPrice * quantity;

    const filteredStocks = stocks.filter(stock => {
        const matchesSearch = stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              stock.name?.toLowerCase().includes(searchTerm.toLowerCase());
        const stockSector = SYMBOL_SECTOR_MAP[stock.symbol];
        const matchesSector = selectedSector === "All Sectors" || stockSector === selectedSector;
        
        return matchesSearch && matchesSector;
    });

    return (
        <AppShell fullWidth>
            <div className="max-w-7xl mx-auto px-6 pb-20 pt-8">
                <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Column: Asset Selection */}
                    <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
                        <div>
                            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-4">
                                <h2 className="text-2xl font-semibold text-foreground/90">1. Select Asset</h2>
                                <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
                                    <div className="relative w-full sm:w-64">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search stocks..."
                                            className="pl-9 bg-secondary border-none"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                    <select
                                        className="flex h-10 w-full sm:w-48 items-center justify-between rounded-md border-none bg-secondary px-3 py-2 text-sm ring-offset-background cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-secondary/80 transition-colors"
                                        value={selectedSector}
                                        onChange={(e) => setSelectedSector(e.target.value)}
                                    >
                                        <option value="All Sectors">All Sectors</option>
                                        {ACTIVE_SECTORS.map(sector => (
                                            <option key={sector} value={sector}>{sector}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {loading ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {Array.from({ length: 6 }).map((_, i) => (
                                        <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
                                    ))}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {filteredStocks.map((stock) => {
                                        const effectiveTick = getEffectiveTick(stock);
                                        const price = getPrice(effectiveTick);
                                        const { change, changePercent } = getChange(effectiveTick);
                                        const isPositive = change >= 0;
                                        const isNegative = change < 0;
                                        const isSelected = selectedStock?.symbol === stock.symbol;

                                        return (
                                            <div
                                                key={stock.symbol}
                                                onClick={() => handleStockSelect(stock)}
                                                className={cn(
                                                    "cursor-pointer transition-transform duration-200 hover:scale-105 hover:z-10 rounded-2xl p-5 flex flex-col gap-3",
                                                    isSelected
                                                        ? "bg-primary/20 border-2 border-primary text-primary-foreground"
                                                        : "bg-secondary border-2 border-transparent text-foreground hover:border-primary/50"
                                                )}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h3 className="text-label-caps tracking-tight">{stock.symbol}</h3>
                                                        <p className="text-xs text-muted-foreground line-clamp-1">{stock.name || "Unknown Company"}</p>
                                                        {SYMBOL_SECTOR_MAP[stock.symbol] && (
                                                            <span className="inline-block mt-2 px-2 py-0.5 text-[10px] font-bold tracking-widest rounded-sm bg-background text-muted-foreground uppercase">
                                                                {SYMBOL_SECTOR_MAP[stock.symbol]}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="mt-1">
                                                    <div className="text-2xl font-bold font-mono">
                                                        PKR <PriceFlashCell value={price} displayValue={formatDecimal(price)} />
                                                    </div>
                                                    <p className={cn("text-sm font-bold font-mono", isPositive ? "text-[#6fcf97]" : isNegative ? "text-[#eb5757]" : "text-muted-foreground")}>
                                                        {isPositive ? "+" : ""}{formatDecimal(change)} ({formatPercent(changePercent)})
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Execution Panel */}
                    <div className="lg:col-span-5 xl:col-span-4">
                        <div className="sticky top-24">
                            <h2 className="text-2xl font-semibold mb-4 text-foreground/90">2. Execution</h2>

                            <Card className="border-none bg-secondary shadow-lg relative overflow-hidden rounded-2xl">
                                {!selectedStock && (
                                    <div className="absolute inset-0 bg-background/80 backdrop-blur-[4px] z-10 flex items-center justify-center p-6 text-center">
                                        <p className="text-label-caps text-muted-foreground">SELECT AN ASSET TO TRADE</p>
                                    </div>
                                )}

                                <CardContent className="p-8">
                                    {/* Selected Asset Header */}
                                    <div className="mb-8 pb-6 border-b border-border/50">
                                        <p className="text-label-caps text-muted-foreground mb-4">SELECTED ASSET</p>
                                        <div className="flex flex-col gap-2">
                                            <h3 className="text-4xl font-bold">{selectedStock?.symbol || "---"}</h3>
                                            <p className="text-sm text-muted-foreground">{selectedStock?.name || "Company Name"}</p>
                                            <p className="text-3xl font-mono font-bold text-primary mt-2">
                                                PKR {selectedStock ? <PriceFlashCell value={currentPrice} displayValue={formatDecimal(currentPrice)} /> : "0.00"}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Quantity controls */}
                                    <div className="mb-10">
                                        <p className="text-label-caps text-muted-foreground mb-6 text-center">QUANTITY</p>
                                        <div className="flex items-center justify-center gap-6">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-16 w-16 rounded-full border-2 border-border bg-background hover:bg-muted hover:text-foreground"
                                                onClick={handleQuantityDecrement}
                                                disabled={quantity <= 0}
                                            >
                                                <Minus className="h-8 w-8" />
                                            </Button>

                                            <div className="w-24 text-center">
                                                <span className="text-6xl font-bold tracking-tighter">{quantity}</span>
                                            </div>

                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-16 w-16 rounded-full border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all"
                                                onClick={handleQuantityIncrement}
                                            >
                                                <Plus className="h-8 w-8" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-4 mb-4">
                                        <div className="flex-1 flex flex-col gap-2">
                                            <Button
                                                className="w-full h-16 text-label-caps bg-[#27ae60] hover:bg-[#2ecc71] text-white hover:shadow-[0_0_15px_rgba(39,174,96,0.6)] transition-all border-none"
                                                disabled={quantity <= 0 || isSubmitting}
                                                onClick={() => handleExecuteTrade('buy')}
                                            >
                                                {executingAction === 'buy' ? (
                                                    <span className="flex items-center gap-2">
                                                        <Loader2 className="animate-spin h-5 w-5" />
                                                        EXECUTING...
                                                    </span>
                                                ) : "BUY ASSET"}
                                            </Button>
                                            <p className="text-xs font-mono text-muted-foreground text-center leading-relaxed h-12">
                                                {quantity > 0 && selectedStock ? (
                                                    <>TOTAL COST <strong className="text-foreground">PKR {formatDecimal(totalValue)}</strong></>
                                                ) : "SELECT QUANTITY"}
                                            </p>
                                        </div>

                                        <div className="flex-1 flex flex-col gap-2">
                                            <Button
                                                variant="destructive"
                                                className="w-full h-16 text-label-caps bg-[#eb5757] hover:bg-[#ff7675] text-white hover:shadow-[0_0_15px_rgba(235,87,87,0.6)] transition-all border-none"
                                                disabled={quantity <= 0 || isSubmitting}
                                                onClick={() => {
                                                    setSellReason(null);
                                                    setSellNote('');
                                                    setSellDialogOpen(true);
                                                }}
                                            >
                                                SELL ASSET
                                            </Button>
                                            <p className="text-xs font-mono text-muted-foreground text-center leading-relaxed h-12">
                                                {quantity > 0 && selectedStock ? (
                                                    <>ESTIMATED RETURN <strong className="text-foreground">PKR {formatDecimal(totalValue)}</strong></>
                                                ) : "SELECT QUANTITY"}
                                            </p>
                                        </div>
                                    </div>

                                </CardContent>
                            </Card>

                            {/* Sell Confirmation & Journaling Dialog */}
                            <Dialog open={sellDialogOpen} onOpenChange={setSellDialogOpen}>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Confirm Sale</DialogTitle>
                                        <DialogDescription>
                                            You are about to sell {quantity} shares of {selectedStock?.symbol} for ~PKR {formatDecimal(totalValue)}.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="py-4">
                                        <SellJournalInput
                                            sellReason={sellReason}
                                            onReasonChange={setSellReason}
                                            sellNote={sellNote}
                                            onNoteChange={setSellNote}
                                        />
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setSellDialogOpen(false)} disabled={isSubmitting}>
                                            Cancel
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            onClick={() => {
                                                handleExecuteTrade('sell').then(() => setSellDialogOpen(false));
                                            }}
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? 'Processing...' : 'Confirm Sell'}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>

                        </div>
                    </div>
                </div>

            </div>
        </AppShell>
    );
}

// Helpers
function getPrice(tick: Tick | null | undefined): number {
    if (!tick) return 0;
    return tick.price || 0;
}

function getChange(tick: Tick | null | undefined): { change: number; changePercent: number } {
    if (!tick) return { change: 0, changePercent: 0 };
    const change = tick.change || 0;
    const changePercent = tick.price ? (change / (tick.price - change)) * 100 : 0;
    return { change, changePercent };
}
