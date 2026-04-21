'use client';

import { useState } from 'react';
import { PieChart, Sector, ResponsiveContainer } from 'recharts';
import { formatUSD, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tabs } from '@/components/ui/tabs';
import { PieChart as PieChartIcon, BarChart3, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

const TABS_VIEW = [
  { id: 'donut', label: 'Donut', icon: <PieChartIcon className="h-4 w-4" /> },
  { id: 'bars', label: 'Analysis', icon: <BarChart3 className="h-4 w-4" /> },
];

export function AllocationChart({
  balance,
  totalAccountValue,
  portfolio,
}: AllocationChartProps) {
  const [view, setView] = useState<'donut' | 'bars'>('donut');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

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
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
          <PieChartIcon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="text-center max-w-xs">
          <p className="text-sm font-medium text-foreground">No account value</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Fund your wallet or buy stocks to see your portfolio allocation here.
          </p>
        </div>
      </div>
    );
  }

  // Build actual vs equal-weight comparison data
  const numSlots = slices.length; // cash + stocks
  const equalPct = 100 / numSlots;
  // Scale threshold: small portfolios allow more concentration before flagging
  const heavyThreshold = Math.max(15, 50 / numSlots);

  return (
    <div className="space-y-4">
      {/* View Toggle — always visible when slices >= 2 (cash + ≥1 stock) */}
      {slices.length >= 2 && (
        <div className="flex justify-end mb-4">
          <Tabs
            tabs={TABS_VIEW}
            activeTab={view}
            onTabChange={(id) => setView(id as 'donut' | 'bars')}
          />
        </div>
      )}

      {/* Overview: Donut + Legend */}
      {view === 'donut' && (
        <div className="flex flex-col items-center gap-6 pt-4">
          {/* Donut Chart */}
          <div className="relative w-[250px] h-[250px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                {slices.map((entry, index) => {
                  const slicesBefore = slices.slice(0, index);
                  const startAngle = 90 - slicesBefore.reduce((sum, s) => sum + (s.value / total) * 360, 0);
                  const endAngle = startAngle - (entry.value / total) * 360;
                  const isActive = activeIndex === index;

                  return (
                    <Sector
                      key={entry.name}
                      cx={125}
                      cy={125}
                      innerRadius={isActive ? 67 : 70}
                      outerRadius={isActive ? 112 : 98}
                      startAngle={startAngle}
                      endAngle={endAngle}
                      fill={entry.color}
                      style={{
                        transition: 'all 0.25s ease-out',
                        filter: isActive ? 'drop-shadow(0 2px 8px rgba(0,0,0,0.35))' : 'none',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={() => setActiveIndex(index)}
                      onMouseLeave={() => setActiveIndex(null)}
                    />
                  );
                })}
              </PieChart>
            </ResponsiveContainer>
            {/* Center label with crossfade */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeIndex ?? 'total'}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  className="flex flex-col items-center"
                >
                  {activeIndex !== null ? (
                    <>
                      <span className="text-lg font-bold text-foreground tabular-nums">
                        {formatUSD(slices[activeIndex].value)}
                      </span>
                      <span className="text-[11px] text-muted-foreground font-medium tracking-wider">
                        {slices[activeIndex].name}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-xl font-bold text-foreground tabular-nums">
                        {formatUSD(total)}
                      </span>
                      <span className="text-[11px] text-muted-foreground uppercase tracking-wider">
                        Total
                      </span>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Legend — responds to hover state */}
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 w-full max-w-md">
            {slices.map((slice, index) => {
              const pct = total > 0 ? (slice.value / total) * 100 : 0;
              const isActive = activeIndex === index;
              const isDimmed = activeIndex !== null && !isActive;
              return (
                <div
                  key={slice.name}
                  className={cn(
                    'flex flex-col items-center text-sm transition-opacity duration-200 cursor-pointer',
                    isDimmed && 'opacity-35',
                    isActive && 'opacity-100',
                  )}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn('h-2.5 w-2.5 rounded-full shrink-0 transition-transform duration-200', isActive && 'scale-125')}
                      style={{ backgroundColor: slice.color }}
                    />
                    <span className={cn('font-medium', isActive ? 'text-foreground' : 'text-foreground/80')}>
                      {slice.name}
                    </span>
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

      {/* Analysis: Allocation vs Equal Weight Comparison — renders for >= 1 slice */}
      {view === 'bars' && (
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
              
              const isHeavy = diff > heavyThreshold;
              const isLight = diff < -5;
              const badgeVariant = isHeavy ? "destructive" : "secondary";
              const badgeText = isHeavy ? "Heavy" : isLight ? "Under" : "Balanced";
              const badgeClassName = isLight ? "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/15 dark:text-orange-500 dark:border-orange-500/20" : "";

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
                    {/* Equal-weight marker with label */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-foreground/40 z-10 group/marker"
                      style={{ left: `${Math.min(equalPct, 100)}%` }}
                    >
                      <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 opacity-0 group-hover/marker:opacity-100 transition-opacity bg-popover text-popover-foreground text-[10px] rounded border border-border shadow-sm px-1.5 py-0.5 pointer-events-none whitespace-nowrap z-50">
                        Target: {formatPercent(equalPct, { showSign: false })}
                      </div>
                    </div>
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

                  {/* Risk Badge — hidden on small screens */}
                  <div className="w-20 shrink-0 hidden sm:flex justify-end">
                    <Badge variant={badgeVariant as any} className={cn("text-[10px] whitespace-nowrap px-2 py-0.5 h-auto", badgeClassName)}>
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
