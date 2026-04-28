'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  TrendingDown,
  Briefcase,
  AlertTriangle,
  MoreHorizontal,
  ExternalLink,
  ArrowUpDown,
  Target,
  HeartCrack,
  Banknote,
  FileText,
} from 'lucide-react';
import { AppShell } from '@/components/layout';
import { PageHeader, EmptyState, DataCard, PriceFlashCell } from '@/components/common';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { HealthBadge, type HealthStatus } from '@/components/portfolio/HealthBadge';
import { HealthInsightsPanel, type HealthSignal } from '@/components/portfolio/HealthInsightsPanel';
import { PortfolioVisualizer } from '@/components/portfolio/PortfolioVisualizer';
import { SellJournalInput, type SellReasonType } from '@/components/portfolio/SellJournalInput';
import { Tabs } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { http, ApiException } from '@/lib/http';
import { formatUSD, formatPercent, getPnLClass } from '@/lib/format';
import { cn } from '@/lib/utils';

const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
// WS_URL must be the server root (no /api) — Socket.IO namespaces are separate from REST routes
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || (isLocalhost ? 'http://localhost:3001' : 'https://tradeup-syai.onrender.com');

interface LiveTick {
  c?: number;
  price?: number;
  ch?: number;
  change?: number;
  pch?: number;
  changePercent?: number;
  v?: number;
  volume?: number;
}

interface PortfolioItem {
  symbol: string;
  name: string | null;
  quantity: number;
  avgPrice: string;
  currentPrice: string;
  invested: string;
  currentValue: string;
  unrealizedPnl: string;
  pnlPercentage: string;
  createdAt: string;
}

interface TransactionItem {
  id: number;
  symbol: string;
  name: string | null;
  type: 'BUY' | 'SELL';
  quantity: number;
  price: string;
  total: string;
  createdAt: string;
  sellReason?: string;
  sellNote?: string;
}

interface TransactionsResponse {
  transactions: TransactionItem[];
  total: number;
  limit: number;
  offset: number;
}

interface PortfolioData {
  balance: string;
  totalInvested: string;
  totalPortfolioValue: string;
  totalUnrealizedPnl: string;
  totalPnlPercentage: string;
  totalAccountValue: string;
  portfolio: PortfolioItem[];
  healthStatus: HealthStatus;
  healthSignals: HealthSignal[];
}

