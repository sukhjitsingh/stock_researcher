'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Activity, ArrowDownRight, ArrowUpRight, DollarSign, TrendingUp, Zap, Calendar, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { ApiClient } from '@/lib/api';
import type { TradePlanSummary, ScanSummary } from '@stock-researcher/shared';

interface DashboardStats {
  totalPnL: number;
  activePlays: number;
  winRate: number;
  recentScanCount: number;
  latestScanDate: Date | null;
  latestScanTheme: string | null;
  latestScanTickerCount: number;
}

interface TradePlan {
  id: number;
  symbol: string;
  strategy_type: string;
  risk_tier: string;
  status: string;
  realized_pnl: number | null;
  created_at: string;
  max_profit: number | null;
  max_loss: number | null;
}

interface Scan {
  scan_id: number;
  date: string;
  dominant_theme: string | null;
  ticker_count: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalPnL: 0,
    activePlays: 0,
    winRate: 0,
    recentScanCount: 0,
    latestScanDate: null,
    latestScanTheme: null,
    latestScanTickerCount: 0,
  });
  const [recentPlans, setRecentPlans] = useState<TradePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch trade plans and scans in parallel with graceful failure handling
        const results = await Promise.allSettled([
          ApiClient.get<TradePlan[]>('/api/plans'),
          ApiClient.get<Scan[]>('/api/scans', { limit: 10 }),
        ]);

        // Handle plans response
        let plansResponse: TradePlan[] = [];
        if (results[0].status === 'fulfilled') {
          plansResponse = results[0].value;
        } else {
          console.error('Failed to fetch plans:', results[0].reason);
        }

        // Handle scans response
        let scansResponse: Scan[] = [];
        if (results[1].status === 'fulfilled') {
          scansResponse = results[1].value;
        } else {
          console.error('Failed to fetch scans:', results[1].reason);
        }

        // Calculate stats from plans
        const closedPlans = plansResponse.filter((p) => p.status === 'CLOSED');
        const openPlans = plansResponse.filter((p) => p.status === 'OPEN');
        const winningPlans = closedPlans.filter((p) => (p.realized_pnl ?? 0) > 0);

        const totalPnL = closedPlans.reduce((sum, p) => sum + (p.realized_pnl ?? 0), 0);
        const winRate = closedPlans.length > 0
          ? (winningPlans.length / closedPlans.length) * 100
          : 0;

        // Get latest scan info
        const latestScan = scansResponse[0] || null;

        setStats({
          totalPnL,
          activePlays: openPlans.length,
          winRate,
          recentScanCount: scansResponse.length,
          latestScanDate: latestScan ? new Date(latestScan.date) : null,
          latestScanTheme: latestScan?.dominant_theme ?? null,
          latestScanTickerCount: latestScan?.ticker_count ?? 0,
        });

        // Get 5 most recent plans for activity feed
        const sortedPlans = [...plansResponse].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setRecentPlans(sortedPlans.slice(0, 5));

      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <p className="text-red-400">Error loading dashboard: {error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

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

      {/* Stats Grid - Bento Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <GlassCard
          title="Total P&L"
          value={formatCurrency(stats.totalPnL)}
          trend={stats.totalPnL !== 0 ? `${stats.totalPnL > 0 ? '+' : ''}${stats.totalPnL.toFixed(2)}` : undefined}
          trendUp={stats.totalPnL > 0}
          icon={DollarSign}
        />
        <GlassCard
          title="Active Plays"
          value={stats.activePlays.toString()}
          sub={stats.activePlays > 0 ? `${stats.activePlays} position${stats.activePlays !== 1 ? 's' : ''} open` : 'No open positions'}
          icon={Activity}
        />
        <GlassCard
          title="Win Rate"
          value={`${stats.winRate.toFixed(0)}%`}
          sub={stats.winRate > 0 ? 'Based on closed trades' : 'No closed trades yet'}
          icon={TrendingUp}
          highlight={stats.winRate >= 60}
        />
        <GlassCard
          title="Recent Scans"
          value={stats.recentScanCount.toString()}
          sub={stats.latestScanDate ? `Latest: ${formatDate(stats.latestScanDate)}` : 'No scans yet'}
          icon={Calendar}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Latest Scan Summary */}
        <div className="col-span-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-6">
          <h3 className="text-lg font-semibold mb-4">Latest Scan Summary</h3>
          {stats.latestScanTheme ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-white/5 border border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Market Theme</span>
                  <span className="text-xs text-muted-foreground">
                    {stats.latestScanDate && formatDate(stats.latestScanDate)}
                  </span>
                </div>
                <p className="text-xl font-semibold text-primary">{stats.latestScanTheme}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-white/5 border border-white/5">
                  <p className="text-sm text-muted-foreground mb-1">Tickers Scanned</p>
                  <p className="text-2xl font-bold">{stats.latestScanTickerCount}</p>
                </div>
                <div className="p-4 rounded-lg bg-white/5 border border-white/5">
                  <p className="text-sm text-muted-foreground mb-1">Total Scans</p>
                  <p className="text-2xl font-bold">{stats.recentScanCount}</p>
                </div>
              </div>
              <Link href="/scan">
                <Button variant="outline" className="w-full">
                  View All Scans
                </Button>
              </Link>
            </div>
          ) : (
            <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground bg-black/20 rounded-lg border border-white/5 border-dashed">
              <Calendar className="h-12 w-12 mb-4 opacity-50" />
              <p>No market scans available</p>
              <Link href="/scan" className="mt-4">
                <Button>Run Your First Scan</Button>
              </Link>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="col-span-3 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {recentPlans.length > 0 ? (
              recentPlans.map((plan) => (
                <div key={plan.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      plan.status === 'OPEN'
                        ? 'bg-blue-500/20 text-blue-400'
                        : plan.status === 'CLOSED' && (plan.realized_pnl ?? 0) > 0
                        ? 'bg-green-500/20 text-green-400'
                        : plan.status === 'CLOSED' && (plan.realized_pnl ?? 0) < 0
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {plan.symbol.slice(0, 4)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{formatStrategyType(plan.strategy_type)}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{plan.risk_tier}</span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className={`text-xs font-medium ${getStatusColor(plan.status)}`}>
                          {plan.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {plan.status === 'CLOSED' && plan.realized_pnl !== null ? (
                      <span className={`text-sm font-bold ${
                        plan.realized_pnl > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {plan.realized_pnl > 0 ? '+' : ''}{formatCurrency(plan.realized_pnl)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {formatTimeAgo(new Date(plan.created_at))}
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Activity className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No trade plans yet</p>
                <Link href="/strategy" className="mt-4">
                  <Button size="sm">Generate Strategy</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Utility Component for consistent Glass Cards
function GlassCard({
  title,
  value,
  sub,
  trend,
  trendUp,
  icon: Icon,
  highlight
}: {
  title: string;
  value: string;
  sub?: string;
  trend?: string;
  trendUp?: boolean;
  icon: any;
  highlight?: boolean;
}) {
  return (
    <div className={`p-6 rounded-xl border backdrop-blur-md transition-all duration-300 hover:translate-y-[-2px] ${
      highlight
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
  );
}

// Helper functions
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return formatDate(date);
}

function formatStrategyType(type: string): string {
  return type
    .split('_')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'OPEN':
      return 'text-blue-400';
    case 'CLOSED':
      return 'text-gray-400';
    case 'PLANNED':
      return 'text-yellow-400';
    default:
      return 'text-muted-foreground';
  }
}
