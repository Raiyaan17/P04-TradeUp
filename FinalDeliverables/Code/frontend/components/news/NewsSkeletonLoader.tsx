"use client";

interface NewsSkeletonLoaderProps {
    count?: number;
}

export function NewsSkeletonLoader({ count = 4 }: NewsSkeletonLoaderProps) {
    return (
        <div className="grid gap-6">
            {Array.from({ length: count }, (_, i) => `skeleton-${i}`).map((key) => (
                <div key={key} className="h-48 rounded-lg bg-muted animate-pulse" />
            ))}
        </div>
    );
}
