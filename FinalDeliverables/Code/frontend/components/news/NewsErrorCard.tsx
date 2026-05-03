"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface NewsErrorCardProps {
    error: string;
    onRetry: () => void;
}

export function NewsErrorCard({ error, onRetry }: NewsErrorCardProps) {
    return (
        <Card className="border-destructive bg-destructive/10">
            <CardContent className="py-8 text-center">
                <p className="text-destructive">{error}</p>
                <Button variant="outline" className="mt-4" onClick={onRetry}>
                    Try Again
                </Button>
            </CardContent>
        </Card>
    );
}
