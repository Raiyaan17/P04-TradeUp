'use client'

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { TopBar } from "./TopBar";
import { cn } from "@/lib/utils";
import { Chatbot } from "../chatbot/Chatbot";

interface AppShellProps {
  children: React.ReactNode;
  /** Whether to require authentication (redirects to / if not logged in) */
  requireAuth?: boolean;
  /** Custom className for the main content area */
  className?: string;
  /** Whether to use the full width (no max-w-7xl constraint) */
  fullWidth?: boolean;
}

/**
 * AppShell provides consistent layout for all app pages:
 * - TopBar navigation
 * - Consistent page container with max-width and padding
 * - Optional auth protection
 * - Loading state handling
 */
export function AppShell({
  children,
  requireAuth = true,
  className,
  fullWidth = false,
}: AppShellProps) {
  const router = useRouter();
  const { user, isLoading } = useUser();
  const [sessionChecked, setSessionChecked] = useState(!requireAuth);

  // Session check
  useEffect(() => {
    if (!requireAuth) {
      return;
    }

    const token = typeof window !== "undefined"
      ? localStorage.getItem("access_token")
      : null;

    if (!token) {
      router.replace("/");
    } else {
      // Avoid synchronous state update warning
      const timer = setTimeout(() => setSessionChecked(true), 0);
      return () => clearTimeout(timer);
    }
  }, [router, requireAuth]);

  // Show loading while checking session or loading user
  if (requireAuth && (!sessionChecked || isLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="text-muted-foreground text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  // If auth required but no user after loading, don't render (redirect happening)
  if (requireAuth && !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <main
        className={cn(
          fullWidth ? "px-6 py-6" : "max-w-7xl mx-auto px-6 py-6",
          className
        )}
      >
        {children}
      </main>
      <Chatbot />
    </div>
  );
}

export default AppShell;
