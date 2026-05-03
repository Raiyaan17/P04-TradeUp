import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

interface DataCardProps {
  title: string
  value: string | number
  delta?: {
    value: string | number
    isPositive: boolean
  }
  className?: string
}

export function DataCard({ title, value, delta, className }: DataCardProps) {
  return (
    <Card className={cn("p-6", className)}>
      <CardContent className="p-0 flex flex-col gap-2">
        <span className="text-label-caps text-muted-foreground">{title}</span>
        <h2 className="text-foreground">{value}</h2>
        {delta && (
          <Badge
            variant={delta.isPositive ? "success" : "error"}
            className="w-fit"
          >
            {delta.isPositive ? "+" : ""}
            {delta.value}
          </Badge>
        )}
      </CardContent>
    </Card>
  )
}
