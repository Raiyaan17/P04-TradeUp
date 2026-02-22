"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Sun, Moon, Monitor } from "lucide-react";

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: Sun, description: "Light mode for bright environments" },
  { value: "dark", label: "Dark", icon: Moon, description: "Dark mode for low-light environments" },
  { value: "system", label: "System", icon: Monitor, description: "Automatically match your system settings" },
] as const;

export default function DisplaySettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch by only rendering theme UI after mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Show skeleton while mounting to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Theme</CardTitle>
            <CardDescription>
              Choose how TradeUp looks to you. Select a theme preference.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {THEME_OPTIONS.map((option) => (
                <div
                  key={option.value}
                  className="flex flex-col items-center gap-3 p-4 rounded-lg border border-border bg-card animate-pulse"
                >
                  <div className="h-10 w-10 rounded-full bg-muted" />
                  <div className="h-4 w-16 rounded bg-muted" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
          <CardDescription>
            Choose how TradeUp looks to you. Select a theme preference.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Theme selection grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {THEME_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isSelected = theme === option.value;

              return (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value)}
                  className={cn(
                    "flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all cursor-pointer",
                    "hover:bg-accent hover:border-accent-foreground/20",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card"
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center justify-center h-12 w-12 rounded-full transition-colors",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="text-center">
                    <Label className={cn(
                      "font-medium pointer-events-none",
                      isSelected && "text-primary"
                    )}>
                      {option.label}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {option.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
