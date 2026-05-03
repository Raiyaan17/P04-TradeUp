'use client';

import { PieChart, Droplets, TrendingDown, GraduationCap, Target } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface HealthEducationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const pillars = [
  {
    icon: PieChart,
    title: 'Diversification',
    subtitle: 'Concentration Risk',
    color: 'text-blue-400',
    bgColor: 'bg-blue-900/20',
    borderColor: 'border-blue-500/20',
    threshold: '> 40% in one stock = Warning · > 60% = Critical',
    content:
      'Putting too much of your money into a single stock is one of the most common mistakes new investors make. If that one company has bad news, your entire portfolio takes a massive hit. Professional traders rarely put more than 5-10% of their capital into a single position.',
    takeaway:
      'Spread your investments across multiple stocks to reduce the impact of any single bad performer.',
  },
  {
    icon: Droplets,
    title: 'Cash Buffer',
    subtitle: 'Liquidity Risk',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-900/20',
    borderColor: 'border-cyan-500/20',
    threshold: '< 5% cash = Warning · < 2% cash = Critical',
    content:
      'Being "fully invested" sounds productive, but it leaves you unable to act when an opportunity appears — like a stock you\'ve been watching going on sale. Cash is also your safety net during downturns; without it, you\'re forced to sell at the worst possible time.',
    takeaway:
      'Keep at least 5% of your portfolio in cash so you can buy opportunities and weather volatility.',
  },
  {
    icon: TrendingDown,
    title: 'Cutting Losers',
    subtitle: 'Loss Tolerance',
    color: 'text-rose-400',
    bgColor: 'bg-rose-900/20',
    borderColor: 'border-rose-500/20',
    threshold: '< -15% on a position = Warning · < -30% = Critical',
    content:
      'Holding onto a losing stock hoping it will "come back" is driven by psychology, not strategy. This behavior — called loss aversion — causes traders to ride losses far too long while cutting winners too early. The best traders define their exit points before they enter a trade.',
    takeaway:
      'Set a maximum loss threshold for each position. If a stock drops past your limit, consider selling and reallocating.',
  },
];

export function HealthEducationModal({
  open,
  onOpenChange,
}: HealthEducationModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <GraduationCap className="h-4 w-4 text-primary" />
            </div>
            <div>
              <DialogTitle>Understanding Your Portfolio Health</DialogTitle>
              <DialogDescription>
                Learn the three pillars of risk management that protect your
                capital.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* The Goal */}
        <div className="rounded-lg border border-border/50 bg-card/80 px-4 py-3 mt-2">
          <div className="flex items-start gap-2">
            <Target className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">The Goal</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Professional traders don&apos;t just chase gains — they manage
                risk. The Health Monitor tracks the same fundamentals that
                institutional investors watch, adapted for your portfolio. A
                healthy portfolio is one that can{' '}
                <span className="text-foreground font-medium">
                  survive bad days
                </span>{' '}
                and{' '}
                <span className="text-foreground font-medium">
                  capitalize on good ones
                </span>
                .
              </p>
            </div>
          </div>
        </div>

        {/* Pillars */}
        <div className="space-y-4 mt-2">
          {pillars.map((pillar, index) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.title}
                className={cn(
                  'rounded-lg border px-4 py-4',
                  pillar.borderColor,
                  pillar.bgColor,
                )}
              >
                {/* Pillar Header */}
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-lg',
                      pillar.bgColor,
                    )}
                  >
                    <Icon className={cn('h-5 w-5', pillar.color)} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Pillar {index + 1}: {pillar.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {pillar.subtitle}
                    </p>
                  </div>
                </div>

                {/* Content */}
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {pillar.content}
                </p>

                {/* Threshold indicator */}
                <div className="mt-3 rounded-md bg-background/50 border border-border/30 px-3 py-2">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      Our thresholds:{' '}
                    </span>
                    {pillar.threshold}
                  </p>
                </div>

                {/* Takeaway */}
                <div className="mt-3 flex items-start gap-2">
                  <span className="text-emerald-400 text-sm mt-px">💡</span>
                  <p className="text-xs font-medium text-emerald-400/90 leading-relaxed">
                    {pillar.takeaway}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