export default function Portfolio() {
  const router = useRouter();
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sell dialog state
  const [sellDialogOpen, setSellDialogOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<PortfolioItem | null>(null);
  const [sellQuantity, setSellQuantity] = useState('');
  const [isSelling, setIsSelling] = useState(false);
  const [sellReason, setSellReason] = useState<SellReasonType | null>(null);
  const [sellNote, setSellNote] = useState('');
  const [healthSheetOpen, setHealthSheetOpen] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const [livePrices, setLivePrices] = useState<Record<string, LiveTick>>({});

  // Tab + Transaction history state
  const [activeTab, setActiveTab] = useState('holdings');
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [transactionsTotal, setTransactionsTotal] = useState(0);
  const [transactionsLoading, setTransactionsLoading] = useState(false);

  const fetchPortfolio = useCallback(async () => {
    try {
      setError(null);
      const data = await http.get<PortfolioData>('/trades/portfolio');
      setPortfolioData(data);
    } catch (err) {
      const message = err instanceof ApiException ? err.message : 'Failed to fetch portfolio data.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPortfolio();

    // WebSocket: Connect once on mount
    const socket = io(`${WS_URL}/ws`, {
      withCredentials: true,
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    socket.on('tickUpdate', (msg: { symbol: string; tick: LiveTick }) => {
      if (msg?.symbol && msg?.tick) {
        setLivePrices(prev => ({ ...prev, [msg.symbol]: msg.tick }));
      }
    });

    return () => {
      socket.close();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTransactions = useCallback(async () => {
    try {
      setTransactionsLoading(true);
      const data = await http.get<TransactionsResponse>('/trades/transactions?limit=50');
      setTransactions(data.transactions);
      setTransactionsTotal(data.total);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setTransactionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'history' && transactions.length === 0) {
      fetchTransactions();
    }
  }, [activeTab, transactions.length, fetchTransactions]);

  const openSellDialog = (item: PortfolioItem) => {
    setSelectedStock(item);
    setSellQuantity('');
    setSellReason(null);
    setSellNote('');
    setSellDialogOpen(true);
  };

  const handleSell = async () => {
    if (!selectedStock) return;

    const quantity = Number(sellQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      toast.error('Please enter a valid quantity.');
      return;
    }

    if (quantity > selectedStock.quantity) {
      toast.error('You cannot sell more shares than you own.');
      return;
    }

    setIsSelling(true);
    try {
      await http.post('/trades/sell', {
        symbol: selectedStock.symbol,
        quantity,
        ...(sellReason ? { sellReason } : {}),
        ...(sellNote.trim() ? { sellNote: sellNote.trim() } : {}),
      });

      toast.success(`Successfully sold ${quantity} shares of ${selectedStock.symbol}`);
      setSellDialogOpen(false);
      setSellReason(null);
      setSellNote('');
      setLoading(true);
      fetchPortfolio();
      // Refresh transaction history if tab is active
      if (activeTab === 'history') fetchTransactions();
    } catch (err) {
      const message = err instanceof ApiException ? err.message : 'Failed to sell stock.';
      toast.error(message);
    } finally {
      setIsSelling(false);
    }
  };

  // Subscribe to WebSocket rooms for held symbols
  useEffect(() => {
    if (socketRef.current?.connected && portfolioData?.portfolio) {
      portfolioData.portfolio.forEach(item => {
        socketRef.current!.emit('subscribeSymbol', item.symbol);
      });
    }
  }, [portfolioData]);

  // Compute live-adjusted portfolio metrics
  const livePortfolio = useMemo(() => {
    if (!portfolioData) return null;
    return portfolioData.portfolio.map(item => {
      const lt = livePrices[item.symbol];
      if (!lt) return item; // No live tick yet, use server snapshot

      const livePrice = lt.c ?? lt.price ?? parseFloat(item.currentPrice);
      const qty = item.quantity;
      const avg = parseFloat(item.avgPrice);
      const currentValue = livePrice * qty;
      const invested = avg * qty;
      const pnl = currentValue - invested;
      const pnlPct = invested !== 0 ? (pnl / invested) * 100 : 0;

      return {
        ...item,
        currentPrice: livePrice.toFixed(2),
        currentValue: currentValue.toFixed(2),
        unrealizedPnl: pnl.toFixed(2),
        pnlPercentage: pnlPct.toFixed(2),
      };
    });
  }, [portfolioData, livePrices]);

  const liveTotalPnl = useMemo(() => {
    if (!livePortfolio) return 0;
    return livePortfolio.reduce((sum, item) => sum + parseFloat(item.unrealizedPnl), 0);
  }, [livePortfolio]);

  const liveTotalPortfolioValue = useMemo(() => {
    if (!livePortfolio) return 0;
    return livePortfolio.reduce((sum, item) => sum + parseFloat(item.currentValue), 0);
  }, [livePortfolio]);

  const liveTotalAccountValue = (parseFloat(portfolioData?.balance || '0') + liveTotalPortfolioValue).toFixed(2);

  const totalPnlValue = liveTotalPnl;
  const totalPnlIsPositive = totalPnlValue > 0;

  // Build a set of symbols flagged by health signals for table annotation
  const healthSignals = portfolioData?.healthSignals ?? [];
  const healthStatus = portfolioData?.healthStatus ?? 'good';
  const flaggedSymbols = new Set<string>();
  for (const signal of healthSignals) {
    if (signal.relatedSymbol && signal.status !== 'good') {
      flaggedSymbols.add(signal.relatedSymbol);
    }
  }


  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-destructive text-xl">{error}</p>
          <Button className="mt-4" onClick={() => { setLoading(true); fetchPortfolio(); }}>
            Try Again
          </Button>
        </div>
      </AppShell>
    );
  }

  if (!portfolioData) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-16">
          <p className="text-muted-foreground text-xl">No data available</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="Portfolio"
        description="Track your investments and performance"
        actions={
          <HealthBadge
            status={healthStatus}
            onClick={() => setHealthSheetOpen(true)}
          />
        }
      />

      {/* Summary Stats — Neo-Bauhaus Electric */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
        <DataCard
          title="Account Value"
          value={formatUSD(liveTotalAccountValue)}
          delta={totalPnlValue !== 0 ? {
            value: formatUSD(Math.abs(liveTotalPnl).toFixed(2)),
            isPositive: totalPnlIsPositive
          } : undefined}
        />
        <DataCard
          title="Portfolio Value"
          value={formatUSD(liveTotalPortfolioValue > 0 ? liveTotalPortfolioValue.toFixed(2) : portfolioData.totalPortfolioValue)}
        />
        <DataCard
          title="Cash Balance"
          value={formatUSD(portfolioData.balance)}
        />
        <DataCard
          title="Total Invested"
          value={formatUSD(portfolioData.totalInvested)}
        />
      </div>

      {/* Health Insights Sheet */}
      <Sheet open={healthSheetOpen} onOpenChange={setHealthSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Portfolio Health</SheetTitle>
            <SheetDescription>
              {healthStatus === 'good'
                ? 'No issues detected — your portfolio looks healthy.'
                : `${healthSignals.filter(s => s.status !== 'good').length} issue(s) detected in your portfolio.`}
            </SheetDescription>
          </SheetHeader>
          <HealthInsightsPanel
            status={healthStatus}
            signals={healthSignals}
            embedded
          />
        </SheetContent>
      </Sheet>

      {/* Portfolio Visualizer */}
      <PortfolioVisualizer
        balance={portfolioData.balance}
        totalAccountValue={liveTotalAccountValue}
        portfolio={livePortfolio || portfolioData.portfolio}
      />

      {/* Holdings / Trade History Tabs */}
      <Card>
        <CardHeader className="pb-3">
          <Tabs
            tabs={[
              { 
                id: 'holdings', 
                label: 'Holdings', 
                icon: <Briefcase className="h-4 w-4 text-primary" />,
                badge: portfolioData.portfolio.length 
              },
              { 
                id: 'history', 
                label: 'Trade History',
                icon: <FileText className="h-4 w-4 text-muted-foreground" />
              },
            ]}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </CardHeader>
        <CardContent>
          {activeTab === 'holdings' && portfolioData.portfolio.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border hover:bg-transparent">
                  <TableHead className="text-label-caps">SYMBOL</TableHead>
                  <TableHead className="text-label-caps hidden sm:table-cell">NAME</TableHead>
                  <TableHead className="text-right text-label-caps">QTY</TableHead>
                  <TableHead className="text-right text-label-caps" title="Your breakeven cost basis">AVG. PRICE</TableHead>
                  <TableHead className="text-right text-label-caps">CURRENT PRICE</TableHead>
                  <TableHead className="text-right text-label-caps" title="Unrealized Profit & Loss">P&L</TableHead>
                  <TableHead className="text-right text-label-caps">P&L %</TableHead>
                  <TableHead className="text-center w-[80px] text-label-caps">ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(livePortfolio || portfolioData.portfolio).map((item) => {
                  const isPositive = parseFloat(item.unrealizedPnl) > 0;
                  const isNegative = parseFloat(item.unrealizedPnl) < 0;

                  return (
                    <TableRow 
                      key={item.symbol}
                      className="cursor-pointer hover:bg-muted/50 transition-colors border-none"
                      onClick={() => router.push(`/charts?symbol=${item.symbol}`)}
                    >
                      <TableCell className="font-bold text-label-caps">
                        <span className="inline-flex items-center gap-1.5">
                          {item.symbol}
                          {flaggedSymbols.has(item.symbol) && (
                            <span title="This position has a health alert">
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                            </span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden sm:table-cell">{item.name || '-'}</TableCell>
                      <TableCell className="text-right tabular-nums font-mono">{item.quantity}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatUSD(item.avgPrice)}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        <PriceFlashCell value={parseFloat(item.currentPrice)} displayValue={formatUSD(item.currentPrice)} />
                      </TableCell>
                      <TableCell className={cn('text-right tabular-nums font-semibold', getPnLClass(item.unrealizedPnl))}>
                        {formatUSD(item.unrealizedPnl)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={cn("font-mono font-bold", isPositive ? "text-[#6fcf97]" : isNegative ? "text-[#eb5757]" : "text-muted-foreground")}>
                          {isPositive ? "+" : ""}{formatPercent(item.pnlPercentage)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => router.push(`/charts?symbol=${item.symbol}`)}>
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Trade {item.symbol}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => openSellDialog(item)}
                              className="text-rose-400 focus:text-rose-300 focus:bg-rose-500/10"
                            >
                              Quick Sell
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          {activeTab === 'holdings' && portfolioData.portfolio.length === 0 && (
            <EmptyState
              variant="portfolio"
              action={{
                label: "Start Trading",
                onClick: () => window.location.href = '/buy'
              }}
            />
          )}

          {/* Trade History Tab */}
          {activeTab === 'history' && (
            <div>
              {transactionsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <ArrowUpDown className="h-8 w-8 mb-3 text-muted-foreground/50" />
                  <p className="font-medium">No transactions yet</p>
                  <p className="text-sm">Your trade history will appear here</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {transactions.map((tx) => {
                    const isBuy = tx.type === 'BUY';
                    const reasonLabels: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
                      TARGET_HIT: { label: 'Target Hit', icon: <Target className="h-3 w-3" />, className: 'bg-emerald-500/15 text-emerald-400' },
                      PANIC_EMOTION: { label: 'Panic / Emotion', icon: <HeartCrack className="h-3 w-3" />, className: 'bg-amber-500/15 text-amber-400' },
                      NEEDED_CASH: { label: 'Needed Cash', icon: <Banknote className="h-3 w-3" />, className: 'bg-blue-500/15 text-blue-400' },
                    };
                    const reason = tx.sellReason ? reasonLabels[tx.sellReason] : null;

                    return (
                      <div
                        key={tx.id}
                        className="group flex items-start gap-3 p-3 rounded-lg border border-border/50 hover:border-border transition-colors"
                      >
                        {/* Icon */}
                        <div className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full mt-0.5',
                          isBuy ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                        )}>
                          {isBuy ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">{tx.symbol}</span>
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-[10px] px-1.5 py-0 border-transparent font-medium',
                                  isBuy ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                                )}
                              >
                                {tx.type}
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {new Date(tx.createdAt).toLocaleDateString('en-US', {
                                month: 'short', day: 'numeric', year: 'numeric'
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span>{tx.quantity} shares</span>
                            <span>@ {formatUSD(tx.price)}</span>
                            <span className="font-medium text-foreground/70">= {formatUSD(tx.total)}</span>
                          </div>

                          {/* Journal annotation */}
                          {(reason || tx.sellNote) && (
                            <div className="mt-2 flex flex-col gap-1.5">
                              {reason && (
                                <span className={cn('inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full w-fit', reason.className)}>
                                  {reason.icon}
                                  {reason.label}
                                </span>
                              )}
                              {tx.sellNote && (
                                <p className="text-xs text-muted-foreground/80 italic flex items-start gap-1.5">
                                  <FileText className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground/50" />
                                  {tx.sellNote}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {transactionsTotal > transactions.length && (
                    <Button
                      variant="ghost"
                      className="w-full text-muted-foreground"
                      onClick={fetchTransactions}
                    >
                      Load more
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sell Dialog */}
      <Dialog open={sellDialogOpen} onOpenChange={setSellDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sell {selectedStock?.symbol}</DialogTitle>
            <DialogDescription>
              You own {selectedStock?.quantity} shares. Enter how many you want to sell.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <Input
              type="number"
              placeholder="Enter quantity"
              value={sellQuantity}
              onChange={(e) => setSellQuantity(e.target.value)}
              min="1"
              max={selectedStock?.quantity}
            />
            {selectedStock && sellQuantity && Number(sellQuantity) > 0 && (
              <p className="mt-2 text-sm text-muted-foreground">
                Estimated proceeds: {formatUSD(Number(sellQuantity) * parseFloat(selectedStock.currentPrice))}
              </p>
            )}
            <SellJournalInput
              sellReason={sellReason}
              onReasonChange={setSellReason}
              sellNote={sellNote}
              onNoteChange={setSellNote}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSellDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSell}
              disabled={isSelling || !sellQuantity || Number(sellQuantity) <= 0}
            >
              {isSelling ? 'Selling...' : 'Confirm Sell'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
