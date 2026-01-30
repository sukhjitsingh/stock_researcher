'use client';

import { ScanHistory } from '@/components/scan/scan-history';
import { ScanViewer } from '@/components/scan/viewer';
import { Button } from '@/components/ui/button';
import { ApiClient } from '@/lib/api';
import type { MarketScan } from '@/types/scan';
import type { MarketScanResponse, ScanSummary } from '@stock-researcher/shared';
import { Loader2, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function MarketScanPage() {
  const [scans, setScans] = useState<MarketScan[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Helper to map API scan details to Frontend MarketScan
  const mapToMarketScan = (summary: ScanSummary, details?: MarketScanResponse): MarketScan => {
    const base = {
      id: summary.scan_id,
      date: typeof summary.date === 'string' ? summary.date : new Date(summary.date).toISOString(),
      scan_type: "DAILY", // Default/Derived?
      dominant_theme: summary.dominant_theme || "Market Scan",
      ticker_count: summary.ticker_count,
      top_gainers: [],
      top_losers: [],
      most_active: [],
    };

    if (details) {
      const formatResult = (r: any) => ({
        ticker: r.ticker,
        price: r.price,
        change_amount: r.change_amount,
        change_percentage: r.change_percent.toFixed(2) + '%',
        volume: r.volume
      });
      return {
        ...base,
        id: details.scan_id,
        date: new Date(details.scan_date).toISOString(),
        dominant_theme: details.dominant_theme,
        top_gainers: details.top_gainers.map(formatResult),
        top_losers: details.top_losers.map(formatResult),
        most_active: details.most_active.map(formatResult),
      };
    }

    return base;
  };

  // Load scans on mount
  useEffect(() => {
    fetchScans();
  }, []);

  // Load details when selectedId changes
  useEffect(() => {
    if (selectedId) {
      fetchScanDetails(selectedId);
    }
  }, [selectedId]);

  const fetchScans = async () => {
    try {
      const summaries = await ApiClient.get<ScanSummary[]>('/api/scans');
      const mappedScans = summaries.map(s => mapToMarketScan(s));
      setScans(mappedScans);

      if (mappedScans.length > 0 && !selectedId) {
        setSelectedId(mappedScans[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch scans", error);
    }
  };

  const fetchScanDetails = async (id: number) => {
    // Check if we already have details (e.g. top_gainers is populated)
    const existing = scans.find(s => s.id === id);
    if (existing && existing.top_gainers.length > 0) return;

    try {
      const details = await ApiClient.get<MarketScanResponse>(`/api/scan/${id}`);
      // Merge details into state
      setScans(prev => prev.map(s =>
        s.id === id ? mapToMarketScan({ ...s, scan_id: s.id, date: s.date } as any, details) : s
      ));
    } catch (error) {
      console.error(`Failed to fetch details for scan ${id}`, error);
    }
  };

  const handleRunScan = async () => {
    setIsRunning(true);
    try {
      // Trigger new scan
      const result = await ApiClient.post<MarketScanResponse>('/api/scan', { max_results: 20 });

      // Map result to MarketScan
      // We need a summary-like object for the base mapping, effectively same properties
      const summary: ScanSummary = {
        scan_id: result.scan_id,
        date: result.scan_date,
        dominant_theme: result.dominant_theme,
        ticker_count: result.ticker_count
      };

      const newScan = mapToMarketScan(summary, result);

      setScans([newScan, ...scans]);
      setSelectedId(newScan.id);
    } catch (error) {
      console.error("Failed to run scan:", error);
    } finally {
      setIsRunning(false);
    }
  };

  const [isRunning, setIsRunning] = useState(false);

  const selectedScan = scans.find(s => s.id === selectedId);

  return (
    <div className="flex h-full gap-6">
      {/* Left Sidebar: Scan History */}
      <div className="w-80 flex-shrink-0 flex flex-col gap-4">
        <div className="p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md">
          <Button
            onClick={handleRunScan}
            disabled={isRunning}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_-5px_var(--primary)] font-bold py-6"
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Scanning Market...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-5 w-5" />
                Run New Scan
              </>
            )}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-2">
          <ScanHistory
            scans={scans}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>
      </div>

      {/* Main Content: Scan Viewer */}
      <div className="flex-1 min-w-0">
        {selectedScan ? (
          <ScanViewer scan={selectedScan} />
        ) : (
          <div className="h-full flex items-center justify-center rounded-xl border border-white/10 bg-white/5 backdrop-blur-md text-muted-foreground">
            Select a scan to view details
          </div>
        )}
      </div>
    </div>
  );
}
