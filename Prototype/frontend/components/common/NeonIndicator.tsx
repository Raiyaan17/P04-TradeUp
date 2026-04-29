import React from "react"
import { cn } from "@/lib/utils"

interface NeonIndicatorProps {
  active?: boolean
  className?: string
}

export function NeonIndicator({ active = true, className }: NeonIndicatorProps) {
  return (
    <div className={cn("relative flex h-2 w-2", className)}>
      {active && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
      )}
      <span className={cn("relative inline-flex rounded-full h-2 w-2", active ? "bg-primary" : "bg-muted-foreground")}></span>
    </div>
  )
}
