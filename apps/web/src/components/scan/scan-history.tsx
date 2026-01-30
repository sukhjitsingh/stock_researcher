'use client';

import { cn } from '@/lib/utils';
import type { MarketScan } from '@/types/scan';
import { format } from 'date-fns';
import { Activity, Calendar } from 'lucide-react';

interface ScanHistoryProps {
  scans: MarketScan[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export function ScanHistory({ scans, selectedId, onSelect }: ScanHistoryProps) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-muted-foreground mb-2 px-2">History</h3>
      <div className="space-y-1">
        {scans.map((scan) => (
          <button
            key={scan.id}
            onClick={() => onSelect(scan.id)}
            className={cn(
              "w-full flex items-start flex-col gap-1 p-3 rounded-lg text-left transition-all border",
              selectedId === scan.id
                ? "bg-primary/10 border-primary/20 shadow-[0_0_10px_-5px_var(--primary)]"
                : "bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10"
            )}
          >
            <div className="flex items-center justify-between w-full">
              <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border",
                selectedId === scan.id ? "border-primary/30 text-primary bg-primary/10" : "border-white/10 text-muted-foreground"
              )}>
                #{scan.id}
              </span>
              <span className="text-xs text-muted-foreground flex items-center">
                <Calendar className="mr-1 h-3 w-3" />
                {format(new Date(scan.date), 'MMM d, HH:mm')}
              </span>
            </div>

            <div className="mt-1 px-1">
              <p className={cn("text-sm font-medium", selectedId === scan.id ? "text-white" : "text-white/80")}>
                {scan.dominant_theme || "General Market Scan"}
              </p>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <Activity className="h-3 w-3" />
                <span>{scan.ticker_count} Tickers found</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
