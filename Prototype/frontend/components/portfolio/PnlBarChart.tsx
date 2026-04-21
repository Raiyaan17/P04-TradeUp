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
import { useTheme } from 'next-themes';

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
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const axisColor = isDark ? '#9ca3af' : '#4b5563';
  const labelColor = isDark ? '#e5e7eb' : '#1f2937';
  const cursorColor = isDark ? '#374151' : '#e5e7eb';

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
  const showBestWorst = data.length > 1 && !allFlat;
  const maxSymbolLen = Math.max(...data.map(d => d.symbol.length));
  const yAxisWidth = Math.max(45, maxSymbolLen * 9);

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
        {showBestWorst && (
          <>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Best:</span>
              <span className="font-medium text-emerald-400 tabular-nums">
                {best.symbol} ({formatPercent(best.pnlPct)})
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Worst:</span>
              <span className="font-medium text-rose-400 tabular-nums">
                {worst.symbol} ({formatPercent(worst.pnlPct)})
              </span>
            </div>
          </>
        )}
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
        <div className="max-h-[400px] overflow-y-auto">
        <ResponsiveContainer width="100%" height={Math.max(200, data.length * 48)}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 20, bottom: 4, left: 4 }}
          >
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: axisColor }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => formatUSD(v, { compact: true })}
            />
            <YAxis
              type="category"
              dataKey="symbol"
              width={yAxisWidth}
              tick={{ fontSize: 12, fill: labelColor, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: cursorColor, opacity: 0.5 }}
            />
            <Bar dataKey="pnl" radius={[0, 4, 4, 0]} barSize={24}>
              {data.map((entry) => (
                <Cell
                  key={entry.symbol}
                  fill={
                    entry.pnl >= 0
                      ? (isDark ? 'hsl(160, 60%, 45%)' : 'hsl(160, 55%, 38%)')
                      : (isDark ? 'hsl(0, 70%, 55%)' : 'hsl(0, 65%, 48%)')
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
