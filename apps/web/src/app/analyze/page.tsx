'use client';

import { MetricCard } from '@/components/analyze/metric-card';
import { RiskGauge } from '@/components/analyze/risk-gauge';
import { SearchBar } from '@/components/analyze/search-bar';
import type { AnalysisResponse } from '@stock-researcher/shared';
import { Activity, AlertTriangle, DollarSign, ShieldCheck, TrendingUp } from 'lucide-react';
import { useState } from 'react';
// Import Button for future use or navigation

export default function AnalyzePage() {
  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (ticker: string) => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      // TODO: Replace with real API call: ApiClient.post('/api/analyze', { symbol: ticker })

      // Mock API Delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock Data Response
      const mockData: AnalysisResponse = {
        analysis_id: 123,
        symbol: ticker,
        current_price: 154.32,
        solvency: {
          operating_cash_flow: 500000000,
          free_cash_flow: 320000000,
          is_solvent: true,
          notes: "Strong cash generation from operations."
        },
        volatility: {
          volatility_20d: 0.24,
          volatility_annualized: 0.38,
          category: 'MEDIUM',
          recommended_strategies: ["Bull Call Spread", "Iron Condor"]
        },
        risk_level: 'MEDIUM',
        direction_bias: 'BULLISH',
        is_safe_play: true,
        analyst_rating: "BUY",
        analyst_target_mean: 180.00,
        upside_potential_pct: 16.6,
        recommendation_summary: "Strong buy candidate due to robust earnings growth and favorable technical setup. Volatility is moderate, allowing for directional option spreads."
      };

      setData(mockData);

    } catch (err) {
      setError("Failed to analyze ticker. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 py-8">
      {/* Search Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-primary to-white">
          Deep Dive Analysis
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          AI-powered research engine checking solvency, volatility, and risk metrics in real-time.
        </p>
        <div className="pt-4">
          <SearchBar onSearch={handleSearch} isLoading={loading} />
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center space-y-4 py-12">
          <div className="h-12 w-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-primary font-mono text-sm animate-pulse">Running Deep Dive Analysis...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-500 text-center">
          {error}
        </div>
      )}

      {/* Results Grid */}
      {data && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Header Stats */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                {data.symbol}
                <span className="text-xl px-2 py-1 rounded bg-white/10 text-muted-foreground font-mono">
                  ${data.current_price.toFixed(2)}
                </span>
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Analysis Generated: {new Date().toLocaleTimeString()}
              </p>
            </div>
            <div className="flex gap-2">
              {data.is_safe_play && (
                <div className="px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 text-xs font-bold flex items-center">
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  SAFE PLAY
                </div>
              )}
              <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center border ${data.direction_bias === 'BULLISH' ? 'bg-green-500/10 border-green-500/20 text-green-500' :
                data.direction_bias === 'BEARISH' ? 'bg-red-500/10 border-red-500/20 text-red-500' :
                  'bg-yellow-500/10 border-yellow-500/20 text-yellow-500'
                }`}>
                {data.direction_bias}
              </div>
            </div>
          </div>

          {/* Main Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

            {/* Solvency Card */}
            <MetricCard
              title="Solvency Check"
              value={data.solvency.is_solvent ? "SOLVENT" : "AT RISK"}
              icon={DollarSign}
              status={data.solvency.is_solvent ? 'success' : 'danger'}
            >
              <p className="text-xs text-muted-foreground leading-relaxed">
                {data.solvency.notes}
                <br />
                OCF: ${(data.solvency.operating_cash_flow || 0).toLocaleString()}
              </p>
            </MetricCard>

            {/* Volatility Card */}
            <MetricCard
              title="Volatility Profile"
              value={`${(data.volatility.volatility_annualized * 100).toFixed(1)}%`}
              subValue="Annualized"
              icon={Activity}
              status={
                data.volatility.category === 'LOW' ? 'success' :
                  data.volatility.category === 'MEDIUM' ? 'warning' : 'danger'
              }
            >
              <p className="text-xs text-muted-foreground mb-2">Category: {data.volatility.category}</p>
              <div className="flex flex-wrap gap-1">
                {data.volatility.recommended_strategies.map(s => (
                  <span key={s} className="px-2 py-0.5 rounded bg-white/5 text-[10px] border border-white/10">{s}</span>
                ))}
              </div>
            </MetricCard>

            {/* Risk Card */}
            <MetricCard
              title="Risk Assessment"
              value={<RiskGauge level={data.risk_level} />}
              icon={AlertTriangle}
              status={
                data.risk_level === 'LOW' ? 'success' :
                  data.risk_level === 'MEDIUM' ? 'warning' : 'danger'
              }
            >
              <p className="text-xs text-muted-foreground mt-2">
                Analyst Rating: <span className="text-white font-bold">{data.analyst_rating}</span><br />
                Target: ${data.analyst_target_mean} ({data.upside_potential_pct}% Upside)
              </p>
            </MetricCard>
          </div>

          {/* Recommendation Summary */}
          <div className="p-6 rounded-2xl border border-primary/20 bg-primary/5 backdrop-blur-md">
            <h3 className="text-sm font-bold text-primary mb-2 flex items-center">
              <TrendingUp className="w-4 h-4 mr-2" />
              AI Recommendation
            </h3>
            <p className="text-sm text-white/90 leading-relaxed font-medium">
              {data.recommendation_summary}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
