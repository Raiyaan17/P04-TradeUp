'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import { formatUSD, formatPercent, getPnLClass } from '@/lib/format';
import { cn } from '@/lib/utils';

interface PnlBarChartProps {
  portfolio: Array<{
    symbol: string;
    unrealizedPnl: string;
    pnlPercentage: string;
  }>;
}

interface PnlDatum {
  symbol: string;
  pnl: number;
  pnlPct: number;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: PnlDatum }>;
}) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  const isPositive = data.pnl >= 0;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
      <p className="text-sm font-medium text-foreground">{data.symbol}</p>
      <p
        className={`text-xs tabular-nums font-semibold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}
      >
        {formatUSD(data.pnl)} ({formatPercent(data.pnlPct)})
      </p>
    </div>
  );
}

export function PnlBarChart({ portfolio }: PnlBarChartProps) {
  const data: PnlDatum[] = portfolio
    .map((item) => ({
      symbol: item.symbol,
      pnl: parseFloat(item.unrealizedPnl) || 0,
      pnlPct: parseFloat(item.pnlPercentage) || 0,
    }))
    .sort((a, b) => b.pnl - a.pnl);

  // Empty portfolio
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        Start trading to see your profit &amp; loss breakdown.
      </div>
    );
  }

  // Compute summary stats
  const totalPnl = data.reduce((sum, d) => sum + d.pnl, 0);
  const best = data.reduce((a, b) => (b.pnlPct > a.pnlPct ? b : a), data[0]);
  const worst = data.reduce((a, b) => (b.pnlPct < a.pnlPct ? b : a), data[0]);
  const allFlat = data.every((d) => d.pnl === 0);

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Total P&L:</span>
          <span className={cn('font-semibold tabular-nums', getPnLClass(totalPnl))}>
            {formatUSD(totalPnl)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Best:</span>
          {allFlat ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            <span className="font-medium text-emerald-400 tabular-nums">
              {best.symbol} ({formatPercent(best.pnlPct)})
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Worst:</span>
          {allFlat ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            <span className="font-medium text-rose-400 tabular-nums">
              {worst.symbol} ({formatPercent(worst.pnlPct)})
            </span>
          )}
        </div>
      </div>

      {/* Zero state or chart */}
      {allFlat ? (
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="text-center max-w-xs">
            <p className="text-sm font-medium text-foreground">No price movement yet</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Your positions were recently opened. As stock prices change,
              you&apos;ll see your gains and losses compared here.
            </p>
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(200, data.length * 44)}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 20, bottom: 4, left: 4 }}
          >
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => formatUSD(v, { compact: true })}
            />
            <YAxis
              type="category"
              dataKey="symbol"
              width={55}
              tick={{ fontSize: 12, fill: '#e5e7eb', fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: '#374151', opacity: 0.5 }}
            />
            <Bar dataKey="pnl" radius={[0, 4, 4, 0]} barSize={24}>
              {data.map((entry) => (
                <Cell
                  key={entry.symbol}
                  fill={
                    entry.pnl >= 0
                      ? 'hsl(160, 60%, 45%)'
                      : 'hsl(0, 70%, 55%)'
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
