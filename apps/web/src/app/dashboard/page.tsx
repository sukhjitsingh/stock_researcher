'use client';

import { useEffect, useState } from 'react';
// Correcting import: I strictly need the card components. 
// Since I haven't strictly created ui/card.tsx, I will create basic wrapper cards here or use the raw HTML structure with Tailwind classes matching my design system for speed, 
// then refactor to components later. Actually, better to create ui/card.tsx first. 
// For this step I will create a robust dashboard page that *tries* to import standard UI components.
// Wait, I only created button.tsx. I need card.tsx. 
// I will implement the dashboard assuming standard Shadcn Card components exist (I will create them in the next step or parallel).

import { Button } from '@/components/ui/button';
import { Activity, ArrowDownRight, ArrowUpRight, DollarSign, TrendingUp, Zap } from 'lucide-react';
import Link from 'next/link';

export default function Dashboard() {
  const [marketStatus, setMarketStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching or actually fetch if endpoint exists
    // ApiClient.get('/api/health')... 
    // For now we mock the initial load to verify UI
    setTimeout(() => {
      setMarketStatus({ status: 'OPEN', trend: 'BULLISH', topGainer: 'NVDA +2.4%' });
      setLoading(false);
    }, 1000);
  }, []);

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, Trader. Here is your daily briefing.</p>
        </div>
        <div className="flex gap-4">
          <Link href="/scan">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_-5px_var(--primary)]">
              <Zap className="mr-2 h-4 w-4" /> Run Market Scan
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid used as Bento Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <GlassCard
          title="Total P&L"
          value="$12,450.00"
          trend="+12.5%"
          trendUp
          icon={DollarSign}
        />
        <GlassCard
          title="Active Plays"
          value="4"
          sub="2 Bullish, 2 Neutral"
          icon={Activity}
        />
        <GlassCard
          title="Win Rate"
          value="68%"
          trend="+2.4%"
          trendUp
          icon={TrendingUp}
        />
        <GlassCard
          title="Market Sentiment"
          value="Greed"
          sub="Index: 72"
          icon={Zap}
          highlight
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Main Chart Area */}
        <div className="col-span-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-6">
          <h3 className="text-lg font-semibold mb-4">Portfolio Performance</h3>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground bg-black/20 rounded-lg border border-white/5 border-dashed">
            Chart Visualization Placeholder
          </div>
        </div>

        {/* Recent Activity */}
        <div className="col-span-3 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 text-xs font-bold">
                    NVDA
                  </div>
                  <div>
                    <p className="text-sm font-medium">Long Call Strategy</p>
                    <p className="text-xs text-muted-foreground">2 hours ago</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-green-400">+$450</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Utility Component for consistent Glass Cards
function GlassCard({ title, value, sub, trend, trendUp, icon: Icon, highlight }: any) {
  return (
    <div className={`p-6 rounded-xl border backdrop-blur-md transition-all duration-300 hover:translate-y-[-2px] ${highlight
        ? 'bg-primary/10 border-primary/20 shadow-[0_0_30px_-10px_var(--primary)]'
        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
      }`}>
      <div className="flex items-center justify-between space-y-0 pb-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {Icon && <Icon className={`h-4 w-4 ${highlight ? 'text-primary' : 'text-muted-foreground'}`} />}
      </div>
      <div className="flex items-baseline space-x-2">
        <h2 className="text-2xl font-bold tracking-tight">{value}</h2>
        {trend && (
          <span className={`text-xs font-medium flex items-center ${trendUp ? 'text-green-400' : 'text-red-400'}`}>
            {trendUp ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
            {trend}
          </span>
        )}
      </div>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  )
}
