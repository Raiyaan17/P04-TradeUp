'use client';

import { cn } from '@/lib/utils';

interface Tab {
    id: string;
    label: string;
    badge?: number; // Optional badge count
    icon?: React.ReactNode;
}

interface TabsProps {
    tabs: Tab[];
    activeTab: string;
    onTabChange: (tabId: string) => void;
}

export function Tabs({ tabs, activeTab, onTabChange }: TabsProps) {
    return (
        <div className="flex flex-wrap gap-1 p-1 bg-muted/50 rounded-lg w-max max-w-full">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={cn(
                        "px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-1.5",
                        activeTab === tab.id
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    {tab.icon && (
                        <span className={cn(
                            "transition-opacity duration-150",
                            activeTab === tab.id ? "opacity-100" : "opacity-40"
                        )}>
                            {tab.icon}
                        </span>
                    )}
                    <span>{tab.label}</span>
                    {tab.badge !== undefined && tab.badge > 0 && (
                        <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 text-xs font-semibold rounded-full bg-destructive text-white">
                            {tab.badge}
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
}
