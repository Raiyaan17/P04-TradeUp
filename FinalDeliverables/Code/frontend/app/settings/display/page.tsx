"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

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
        <div className="bg-card rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.2)] border border-transparent overflow-hidden">
          <div className="p-6 border-b border-border/50">
            <h2 className="text-2xl font-bold tracking-tight">Theme</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Choose how TradeUp looks to you. Select a theme preference.
            </p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {THEME_OPTIONS.map((option) => (
                <div
                  key={option.value}
                  className="flex flex-col items-center gap-4 p-6 rounded-2xl border-2 border-border bg-card animate-pulse"
                >
                  <div className="h-12 w-12 rounded-full bg-muted" />
                  <div className="h-4 w-20 rounded bg-muted" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.2)] border border-transparent hover:border-primary/20 transition-colors overflow-hidden">
        <div className="p-6 border-b border-border/50">
          <h2 className="text-2xl font-bold tracking-tight">Theme</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Choose how TradeUp looks to you. Select a theme preference.
          </p>
        </div>
        <div className="p-6 space-y-6">
          {/* Theme selection grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {THEME_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isSelected = theme === option.value;

              return (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value)}
                  className={cn(
                    "flex flex-col items-center gap-4 p-6 rounded-2xl border-2 transition-all cursor-pointer",
                    "hover:bg-muted/50 hover:border-border",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    isSelected
                      ? "border-primary bg-primary/5 shadow-[0_0_15px_rgba(74,142,255,0.15)]"
                      : "border-border bg-card"
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center justify-center h-14 w-14 rounded-full transition-colors",
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-lg"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    <Icon className="h-7 w-7" />
                  </div>
                  <div className="text-center">
                    <Label className={cn(
                      "text-label-caps pointer-events-none block mb-2",
                      isSelected ? "text-primary" : "text-muted-foreground"
                    )}>
                      {option.label}
                    </Label>
                    <p className="text-xs font-mono text-muted-foreground leading-relaxed">
                      {option.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
