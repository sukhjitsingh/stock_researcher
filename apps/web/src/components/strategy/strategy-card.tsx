'use client';

// Actually, I should create a proper Card component if I want to use it, but for speed giving the previous pattern, I'll use standard Tailwind divs or the MetricCard style.
// Let's use a custom Glass Panel design similar to MetricCard but specialized.

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { StrategyPlan } from '@stock-researcher/shared';
import { AlertTriangle } from 'lucide-react';

interface StrategyCardProps {
  strategy: StrategyPlan;
  onSave?: (strategy: StrategyPlan) => void;
}

export function StrategyCard({ strategy, onSave }: StrategyCardProps) {
  const isHighRisk = strategy.risk_tier === 'HIGH';
  const isMediumRisk = strategy.risk_tier === 'MEDIUM';

  const riskColor = isHighRisk ? 'text-red-500' : isMediumRisk ? 'text-yellow-500' : 'text-green-500';
  const riskBorder = isHighRisk ? 'border-red-500/30' : isMediumRisk ? 'border-yellow-500/30' : 'border-green-500/30';
  const riskBg = isHighRisk ? 'bg-red-500/5' : isMediumRisk ? 'bg-yellow-500/5' : 'bg-green-500/5';

  return (
    <div className={cn("flex flex-col rounded-xl border backdrop-blur-md overflow-hidden transition-all hover:scale-[1.01]", riskBorder, riskBg)}>
      {/* Header */}
      <div className="p-5 border-b border-white/5 bg-white/5">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="text-lg font-bold text-white">{strategy.strategy_type.replace(/_/g, ' ')}</h3>
            <div className={cn("text-xs font-bold uppercase tracking-wider mt-1", riskColor)}>
              {strategy.risk_tier} RISK
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Win Prob</div>
            <div className="text-xl font-mono text-white font-bold">{(strategy.win_probability * 100).toFixed(0)}%</div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2.5em]">
          {strategy.rationale}
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 divide-x divide-white/5 border-b border-white/5 bg-black/20">
        <div className="p-3 text-center">
          <div className="text-[10px] text-muted-foreground uppercase">Max Profit</div>
          <div className="text-sm font-mono text-green-400 font-bold">
            {strategy.max_profit === Infinity ? 'Unlimited' : `$${strategy.max_profit}`}
          </div>
        </div>
        <div className="p-3 text-center">
          <div className="text-[10px] text-muted-foreground uppercase">Max Loss</div>
          <div className="text-sm font-mono text-red-400 font-bold">
            ${strategy.max_loss}
          </div>
        </div>
        <div className="p-3 text-center">
          <div className="text-[10px] text-muted-foreground uppercase">Breakeven</div>
          <div className="text-sm font-mono text-white font-bold">
            ${strategy.breakeven.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Legs Table */}
      <div className="flex-1 p-0 overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-white/5 text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Action</th>
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2 font-medium">Strike</th>
              <th className="px-4 py-2 font-medium text-right">Expiry</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {strategy.legs.map((leg, idx) => (
              <tr key={idx} className="hover:bg-white/5">
                <td className={cn("px-4 py-2 font-bold", leg.action === 'BUY' ? 'text-green-400' : 'text-red-400')}>
                  {leg.action}
                </td>
                <td className="px-4 py-2">{leg.option_type}</td>
                <td className="px-4 py-2 font-mono">${leg.strike}</td>
                <td className="px-4 py-2 text-right text-muted-foreground">
                  {new Date(leg.expiration).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer Actions */}
      <div className="p-4 bg-white/5 border-t border-white/5 mt-auto">
        {strategy.warnings && strategy.warnings.length > 0 && (
          <div className="mb-3 flex items-start gap-2 p-2 rounded bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-[10px]">
            <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
            <div className="flex-1">
              {strategy.warnings[0]}
            </div>
          </div>
        )}

        <Button
          onClick={() => onSave && onSave(strategy)}
          className="w-full bg-white/10 hover:bg-primary hover:text-primary-foreground text-white transition-colors"
          variant="outline"
        >
          Save to Plan
        </Button>
      </div>
    </div>
  );
}
