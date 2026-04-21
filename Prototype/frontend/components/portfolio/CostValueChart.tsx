'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { formatUSD } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';

interface CostValueChartProps {
  portfolio: Array<{
    symbol: string;
    invested: string;
    currentValue: string;
  }>;
}

interface CostValueDatum {
  symbol: string;
  invested: number;
  currentValue: number;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const invested = payload.find((p) => p.name === 'Cost Basis');
  const current = payload.find((p) => p.name === 'Current Value');
  const diff =
    invested && current ? current.value - invested.value : 0;
  const isPositive = diff >= 0;

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
      <p className="text-sm font-medium text-foreground mb-1">{label}</p>
      {invested && (
        <p className="text-xs text-muted-foreground tabular-nums">
          Cost Basis: {formatUSD(invested.value)}
        </p>
      )}
      {current && (
        <p className="text-xs text-muted-foreground tabular-nums">
          Current: {formatUSD(current.value)}
        </p>
      )}
      <p
        className={`text-xs tabular-nums font-semibold mt-0.5 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}
      >
        {isPositive ? '+' : ''}
        {formatUSD(diff)}
      </p>
    </div>
  );
}

export function CostValueChart({ portfolio }: CostValueChartProps) {
  const data: CostValueDatum[] = portfolio
    .map((item) => ({
      symbol: item.symbol,
      invested: parseFloat(item.invested) || 0,
      currentValue: parseFloat(item.currentValue) || 0,
    }))
    .sort((a, b) => b.currentValue - a.currentValue);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        Start trading to compare cost basis vs. current value.
      </div>
    );
  }

  const chartHeight = Math.max(200, data.length * 48);

  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const axisColor = isDark ? '#9ca3af' : '#4b5563';
  const labelColor = isDark ? '#e5e7eb' : '#1f2937';
  const cursorColor = isDark ? '#374151' : '#e5e7eb';
  const legendColor = isDark ? '#9ca3af' : '#6b7280';

  const totalInvested = data.reduce((s, d) => s + d.invested, 0);
  const totalCurrent = data.reduce((s, d) => s + d.currentValue, 0);
  const totalDiff = totalCurrent - totalInvested;
  const diffIsPositive = totalDiff >= 0;
  const maxSymbolLen = Math.max(...data.map(d => d.symbol.length));
  const yAxisWidth = Math.max(45, maxSymbolLen * 9);

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Total Cost:</span>
          <span className="font-semibold tabular-nums text-foreground">{formatUSD(totalInvested)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Current Value:</span>
          <span className="font-semibold tabular-nums text-foreground">{formatUSD(totalCurrent)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Gain/Loss:</span>
          <span className={cn('font-semibold tabular-nums', diffIsPositive ? 'text-emerald-400' : 'text-rose-400')}>
            {diffIsPositive ? '+' : ''}{formatUSD(totalDiff)}
          </span>
        </div>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
      <ResponsiveContainer width="100%" height={chartHeight}>
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
            tick={{
              fontSize: 12,
              fill: labelColor,
              fontWeight: 500,
            }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: cursorColor, opacity: 0.5 }} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, paddingTop: 8, color: legendColor }}
          />
          <Bar
            name="Cost Basis"
            dataKey="invested"
            fill={isDark ? 'hsl(220, 15%, 45%)' : 'hsl(220, 15%, 70%)'}
            radius={[0, 4, 4, 0]}
            barSize={18}
          />
          <Bar
            name="Current Value"
            dataKey="currentValue"
            fill={isDark ? 'hsl(220, 70%, 60%)' : 'hsl(220, 65%, 50%)'}
            radius={[0, 4, 4, 0]}
            barSize={18}
          />
        </BarChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
