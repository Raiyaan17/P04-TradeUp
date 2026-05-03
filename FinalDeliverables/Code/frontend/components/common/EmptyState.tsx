'use client'

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  Briefcase, 
  FileText, 
  Heart, 
  Plus,
  Search,
  TrendingUp,
} from "lucide-react";

type EmptyStateVariant = 
  | 'watchlist' 
  | 'portfolio' 
  | 'trades' 
  | 'news' 
  | 'search' 
  | 'default';

interface EmptyStateProps {
  /** Preset variant for common empty states */
  variant?: EmptyStateVariant;
  /** Custom icon (overrides variant icon) */
  icon?: React.ReactNode;
  /** Custom title (overrides variant title) */
  title?: string;
  /** Custom description (overrides variant description) */
  description?: string;
  /** Primary action button */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Additional className */
  className?: string;
}

const VARIANTS: Record<EmptyStateVariant, { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
}> = {
  watchlist: {
    icon: <Heart className="h-6 w-6 text-muted-foreground" />,
    title: "Your watchlist is empty",
    description: "Start tracking stocks by adding them to your watchlist from the Featured stocks section.",
  },
  portfolio: {
    icon: <Briefcase className="h-6 w-6 text-muted-foreground" />,
    title: "No holdings yet",
    description: "Start building your portfolio by buying your first stock.",
  },
  trades: {
    icon: <TrendingUp className="h-6 w-6 text-muted-foreground" />,
    title: "No trades yet",
    description: "Your trading history will appear here once you make your first trade.",
  },
  news: {
    icon: <FileText className="h-6 w-6 text-muted-foreground" />,
    title: "No articles found",
    description: "We couldn't find any news articles. Try a different search or check back later.",
  },
  search: {
    icon: <Search className="h-6 w-6 text-muted-foreground" />,
    title: "No results found",
    description: "We couldn't find anything matching your search. Try different keywords.",
  },
  default: {
    icon: <BarChart3 className="h-6 w-6 text-muted-foreground" />,
    title: "No data available",
    description: "There's nothing to display here yet.",
  },
};

/**
 * EmptyState provides consistent empty state UI across the app.
 * Use preset variants for common cases or customize with props.
 */
export function EmptyState({
  variant = 'default',
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  const preset = VARIANTS[variant];
  
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-12 px-4 text-center",
      className
    )}>
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
        {icon || preset.icon}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-foreground">
        {title || preset.title}
      </h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm">
        {description || preset.description}
      </p>
      {action && (
        <Button 
          className="mt-6"
          onClick={action.onClick}
        >
          <Plus className="mr-2 h-4 w-4" />
          {action.label}
        </Button>
      )}
    </div>
  );
}

export default EmptyState;
