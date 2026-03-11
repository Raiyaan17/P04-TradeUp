"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { TrendingUp, TrendingDown, Minus, Plus, Search, Loader2 } from "lucide-react";
import { AppShell } from "@/components/layout";
import { PageHeader } from "@/components/common";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { http, ApiException } from "@/lib/http";
import { formatDecimal, getPnLClass } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Tick {
    price: number;
    change: number;
}

interface StockData {
    symbol: string;
    name?: string;
    marketType?: string;
    tick?: Tick;
}

export default function TradeTestPage() {
    const [stocks, setStocks] = useState<StockData[]>([]);
    const [selectedStock, setSelectedStock] = useState<StockData | null>(null);
    const [quantity, setQuantity] = useState<number>(0);
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [executingAction, setExecutingAction] = useState<'buy' | 'sell' | null>(null);
    const isSubmitting = executingAction !== null;

    const fetchAllStocks = useCallback(async (): Promise<void> => {
        try {
            setLoading(true);
            setError(null);
            const data = await http.get<StockData[]>("/stocks/featured");

            setStocks(data);
        } catch (err) {
            const message = err instanceof ApiException ? err.message : "Failed to load stocks";
            setError(message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAllStocks();
    }, [fetchAllStocks]);

    const handleStockSelect = (stock: StockData): void => {
        // If selecting the same stock, preserve quantity or reset if you prefer.
        // We'll reset for clarity in a fresh trade scenario.
        if (selectedStock?.symbol !== stock.symbol) {
            setQuantity(0);
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
            });

            toast.success(`Successfully ${action === 'buy' ? 'bought' : 'sold'} ${quantity} shares of ${selectedStock.symbol} at PKR ${formatDecimal(response.transaction.price)}!`);
            // Optional: clear selection after successful trade
            setQuantity(0);
            setSelectedStock(null);
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

    const currentPrice = selectedStock ? getPrice(selectedStock.tick) : 0;
    const totalValue = currentPrice * quantity;

    const filteredStocks = stocks.filter(stock =>
        stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stock.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <AppShell fullWidth>
            <div className="max-w-7xl mx-auto px-6 pb-20 pt-8">
                <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Column: Asset Selection */}
                    <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
                        <div>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                                <h2 className="text-2xl font-semibold text-foreground/90">1. Select Asset</h2>
                                <div className="relative w-full sm:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search stocks..."
                                        className="pl-9"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
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
                                        const price = getPrice(stock.tick);
                                        const { change, changePercent } = getChange(stock.tick);
                                        const isPositive = change >= 0;
                                        const isSelected = selectedStock?.symbol === stock.symbol;

                                        return (
                                            <Card
                                                key={stock.symbol}
                                                onClick={() => handleStockSelect(stock)}
                                                className={cn(
                                                    "cursor-pointer transition-all duration-200 hover:shadow-md border-2",
                                                    isSelected
                                                        ? "border-primary bg-primary/5 shadow-sm"
                                                        : "border-transparent hover:border-primary/30"
                                                )}
                                            >
                                                <CardContent className="p-5 flex flex-col gap-3">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h3 className="text-lg font-bold tracking-tight">{stock.symbol}</h3>
                                                            <p className="text-xs text-muted-foreground line-clamp-1">{stock.name || "Unknown Company"}</p>
                                                        </div>
                                                        <div className={cn("p-1.5 rounded-full", isPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500")}>
                                                            {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                                        </div>
                                                    </div>

                                                    <div className="mt-1">
                                                        <p className="text-xl font-semibold">PKR {formatDecimal(price)}</p>
                                                        <p className={cn("text-sm font-medium", getPnLClass(change))}>
                                                            {change >= 0 ? "+" : ""}{formatDecimal(change)} ({formatDecimal(changePercent)}%)
                                                        </p>
                                                    </div>
                                                </CardContent>
                                            </Card>
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

                            <Card className="border-border/50 shadow-lg relative overflow-hidden">
                                {!selectedStock && (
                                    <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] z-10 flex items-center justify-center p-6 text-center">
                                        <p className="text-muted-foreground font-medium">Please select an asset from the list to begin trading.</p>
                                    </div>
                                )}

                                <CardContent className="p-6">
                                    {/* Selected Asset Header */}
                                    <div className="mb-8 pb-6 border-b border-border/50">
                                        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Selected Asset</p>
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <h3 className="text-3xl font-bold">{selectedStock?.symbol || "---"}</h3>
                                                <p className="text-sm text-muted-foreground">{selectedStock?.name || "Company Name"}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-2xl font-semibold text-primary">
                                                    PKR {selectedStock ? formatDecimal(currentPrice) : "0.00"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quantity controls */}
                                    <div className="mb-8">
                                        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 text-center">Quantity</p>
                                        <div className="flex items-center justify-center gap-6">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-14 w-14 rounded-full border-2 hover:bg-muted hover:text-foreground"
                                                onClick={handleQuantityDecrement}
                                                disabled={quantity <= 0}
                                            >
                                                <Minus className="h-6 w-6" />
                                            </Button>

                                            <div className="w-24 text-center">
                                                <span className="text-5xl font-bold tracking-tighter">{quantity}</span>
                                            </div>

                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-14 w-14 rounded-full border-2 hover:bg-primary/10 hover:border-primary/50 hover:text-primary"
                                                onClick={handleQuantityIncrement}
                                            >
                                                <Plus className="h-6 w-6" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-4 mb-4">
                                        <div className="flex-1 flex flex-col gap-2">
                                            <Button
                                                className="w-full h-14 text-lg font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                                                disabled={quantity <= 0 || isSubmitting}
                                                onClick={() => handleExecuteTrade('buy')}
                                            >
                                                {executingAction === 'buy' ? (
                                                    <span className="flex items-center gap-2">
                                                        <Loader2 className="animate-spin h-5 w-5" />
                                                        Executing...
                                                    </span>
                                                ) : "Buy"}
                                            </Button>
                                            <p className="text-xs text-muted-foreground text-center leading-relaxed h-12">
                                                {quantity > 0 && selectedStock ? (
                                                    <>You are buying <strong className="text-foreground">{quantity}</strong> shares of <strong className="text-foreground">{selectedStock.symbol}</strong> at the current price. You will spend <strong className="text-foreground">PKR {formatDecimal(totalValue)}</strong>.</>
                                                ) : "Select quantity to see details."}
                                            </p>
                                        </div>

                                        <div className="flex-1 flex flex-col gap-2">
                                            <Button
                                                variant="destructive"
                                                className="w-full h-14 text-lg font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
                                                disabled={quantity <= 0 || isSubmitting}
                                                onClick={() => handleExecuteTrade('sell')}
                                            >
                                                {executingAction === 'sell' ? (
                                                    <span className="flex items-center gap-2">
                                                        <Loader2 className="animate-spin h-5 w-5" />
                                                        Executing...
                                                    </span>
                                                ) : "Sell"}
                                            </Button>
                                            <p className="text-xs text-muted-foreground text-center leading-relaxed h-12">
                                                {quantity > 0 && selectedStock ? (
                                                    <>You are selling <strong className="text-foreground">{quantity}</strong> shares of <strong className="text-foreground">{selectedStock.symbol}</strong> at the current price. You will get <strong className="text-foreground">PKR {formatDecimal(totalValue)}</strong>.</>
                                                ) : "Select quantity to see details."}
                                            </p>
                                        </div>
                                    </div>

                                </CardContent>
                            </Card>

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
