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

  const chartHeight = Math.max(200, data.length * 54);

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
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
          tick={{
            fontSize: 12,
            fill: '#e5e7eb',
            fontWeight: 500,
          }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#374151', opacity: 0.5 }} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
        />
        <Bar
          name="Cost Basis"
          dataKey="invested"
          fill="hsl(220, 15%, 45%)"
          radius={[0, 4, 4, 0]}
          barSize={18}
        />
        <Bar
          name="Current Value"
          dataKey="currentValue"
          fill="hsl(220, 70%, 60%)"
          radius={[0, 4, 4, 0]}
          barSize={18}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
