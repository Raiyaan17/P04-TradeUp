'use client';

import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatUSD, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PieChart as PieChartIcon, BarChart3, Info } from 'lucide-react';

const COLORS = [
  'hsl(160, 60%, 45%)', // Cash (teal-green)
  'hsl(220, 70%, 60%)', // blue
  'hsl(270, 60%, 60%)', // violet
  'hsl(35, 80%, 55%)',  // amber
  'hsl(340, 65%, 55%)', // rose
  'hsl(190, 70%, 50%)', // cyan
  'hsl(25, 75%, 55%)',  // orange
  'hsl(250, 55%, 55%)', // indigo
  'hsl(320, 50%, 55%)', // pink
];

interface AllocationSlice {
  name: string;
  value: number;
  color: string;
}

interface AllocationChartProps {
  balance: string;
  totalAccountValue: string;
  portfolio: Array<{
    symbol: string;
    currentValue: string;
  }>;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: AllocationSlice }> }) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
      <p className="text-sm font-medium text-foreground">{data.name}</p>
      <p className="text-xs text-muted-foreground tabular-nums">{formatUSD(data.value)}</p>
    </div>
  );
}

export function AllocationChart({
  balance,
  totalAccountValue,
  portfolio,
}: AllocationChartProps) {
  const [view, setView] = useState<'donut' | 'bars'>('bars');

  const total = parseFloat(totalAccountValue) || 0;
  const cashValue = parseFloat(balance) || 0;

  const stockSlices = portfolio
    .map((item) => ({
      name: item.symbol,
      value: parseFloat(item.currentValue) || 0,
    }))
    .sort((a, b) => b.value - a.value);

  const slices: AllocationSlice[] = [
    { name: 'Cash', value: cashValue, color: COLORS[0] },
    ...stockSlices.map((s, i) => ({
      ...s,
      color: COLORS[(i + 1) % COLORS.length],
    })),
  ];

  if (total === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        No account value to display.
      </div>
    );
  }

  // Build actual vs equal-weight comparison data
  const numSlots = slices.length; // cash + stocks
  const equalPct = 100 / numSlots;

  return (
    <div className="space-y-4">
      {/* View Toggle */}
      {stockSlices.length > 1 && (
        <div className="flex justify-end mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setView(view === 'bars' ? 'donut' : 'bars')}
          >
            {view === 'bars' ? (
              <>
                <PieChartIcon className="mr-2 h-4 w-4" />
                View Pie Chart
              </>
            ) : (
              <>
                <BarChart3 className="mr-2 h-4 w-4" />
                View Analysis
              </>
            )}
          </Button>
        </div>
      )}

      {/* Overview: Donut + Legend */}
      {view === 'donut' && (
        <div className="flex flex-col items-center gap-6 pt-4">
          {/* Donut Chart */}
          <div className="relative w-[220px] h-[220px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {slices.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-bold text-foreground tabular-nums">
                {formatUSD(total)}
              </span>
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider">
                Total
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 w-full max-w-md">
            {slices.map((slice) => {
              const pct = total > 0 ? (slice.value / total) * 100 : 0;
              return (
                <div key={slice.name} className="flex flex-col items-center text-sm">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: slice.color }}
                    />
                    <span className="text-foreground font-medium">{slice.name}</span>
                  </div>
                  <span className="text-muted-foreground tabular-nums text-xs mt-1">
                    {formatPercent(pct, { showSign: false })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Analysis: Allocation vs Equal Weight Comparison */}
      {view === 'bars' && stockSlices.length > 1 && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-1.5 relative group cursor-help w-max">
            <p className="text-xs text-muted-foreground font-medium">Your allocation vs. equal-weight constraint</p>
            <Info className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
            <div className="absolute left-0 bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-popover text-popover-foreground text-xs rounded-md border border-border shadow-md px-3 py-2 pointer-events-none z-50 w-64 max-w-[80vw]">
              A balanced portfolio spreads risk evenly across all assets.
            </div>
          </div>
          
          <div className="space-y-4">
            {slices.map((slice) => {
              const actualPct = total > 0 ? (slice.value / total) * 100 : 0;
              const diff = actualPct - equalPct;
              
              const isHeavy = diff > 15;
              const isLight = diff < -5;
              const badgeVariant = isHeavy ? "destructive" : isLight ? "outline" : "secondary";
              const badgeText = isHeavy ? "Heavy Exposure" : isLight ? "Underweight" : "Balanced";

              return (
                <div key={slice.name} className="flex items-center gap-4">
                  {/* Label */}
                  <div className="w-16 flex items-center gap-2 shrink-0">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: slice.color }}
                    />
                    <span className="text-sm text-foreground font-medium truncate">{slice.name}</span>
                  </div>
                  
                  {/* Comparison bar */}
                  <div className="relative h-2.5 flex-1 rounded-full bg-muted/60 overflow-hidden shrink-0">
                    {/* Equal-weight marker */}
                    <div
                      className="absolute top-0 bottom-0 w-1 bg-foreground/30 z-10"
                      style={{ left: `${Math.min(equalPct, 100)}%` }}
                    />
                    {/* Actual fill */}
                    <div
                      className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(actualPct, 100)}%`,
                        backgroundColor: slice.color,
                        opacity: Math.abs(diff) > 15 ? 1 : 0.8,
                      }}
                    />
                  </div>
                  
                  {/* Values (Dollar + Pct) */}
                  <div className="w-32 flex flex-col items-end shrink-0 leading-tight">
                    <span className="text-sm font-semibold text-foreground">
                      {formatUSD(slice.value)}
                    </span>
                    <span className="text-[11px] tabular-nums text-muted-foreground mt-0.5">
                      {formatPercent(actualPct, { showSign: false })}
                      <span className="mx-1 opacity-40">/</span>
                      <span className="text-foreground/70">{formatPercent(equalPct, { showSign: false })}</span>
                    </span>
                  </div>

                  {/* Risk Badge */}
                  <div className="w-24 shrink-0 flex justify-end">
                    <Badge variant={badgeVariant as any} className="text-[10px] whitespace-nowrap px-2 py-0.5 h-auto">
                      {badgeText}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground/60 pt-2 border-t border-border/50">
            The vertical marker shows the equal-weight balance ({formatPercent(equalPct, { showSign: false })} target).
          </p>
        </div>
      )}
    </div>
  );
}
