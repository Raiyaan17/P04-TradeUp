'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { TrendingUp, TrendingDown, Minus, DollarSign, Briefcase, PiggyBank, Wallet, AlertTriangle, MoreHorizontal, ExternalLink, ArrowUpDown, Target, HeartCrack, Banknote, FileText } from 'lucide-react';
import { AppShell } from '@/components/layout';
import { PageHeader, EmptyState } from '@/components/common';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  const healthPanelRef = useRef<HTMLDivElement>(null);

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
  }, [fetchPortfolio]);

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

  const totalPnlValue = portfolioData ? parseFloat(portfolioData.totalUnrealizedPnl) : 0;
  const totalPnlIsPositive = totalPnlValue > 0;
  const totalPnlIsNegative = totalPnlValue < 0;
  const totalPnlIsZero = totalPnlValue === 0;

  // Build a set of symbols flagged by health signals for table annotation
  const healthSignals = portfolioData?.healthSignals ?? [];
  const healthStatus = portfolioData?.healthStatus ?? 'good';
  const flaggedSymbols = new Set<string>();
  for (const signal of healthSignals) {
    if (signal.relatedSymbol && signal.status !== 'good') {
      flaggedSymbols.add(signal.relatedSymbol);
    }
  }

  const scrollToHealthPanel = () => {
    healthPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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
            onClick={scrollToHealthPanel}
          />
        }
      />

      {/* Summary Stats — Compact Bar */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cash Balance</p>
                <p className="text-sm font-semibold tabular-nums">{formatUSD(portfolioData.balance)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                <PiggyBank className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Invested</p>
                <p className="text-sm font-semibold tabular-nums">{formatUSD(portfolioData.totalInvested)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Portfolio Value</p>
                <p className="text-sm font-semibold tabular-nums">{formatUSD(portfolioData.totalPortfolioValue)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Account Value</p>
                <p className="text-sm font-semibold tabular-nums">{formatUSD(portfolioData.totalAccountValue)}</p>
              </div>
            </div>
          </div>
          {/* P&L integrated row */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">Unrealized P&L</p>
              <p className={cn('text-sm font-bold tabular-nums', getPnLClass(portfolioData.totalUnrealizedPnl))}>
                {formatUSD(portfolioData.totalUnrealizedPnl)}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {totalPnlIsPositive && <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />}
              {totalPnlIsNegative && <TrendingDown className="h-3.5 w-3.5 text-rose-400" />}
              {totalPnlIsZero && <Minus className="h-3.5 w-3.5 text-muted-foreground" />}
              <p className={cn('text-sm font-bold tabular-nums', getPnLClass(portfolioData.totalPnlPercentage))}>
                {formatPercent(portfolioData.totalPnlPercentage)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Health Insights Panel */}
      <div ref={healthPanelRef}>
        <HealthInsightsPanel
          status={healthStatus}
          signals={healthSignals}
          id="health-insights"
        />
      </div>

      {/* Portfolio Visualizer */}
      <PortfolioVisualizer
        balance={portfolioData.balance}
        totalAccountValue={portfolioData.totalAccountValue}
        portfolio={portfolioData.portfolio}
      />

      {/* Holdings / Trade History Tabs */}
      <Card>
        <CardHeader className="pb-3">
          <Tabs
            tabs={[
              { id: 'holdings', label: 'Holdings', badge: portfolioData.portfolio.length },
              { id: 'history', label: 'Trade History' },
            ]}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </CardHeader>
        <CardContent>
          {activeTab === 'holdings' && portfolioData.portfolio.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right" title="Your breakeven cost basis">Avg. Price</TableHead>
                  <TableHead className="text-right">Current Price</TableHead>
                  <TableHead className="text-right" title="Unrealized Profit & Loss">P&L</TableHead>
                  <TableHead className="text-right">P&L %</TableHead>
                  <TableHead className="text-center w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {portfolioData.portfolio.map((item) => {
                  const isPositive = parseFloat(item.unrealizedPnl) > 0;
                  const isNegative = parseFloat(item.unrealizedPnl) < 0;
                  const badgeClass = isPositive 
                    ? 'bg-emerald-500/15 text-emerald-400' 
                    : isNegative 
                      ? 'bg-rose-500/15 text-rose-400' 
                      : 'bg-muted text-muted-foreground';

                  return (
                    <TableRow 
                      key={item.symbol}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => router.push(`/charts?symbol=${item.symbol}`)}
                    >
                      <TableCell className="font-semibold">
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
                      <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatUSD(item.avgPrice)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatUSD(item.currentPrice)}</TableCell>
                      <TableCell className={cn('text-right tabular-nums font-semibold', getPnLClass(item.unrealizedPnl))}>
                        {formatUSD(item.unrealizedPnl)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className={cn('tabular-nums font-medium border-transparent shrink-0', badgeClass)}>
                          {formatPercent(item.pnlPercentage)}
                        </Badge>
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
