'use client';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Target, HeartCrack, Banknote } from 'lucide-react';

export type SellReasonType = 'TARGET_HIT' | 'PANIC_EMOTION' | 'NEEDED_CASH';

interface SellJournalInputProps {
  sellReason: SellReasonType | null;
  onReasonChange: (reason: SellReasonType | null) => void;
  sellNote: string;
  onNoteChange: (note: string) => void;
  compact?: boolean;
}

const REASONS: { value: SellReasonType; label: string; icon: React.ReactNode; selectedClass: string }[] = [
  {
    value: 'TARGET_HIT',
    label: 'Target Hit',
    icon: <Target className="h-3.5 w-3.5" />,
    selectedClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  },
  {
    value: 'PANIC_EMOTION',
    label: 'Panic / Emotion',
    icon: <HeartCrack className="h-3.5 w-3.5" />,
    selectedClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  },
  {
    value: 'NEEDED_CASH',
    label: 'Needed Cash',
    icon: <Banknote className="h-3.5 w-3.5" />,
    selectedClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  },
];

export function SellJournalInput({
  sellReason,
  onReasonChange,
  sellNote,
  onNoteChange,
  compact = false,
}: SellJournalInputProps) {
  const toggleReason = (reason: SellReasonType) => {
    onReasonChange(sellReason === reason ? null : reason);
  };

  return (
    <div className={cn('flex flex-col gap-2.5', compact ? 'mt-2' : 'mt-3')}>
      <p className="text-xs text-muted-foreground font-medium">
        Why are you selling? <span className="text-muted-foreground/60">(optional)</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {REASONS.map((r) => (
          <button
            key={r.value}
            type="button"
            onClick={() => toggleReason(r.value)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition-all duration-150',
              sellReason === r.value
                ? r.selectedClass
                : 'bg-muted/50 text-muted-foreground border-border/50 hover:border-border hover:text-foreground'
            )}
          >
            {r.icon}
            {r.label}
          </button>
        ))}
      </div>
      <Input
        placeholder="One sentence about this trade..."
        value={sellNote}
        onChange={(e) => onNoteChange(e.target.value)}
        maxLength={280}
        className={cn('text-sm', compact ? 'h-8' : 'h-9')}
      />
    </div>
  );
}
