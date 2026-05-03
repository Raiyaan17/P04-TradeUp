'use client'

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useUser } from "@/context/UserContext";
import { TopBar } from "./TopBar";
import { cn } from "@/lib/utils";
import { Chatbot } from "../chatbot/Chatbot";
import { LayoutDashboard, BarChart3, TrendingUp, Users, Newspaper } from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  className?: string;
  fullWidth?: boolean;
}

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/portfolio", label: "Portfolio", icon: BarChart3 },
  { href: "/buy", label: "Trade", icon: TrendingUp },
  { href: "/oracle", label: "Game", icon: TrendingUp },
  { href: "/community", label: "Community", icon: Users },
  { href: "/news", label: "News", icon: Newspaper },
];

export function AppShell({
  children,
  requireAuth = true,
  className,
  fullWidth = false,
}: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useUser();
  const [sessionChecked, setSessionChecked] = useState(!requireAuth);

  useEffect(() => {
    if (!requireAuth) return;

    const token = typeof window !== "undefined"
      ? localStorage.getItem("access_token")
      : null;

    if (!token) {
      router.replace("/");
    } else {
      const timer = setTimeout(() => setSessionChecked(true), 0);
      return () => clearTimeout(timer);
    }
  }, [router, requireAuth]);

  if (requireAuth && (!sessionChecked || isLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (requireAuth && !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-[240px] bg-[#0e0e0e] border-r border-border shrink-0 min-h-screen sticky top-0">
        <div className="h-16 flex items-center px-6">
          <Link href="/dashboard" className="text-primary text-label-caps font-bold">
            ↗ TRADEUP
          </Link>
        </div>
        
        <nav className="flex-1 py-6 flex flex-col gap-2">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 px-6 py-3 text-label-caps transition-colors",
                  isActive
                    ? "border-l-[3px] border-primary text-foreground bg-primary/5"
                    : "border-l-[3px] border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main
          className={cn(
            fullWidth ? "px-6 py-6" : "max-w-[1200px] w-full mx-auto px-6 py-12",
            className,
            "flex-1"
          )}
        >
          {children}
        </main>
        
        {/* Mobile Bottom Tab Bar */}
        <div className="md:hidden sticky bottom-0 z-50 bg-[#0e0e0e] border-t border-border flex items-center justify-around h-16 px-2">
          {NAV_LINKS.slice(0, 4).map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex flex-col items-center justify-center w-full h-full gap-1 border-b-[3px]",
                  isActive ? "border-primary text-primary" : "border-transparent text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-bold tracking-widest uppercase">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
      
      <Chatbot />
    </div>
  );
}

export default AppShell;
