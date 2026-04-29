"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppShell } from "@/components/layout";
import { PageHeader } from "@/components/common";

import { cn } from "@/lib/utils";
import { User, Monitor } from "lucide-react";

const SETTINGS_SECTIONS = [
  { href: "/settings/account", label: "Account", icon: User },
  { href: "/settings/display", label: "Display", icon: Monitor },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AppShell>
      <PageHeader title="Settings" description="Manage your account and preferences" />
      
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-64 shrink-0">
          <div className="bg-card rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.2)] p-4 border border-transparent">
            <nav className="space-y-2">
              {SETTINGS_SECTIONS.map((section) => {
                const Icon = section.icon;
                return (
                  <Link
                    key={section.href}
                    href={section.href}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-label-caps transition-colors",
                      pathname === section.href
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {section.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content pane */}
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>
    </AppShell>
  );
}
