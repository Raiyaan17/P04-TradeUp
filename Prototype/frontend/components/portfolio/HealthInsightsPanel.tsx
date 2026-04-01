'use client';

import { useState } from 'react';
import {
  PieChart,
  Droplets,
  TrendingDown,
  ChevronDown,
  ShieldCheck,
  BookOpen,
  Info,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { HealthStatus } from './HealthBadge';
import { HealthEducationModal } from './HealthEducationModal';

export interface HealthSignal {
  type: 'concentration' | 'liquidity' | 'lossTolerance';
  status: 'good' | 'warning' | 'critical';
  message: string;
  value: number;
  relatedSymbol?: string;
}

interface HealthInsightsPanelProps {
  status: HealthStatus;
  signals: HealthSignal[];
  id?: string;
}

const signalMeta: Record<
  HealthSignal['type'],
  { label: string; icon: typeof PieChart; hint: string }
> = {
  concentration: {
    label: 'Concentration Risk',
    icon: PieChart,
    hint: 'Over-concentrating in a single stock exposes you to severe volatility. If that one company underperforms, your entire account suffers.',
  },
  liquidity: {
    label: 'Liquidity Risk',
    icon: Droplets,
    hint: "Being fully invested leaves you unable to buy opportunities or weather downturns. Cash is your safety net and your 'dry powder' for dips.",
  },
  lossTolerance: {
    label: 'Loss Tolerance',
    icon: TrendingDown,
    hint: 'Holding losing positions hoping they\'ll "come back" is loss aversion — a psychological bias, not a strategy. The best traders define exit points before entering.',
  },
};

const statusColor: Record<
  HealthStatus,
  {
    border: string;
    bg: string;
    text: string;
    dot: string;
  }
> = {
  good: {
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-900/10',
    text: 'text-emerald-400',
    dot: 'bg-emerald-400',
  },
  warning: {
    border: 'border-amber-500/30',
    bg: 'bg-amber-900/10',
    text: 'text-amber-400',
    dot: 'bg-amber-400',
  },
  critical: {
    border: 'border-red-500/30',
    bg: 'bg-red-900/10',
    text: 'text-red-400',
    dot: 'bg-red-400',
  },
};

export function HealthInsightsPanel({
  status,
  signals,
  id,
}: HealthInsightsPanelProps) {
  const hasIssues = status !== 'good';
  const [expanded, setExpanded] = useState(hasIssues);
  const [educationOpen, setEducationOpen] = useState(false);
  const [expandedHints, setExpandedHints] = useState<Set<string>>(new Set());
  const colors = statusColor[status];

  const toggleHint = (type: string) => {
    setExpandedHints((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  // Filter to only show non-good signals when there are issues
  const activeSignals = hasIssues
    ? signals.filter((s) => s.status !== 'good')
    : signals;

  return (
    <>
      <Card
        id={id}
        className={cn(
          'mb-6 border-l-2 transition-all duration-300',
          colors.border,
          colors.bg,
        )}
      >
        <CardContent className="pt-4 pb-4">
          {/* Header row — always visible */}
          <div className="flex w-full items-center justify-between">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="flex flex-1 items-center gap-2 text-left cursor-pointer"
            >
              <span
                className={cn(
                  'inline-block h-2 w-2 rounded-full animate-pulse',
                  colors.dot,
                )}
              />
              <span className={cn('text-sm font-semibold', colors.text)}>
                Portfolio Health
              </span>
              <span className="text-xs text-muted-foreground">
                {hasIssues
                  ? `${activeSignals.length} issue${activeSignals.length > 1 ? 's' : ''} detected`
                  : 'No issues detected'}
              </span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-muted-foreground transition-transform duration-200',
                  expanded && 'rotate-180',
                )}
              />
            </button>

            {/* Education trigger */}
            <button
              type="button"
              onClick={() => setEducationOpen(true)}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-card/80 transition-colors cursor-pointer"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Learn about these metrics</span>
              <span className="sm:hidden">Learn</span>
            </button>
          </div>

          {/* Expanded details */}
          <div
            className={cn(
              'grid transition-all duration-300',
              expanded
                ? 'grid-rows-[1fr] opacity-100 mt-4'
                : 'grid-rows-[0fr] opacity-0',
            )}
          >
            <div className="overflow-hidden">
              {hasIssues ? (
                <div className="space-y-3">
                  {activeSignals.map((signal) => {
                    const meta = signalMeta[signal.type];
                    const sigColors = statusColor[signal.status];
                    const Icon = meta.icon;
                    const hintExpanded = expandedHints.has(signal.type);

                    return (
                      <div
                        key={signal.type}
                        className="rounded-lg bg-card/60 border border-border/50 px-4 py-3"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                              sigColors.bg,
                            )}
                          >
                            <Icon
                              className={cn('h-4 w-4', sigColors.text)}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground">
                              {meta.label}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                              {signal.message}
                            </p>
                            {/* Tier 1: "Why this matters" toggle */}
                            <button
                              type="button"
                              onClick={() => toggleHint(signal.type)}
                              className="mt-1.5 flex items-center gap-1 text-xs text-primary/70 hover:text-primary transition-colors cursor-pointer"
                            >
                              <Info className="h-3 w-3" />
                              {hintExpanded
                                ? 'Hide explanation'
                                : 'Why does this matter?'}
                            </button>
                          </div>
                        </div>

                        {/* Expandable educational hint */}
                        <div
                          className={cn(
                            'grid transition-all duration-200',
                            hintExpanded
                              ? 'grid-rows-[1fr] opacity-100 mt-2'
                              : 'grid-rows-[0fr] opacity-0',
                          )}
                        >
                          <div className="overflow-hidden">
                            <div className="rounded-md bg-primary/5 border border-primary/10 px-3 py-2.5 ml-11">
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                {meta.hint}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-emerald-400/80">
                  <ShieldCheck className="h-4 w-4" />
                  Your portfolio is well-balanced. No critical risks detected.
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tier 2: Education Modal */}
      <HealthEducationModal
        open={educationOpen}
        onOpenChange={setEducationOpen}
      />
    </>
  );
}
