'use client'

import { cn } from "@/lib/utils";

interface PageHeaderProps {
  /** Page title */
  title: string;
  /** Optional subtitle/description */
  description?: string;
  /** Optional right-side actions */
  actions?: React.ReactNode;
  /** Additional className */
  className?: string;
}

/**
 * PageHeader provides consistent page header styling across the app.
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-12", className)}>
      <div>
        <h1 className="text-foreground">
          {title}
        </h1>
        {description && (
          <p className="text-body-md text-muted-foreground mt-2">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}

export default PageHeader;
