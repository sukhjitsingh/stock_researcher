'use client';

import { ScanHistory } from '@/components/scan/scan-history';
import { ScanViewer } from '@/components/scan/viewer';
import { Button } from '@/components/ui/button';
import type { MarketScan } from '@/types/scan';
import { Loader2, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function MarketScanPage() {
  const [scans, setScans] = useState<MarketScan[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load scans on mount
  useEffect(() => {
    fetchScans();
  }, []);

  const fetchScans = async () => {
    try {
      // Mock data fallback if API fails (for development)
      // const data = await ApiClient.get<MarketScan[]>('/api/scans');
      // setScans(data);

      // --- MOCK DATA FOR DEMO ---
      const mockScans: MarketScan[] = [
        {
          id: 101,
          date: new Date().toISOString(),
          scan_type: "DAILY",
          dominant_theme: "Tech Sector Rally",
          ticker_count: 15,
          top_gainers: [
            { ticker: "NVDA", price: 780.50, change_amount: 25.40, change_percentage: "+3.4%", volume: 45000000 },
            { ticker: "AMD", price: 180.20, change_amount: 8.10, change_percentage: "+4.7%", volume: 22000000 },
          ],
          top_losers: [
            { ticker: "INTC", price: 42.10, change_amount: -1.20, change_percentage: "-2.8%", volume: 30000000 },
          ],
          most_active: [],
        },
        {
          id: 100,
          date: new Date(Date.now() - 86400000).toISOString(),
          scan_type: "DAILY",
          dominant_theme: "Mixed Retail",
          ticker_count: 8,
          top_gainers: [],
          top_losers: [],
          most_active: [],
        }
      ];
      setScans(mockScans);
      if (mockScans.length > 0 && !selectedId) {
        setSelectedId(mockScans[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch scans", error);
    }
  };

  const handleRunScan = async () => {
    setIsRunning(true);
    // Simulate API delay
    setTimeout(() => {
      const newScan: MarketScan = {
        id: Date.now(),
        date: new Date().toISOString(),
        scan_type: "REALTIME",
        dominant_theme: "Live Market Scan",
        ticker_count: 24,
        top_gainers: [
          { ticker: "TSLA", price: 210.00, change_amount: 10.50, change_percentage: "+5.2%", volume: 80000000 },
          { ticker: "PLTR", price: 24.50, change_amount: 1.20, change_percentage: "+5.1%", volume: 40000000 },
        ],
        top_losers: [],
        most_active: []
      };
      setScans([newScan, ...scans]);
      setSelectedId(newScan.id);
      setIsRunning(false);
    }, 2000);
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
