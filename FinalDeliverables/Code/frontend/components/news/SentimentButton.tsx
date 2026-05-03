"use client";

import { Brain } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SentimentButtonProps {
    isAnalyzing: boolean;
    onAnalyze: (e: React.MouseEvent) => void;
}

export function SentimentButton({ isAnalyzing, onAnalyze }: SentimentButtonProps) {
    return (
        <>
            <Button
                variant="ghost"
                size="icon-sm"
                onClick={onAnalyze}
                className="h-6 w-6 hover:bg-emerald-500/10 hover:text-emerald-500 transition-all duration-200"
                title="Analyze sentiment"
                disabled={isAnalyzing}
            >
                {isAnalyzing ? (
                    <div className="h-3 w-3 animate-spin rounded-full border border-emerald-500 border-t-transparent" />
                ) : (
                    <Brain className="h-3 w-3" />
                )}
            </Button>
            {isAnalyzing && (
                <span className="text-xs text-emerald-600 font-medium">Analyzing...</span>
            )}
        </>
    );
}
