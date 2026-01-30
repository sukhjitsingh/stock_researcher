'use client';

import type { MarketScan, ScanResult } from '@/types/scan';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

// Need to manually create Tabs components or import from ui/tabs. 
// Assuming I will create ui/tabs.tsx or implement raw for now. 
// I'll implement raw structure for Tabs to ensure it works without complex dependencies for this step, 
// matching Shadcn structure so I can swap later easily.

import { cn } from '@/lib/utils';
import { useState } from 'react';

interface ScanViewerProps {
  scan: MarketScan;
}

export function ScanViewer({ scan }: ScanViewerProps) {
  const [activeTab, setActiveTab] = useState<'gainers' | 'losers' | 'active'>('gainers');

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Meta Display */}
      <div className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md">
        <div>
          <h2 className="text-2xl font-bold">{scan.dominant_theme || "Market Scan"}</h2>
          <p className="text-muted-foreground">{scan.ticker_count} Tickers Analyzed</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Scan Date</div>
          <div className="text-lg font-mono text-white">{new Date(scan.date).toLocaleString()}</div>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex space-x-1 rounded-lg bg-black/20 p-1 border border-white/5 w-fit">
        <TabButton
          active={activeTab === 'gainers'}
          onClick={() => setActiveTab('gainers')}
          label="Top Gainers"
          count={scan.top_gainers?.length}
          color="text-green-500"
        />
        <TabButton
          active={activeTab === 'losers'}
          onClick={() => setActiveTab('losers')}
          label="Top Losers"
          count={scan.top_losers?.length}
          color="text-red-500"
        />
        <TabButton
          active={activeTab === 'active'}
          onClick={() => setActiveTab('active')}
          label="Most Active"
          count={scan.most_active?.length}
          color="text-blue-500"
        />
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-md">
        <div className="h-full overflow-y-auto p-4 custom-scrollbar">
          {activeTab === 'gainers' && <ResultTable data={scan.top_gainers} type="gainers" />}
          {activeTab === 'losers' && <ResultTable data={scan.top_losers} type="losers" />}
          {activeTab === 'active' && <ResultTable data={scan.most_active} type="active" />}
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label, count, color }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all",
        active
          ? "bg-white/10 text-white shadow-sm"
          : "text-muted-foreground hover:bg-white/5 hover:text-white"
      )}
    >
      <span>{label}</span>
      <span className={cn("text-xs px-1.5 py-0.5 rounded-full bg-white/5", color)}>
        {count || 0}
      </span>
    </button>
  )
}

function ResultTable({ data, type }: { data: ScanResult[], type: string }) {
  if (!data || data.length === 0) return <div className="p-8 text-center text-muted-foreground">No data available</div>;

  return (
    <table className="w-full text-sm text-left">
      <thead className="text-xs text-muted-foreground uppercase bg-white/5 sticky top-0 backdrop-blur-md">
        <tr>
          <th className="px-4 py-3 rounded-tl-lg">Ticker</th>
          <th className="px-4 py-3">Price</th>
          <th className="px-4 py-3">Change</th>
          <th className="px-4 py-3 text-right rounded-tr-lg">Volume</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white/5">
        {data.map((item, idx) => (
          <tr key={idx} className="hover:bg-white/5 transition-colors">
            <td className="px-4 py-3 font-bold text-white">{item.ticker}</td>
            <td className="px-4 py-3 font-mono text-white/90">${item.price.toFixed(2)}</td>
            <td className="px-4 py-3">
              <span className={cn(
                "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                parseFloat(item.change_percentage) >= 0
                  ? "bg-green-500/10 text-green-400"
                  : "bg-red-500/10 text-red-400"
              )}>
                {parseFloat(item.change_percentage) >= 0
                  ? <ArrowUpRight className="w-3 h-3 mr-1" />
                  : <ArrowDownRight className="w-3 h-3 mr-1" />
                }
                {item.change_percentage}
              </span>
            </td>
            <td className="px-4 py-3 text-right font-mono text-muted-foreground">
              {new Intl.NumberFormat('en-US', { notation: "compact" }).format(item.volume)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
