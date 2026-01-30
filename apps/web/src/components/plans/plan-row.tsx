'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TradePlanSummary } from '@stock-researcher/shared';
import { Calendar, MoreHorizontal, Target } from 'lucide-react';

interface PlanRowProps {
  plan: TradePlanSummary;
  onStatusChange?: (id: number, status: string) => void;
}

export function PlanRow({ plan, onStatusChange }: PlanRowProps) {
  return (
    <div className="group grid grid-cols-12 gap-4 items-center p-4 rounded-xl border border-white/5 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all">
      {/* 1. Info Section - Spans 5 columns */}
      <div className="col-span-12 md:col-span-5 flex items-center gap-4">
        <div className="h-10 w-10 shrink-0 rounded-full bg-white/5 flex items-center justify-center font-bold text-white border border-white/10 text-xs text-center">
          {plan.symbol}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium text-white truncate">{plan.strategy_type.replace(/_/g, ' ')}</h4>
            <div className={cn("text-[10px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0",
              plan.risk_tier === 'HIGH' ? "bg-red-500/20 text-red-500" :
                plan.risk_tier === 'MEDIUM' ? "bg-yellow-500/20 text-yellow-500" :
                  "bg-green-500/20 text-green-500"
            )}>
              {plan.risk_tier}
            </div>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center shrink-0"><Calendar className="h-3 w-3 mr-1" /> {plan.expiration ? new Date(plan.expiration).toLocaleDateString() : 'N/A'}</span>
            {plan.strike && <span className="flex items-center shrink-0"><Target className="h-3 w-3 mr-1" /> Strike ${plan.strike}</span>}
          </div>
        </div>
      </div>

      {/* 2. Metrics Section - Spans 4 columns */}
      <div className="col-span-6 md:col-span-4 flex items-center justify-start md:justify-center gap-8 pl-14 md:pl-0">
        <div className="text-left md:text-center w-[80px]">
          <div className="text-[10px] text-muted-foreground uppercase">Max Profit</div>
          <div className="text-sm font-mono text-green-400 font-bold">
            ${plan.max_profit || '---'}
          </div>
        </div>
        <div className="text-left md:text-center w-[80px]">
          <div className="text-[10px] text-muted-foreground uppercase">Win Prob</div>
          <div className="text-sm font-mono text-white font-bold">
            {plan.win_probability ? `${(plan.win_probability * 100).toFixed(0)}%` : '---'}
          </div>
        </div>
      </div>

      {/* 3. Status Badge - Spans 2 columns - ISOLATED FOR ALIGNMENT */}
      <div className="col-span-3 md:col-span-2 flex items-center justify-center">
        <div className={cn("px-2 py-1 rounded text-xs font-bold border uppercase tracking-wider shrink-0 w-[80px] text-center",
          plan.status === 'OPEN' ? "bg-blue-500/10 border-blue-500/20 text-blue-400" :
            plan.status === 'CLOSED' ? "bg-white/5 border-white/10 text-muted-foreground" :
              "bg-purple-500/10 border-purple-500/20 text-purple-400"
        )}>
          {plan.status}
        </div>
      </div>

      {/* 4. Action Buttons - Spans 1 column */}
      <div className="col-span-3 md:col-span-1 flex items-center justify-end gap-2 relative">
        <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity absolute md:static right-10 md:right-auto z-10">
          {plan.status === 'PLANNED' && (
            <Button size="sm" variant="outline" className="h-8 text-xs border-green-500/50 hover:bg-green-500/10 hover:text-green-500 transition-colors whitespace-nowrap bg-black/50 backdrop-blur-sm md:bg-transparent" onClick={() => onStatusChange?.(plan.id, 'OPEN')}>
              Open
            </Button>
          )}
          {plan.status === 'OPEN' && (
            <Button size="sm" variant="outline" className="h-8 text-xs border-white/10 hover:bg-white/10 transition-colors whitespace-nowrap bg-black/50 backdrop-blur-sm md:bg-transparent" onClick={() => onStatusChange?.(plan.id, 'CLOSED')}>
              Close
            </Button>
          )}
        </div>

        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-white shrink-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
