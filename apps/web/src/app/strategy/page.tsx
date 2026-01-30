'use client';

import { StrategyCard } from '@/components/strategy/strategy-card';
import { Button } from '@/components/ui/button';
import type { StrategyPlan, StrategyResponse } from '@stock-researcher/shared';
import { DollarSign, Search, Sparkles } from 'lucide-react';
import { useState } from 'react';

// Create a simple Input component consistent with our design
function Input({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className="flex h-10 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      {...props}
    />
  )
}

export default function StrategyPage() {
  const [ticker, setTicker] = useState('');
  const [capital, setCapital] = useState('500');
  const [data, setData] = useState<StrategyResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker || !capital) return;

    setLoading(true);
    setData(null);

    try {
      // Mock API Call
      await new Promise(resolve => setTimeout(resolve, 2000));

      const mockStrategies: StrategyPlan[] = [
        {
          strategy_type: 'LONG_CALL',
          risk_tier: 'HIGH',
          win_probability: 0.42,
          max_profit: Infinity,
          max_loss: 150,
          breakeven: 185.50,
          risk_reward_ratio: 3.5,
          profit_target_pct: 100,
          stop_loss_pct: 50,
          time_stop_days: 5,
          rationale: "Aggressive directional play targeting earnings breakout.",
          warnings: ["Theta decay is high", "Binary event risk"],
          legs: [
            { action: 'BUY', option_type: 'CALL', strike: 185, expiration: new Date('2024-05-17'), premium: 1.50, contracts: 1 }
          ]
        },
        {
          strategy_type: 'BULL_CALL_SPREAD',
          risk_tier: 'MEDIUM',
          win_probability: 0.65,
          max_profit: 300,
          max_loss: 200,
          breakeven: 182.00,
          risk_reward_ratio: 1.5,
          profit_target_pct: 50,
          stop_loss_pct: 40,
          time_stop_days: 15,
          rationale: "Balanced vertical spread to reduce cost basis.",
          warnings: [],
          legs: [
            { action: 'BUY', option_type: 'CALL', strike: 180, expiration: new Date('2024-06-21'), premium: 5.00, contracts: 1 },
            { action: 'SELL', option_type: 'CALL', strike: 185, expiration: new Date('2024-06-21'), premium: 3.00, contracts: 1 }
          ]
        },
        {
          strategy_type: 'PUT_CREDIT_SPREAD',
          risk_tier: 'LOW',
          win_probability: 0.82,
          max_profit: 85,
          max_loss: 415,
          breakeven: 174.15,
          risk_reward_ratio: 0.2,
          profit_target_pct: 90,
          stop_loss_pct: 200,
          time_stop_days: 20,
          rationale: "High probability income strategy below support levels.",
          warnings: [],
          legs: [
            { action: 'SELL', option_type: 'PUT', strike: 175, expiration: new Date('2024-06-21'), premium: 2.10, contracts: 1 },
            { action: 'BUY', option_type: 'PUT', strike: 170, expiration: new Date('2024-06-21'), premium: 1.25, contracts: 1 }
          ]
        }
      ];

      setData({
        symbol: ticker.toUpperCase(),
        current_price: 178.40,
        capital: parseFloat(capital),
        strategies: mockStrategies,
        recommendation: "Given the Medium Volatility, the Bull Call Spread offers the best risk-adjusted return.",
        capital_warnings: []
      });

    } catch (error) {
      console.error("Failed to generate strategies");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = (strategy: StrategyPlan) => {
    alert(`Saved ${strategy.strategy_type} for ${data?.symbol} to plans!`);
    // TODO: Implement actual save logic
  };

  return (
    <div className="max-w-7xl mx-auto py-8 space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Options Strategy Generator</h1>
        <p className="text-muted-foreground">AI-optimized trade structures based on volatility and risk tolerance.</p>
      </div>

      {/* Input Section */}
      <div className="max-w-2xl mx-auto p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
        <form onSubmit={handleGenerate} className="flex gap-4 items-end">
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Ticker Symbol</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="e.g. AMD"
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                className="pl-9 bg-black/40 border-white/10 focus-visible:ring-primary uppercase"
              />
            </div>
          </div>
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Capital Allocation ($)</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                placeholder="500"
                value={capital}
                onChange={(e) => setCapital(e.target.value)}
                className="pl-9 bg-black/40 border-white/10 focus-visible:ring-primary"
              />
            </div>
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_-5px_var(--primary)] min-w-[140px]"
          >
            {loading ? "Optimizing..." : (
              <>
                <Sparkles className="mr-2 h-4 w-4" /> Generate
              </>
            )}
          </Button>
        </form>
      </div>

      {/* Results Section */}
      {data && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex items-center justify-between px-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              Strategy Options for <span className="text-primary">{data.symbol}</span>
            </h2>
            <div className="text-sm text-muted-foreground">
              Current Price: <span className="text-white font-mono">${data.current_price}</span>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 text-sm text-center text-primary/90 font-medium">
            💡 AI Recommendation: {data.recommendation}
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {data.strategies.map((strategy, idx) => (
              <StrategyCard
                key={idx}
                strategy={strategy}
                onSave={handleSave}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
