'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
    TrendingUp,
    TrendingDown,
    Briefcase,
    Activity,
    PieChart,
    Calendar,
    Trophy
} from 'lucide-react';
import { getFriendPortfolio, FriendPortfolioData } from '@/lib/friendsService';
import { formatUSD, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';

interface FriendPortfolioProps {
    userId: number;
}

export function FriendPortfolio({ userId }: FriendPortfolioProps) {
    const [data, setData] = useState<FriendPortfolioData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadPortfolio = async () => {
            try {
                const portfolioData = await getFriendPortfolio(userId);
                setData(portfolioData);
            } catch (err) {
                setError((err as Error).message);
            } finally {
                setIsLoading(false);
            }
        };

        if (userId) {
            loadPortfolio();
        }
    }, [userId]);

    if (isLoading) {
        return <PortfolioSkeleton />;
    }

    if (error) {
        return (
            <Card className="w-full">
                <CardContent className="flex flex-col items-center justify-center p-6 min-h-[200px]">
                    <p className="text-muted-foreground mb-2">Unable to load portfolio</p>
                    <p className="text-sm text-red-500">{error}</p>
                </CardContent>
            </Card>
        );
    }

    if (!data || (data.portfolio.length === 0 && data.stats.totalTrades === 0)) {
        return (
            <Card className="w-full">
                <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                    <Briefcase className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium">No Holdings Yet</h3>
                    <p className="text-muted-foreground">This user hasn&apos;t started trading yet.</p>
                </CardContent>
            </Card>
        );
    }

    const { stats } = data;
    const totalPnlIsPositive = parseFloat(data.totalUnrealizedPnl) >= 0;

    return (
        <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    title="Portfolio Value"
                    value={formatUSD(data.totalPortfolioValue)}
                    icon={<Briefcase className="h-4 w-4 text-primary" />}
                    subtext={
                        <span className={cn("text-xs flex items-center gap-1", totalPnlIsPositive ? "text-emerald-500" : "text-red-500")}>
                            {totalPnlIsPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {formatPercent(data.totalPnlPercentage)} All Time
                        </span>
                    }
                />
                <StatCard
                    title="Total Trades"
                    value={stats.totalTrades.toString()}
                    icon={<Activity className="h-4 w-4 text-blue-500" />}
                    subtext="Lifetime activity"
                />
                <StatCard
                    title="Diversity"
                    value={`${stats.portfolioDiversity} Assets`}
                    icon={<PieChart className="h-4 w-4 text-purple-500" />}
                    subtext="Unique holdings"
                />
                <StatCard
                    title="Top Performer"
                    value={stats.topPerformer ? stats.topPerformer.symbol : '-'}
                    icon={<Trophy className="h-4 w-4 text-yellow-500" />}
                    subtext={stats.topPerformer ? (
                        <span className={cn("font-medium", parseFloat(stats.topPerformer.pnlPercentage) >= 0 ? "text-emerald-500" : "text-rose-500")}>
                            {parseFloat(stats.topPerformer.pnlPercentage) >= 0 ? '+' : ''}{formatPercent(stats.topPerformer.pnlPercentage)}
                        </span>
                    ) : 'No data'}
                />
            </div>

            {/* Holdings Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Holdings</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Symbol</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead className="text-right">Shares</TableHead>
                                <TableHead className="text-right">Price</TableHead>
                                <TableHead className="text-right">P&L</TableHead>
                                <TableHead className="text-right">Return</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.portfolio.map((item) => {
                                const pnlIsPositive = parseFloat(item.unrealizedPnl) >= 0;
                                return (
                                    <TableRow key={item.symbol}>
                                        <TableCell className="font-semibold">{item.symbol}</TableCell>
                                        <TableCell className="text-muted-foreground">{item.name || '-'}</TableCell>
                                        <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                                        <TableCell className="text-right tabular-nums">{formatUSD(item.currentPrice)}</TableCell>
                                        <TableCell className={cn("text-right tabular-nums", pnlIsPositive ? 'text-emerald-500' : 'text-red-500')}>
                                            {formatUSD(item.unrealizedPnl)}
                                        </TableCell>
                                        <TableCell className={cn("text-right tabular-nums", pnlIsPositive ? 'text-emerald-500' : 'text-red-500')}>
                                            <div className="flex items-center justify-end gap-1">
                                                {pnlIsPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                                {formatPercent(item.pnlPercentage)}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Footer / Member Since */}
            {stats.memberSince && (
                <div className="flex items-center justify-center text-sm text-muted-foreground gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Member since {new Date(stats.memberSince).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                </div>
            )}
        </div>
    );
}

function StatCard({ title, value, icon, subtext }: { title: string, value: string, icon: React.ReactNode, subtext?: React.ReactNode }) {
    return (
        <Card>
            <CardContent className="p-4">
                <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <span className="text-sm font-medium text-muted-foreground">{title}</span>
                    {icon}
                </div>
                <div className="text-2xl font-bold">{value}</div>
                {subtext && (
                    <div className="text-xs text-muted-foreground mt-1">
                        {subtext}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function PortfolioSkeleton() {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <Card key={i}>
                        <CardContent className="p-4">
                            <Skeleton className="h-4 w-24 mb-2" />
                            <Skeleton className="h-8 w-16" />
                        </CardContent>
                    </Card>
                ))}
            </div>
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {[...Array(5)].map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
