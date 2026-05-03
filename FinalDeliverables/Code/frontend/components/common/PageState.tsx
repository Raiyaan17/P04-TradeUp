'use client'

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCcw } from "lucide-react";

interface PageStateProps {
  /** Current state of the page */
  state: 'loading' | 'error' | 'empty' | 'ready';
  /** Error message to display */
  error?: string | null;
  /** Callback for retry action */
  onRetry?: () => void;
  /** Custom loading message */
  loadingMessage?: string;
  /** Custom empty state component */
  emptyComponent?: React.ReactNode;
  /** Children to render when ready */
  children?: React.ReactNode;
  /** Additional className */
  className?: string;
}

/**
 * PageState handles loading, error, and empty states consistently across pages.
 * Use this to wrap page content that depends on async data.
 */
export function PageState({
  state,
  error,
  onRetry,
  loadingMessage = "Loading...",
  emptyComponent,
  children,
  className,
}: PageStateProps) {
  if (state === 'loading') {
    return (
      <div className={cn("flex flex-col items-center justify-center py-16", className)}>
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <span className="mt-4 text-muted-foreground text-sm">{loadingMessage}</span>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className={cn("flex flex-col items-center justify-center py-16", className)}>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-foreground">Something went wrong</h3>
        <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">
          {error || "An unexpected error occurred. Please try again."}
        </p>
        {onRetry && (
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={onRetry}
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Try again
          </Button>
        )}
      </div>
    );
  }

  if (state === 'empty') {
    if (emptyComponent) {
      return <>{emptyComponent}</>;
    }
    return (
      <div className={cn("flex flex-col items-center justify-center py-16", className)}>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <span className="text-2xl">📭</span>
        </div>
        <h3 className="mt-4 text-lg font-semibold text-foreground">No data found</h3>
        <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">
          There&apos;s nothing here yet. Check back later or try a different filter.
        </p>
      </div>
    );
  }

  // state === 'ready'
  return <>{children}</>;
}

/**
 * Helper hook to compute PageState state from common loading patterns
 */
export function usePageState({
  isLoading,
  error,
  isEmpty,
}: {
  isLoading: boolean;
  error?: string | null;
  isEmpty?: boolean;
}): 'loading' | 'error' | 'empty' | 'ready' {
  if (isLoading) return 'loading';
  if (error) return 'error';
  if (isEmpty) return 'empty';
  return 'ready';
}

export default PageState;
