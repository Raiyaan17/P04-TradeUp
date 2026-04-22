'use client';

import { ShieldCheck, AlertTriangle, AlertOctagon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type HealthStatus = 'good' | 'warning' | 'critical';

interface HealthBadgeProps {
  status: HealthStatus;
  onClick?: () => void;
  className?: string;
}

const config: Record<HealthStatus, {
  label: string;
  icon: typeof ShieldCheck;
  classes: string;
}> = {
  good: {
    label: 'Healthy',
    icon: ShieldCheck,
    classes: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-500/30',
  },
  warning: {
    label: 'Warning',
    icon: AlertTriangle,
    classes: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-500/30',
  },
  critical: {
    label: 'Critical',
    icon: AlertOctagon,
    classes: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-500/30',
  },
};

export function HealthBadge({ status, onClick, className }: HealthBadgeProps) {
  const { label, icon: Icon, classes } = config[status];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-200 hover:scale-105 cursor-pointer',
        classes,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
