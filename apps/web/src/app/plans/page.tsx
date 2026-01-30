'use client';

import { PlanRow } from '@/components/plans/plan-row';
import { Button } from '@/components/ui/button';

import { ApiClient } from '@/lib/api';
import type { TradePlanSummary } from '@stock-researcher/shared';
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';

// Manual Tab Button helper since ui/tabs typically has specific setup
function FilterTab({ active, onClick, label, count }: any) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${active
        ? 'bg-primary text-primary-foreground shadow-lg'
        : 'bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white'
        }`}
    >
      {label}
      {count > 0 && (
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${active ? 'bg-black/20 text-white' : 'bg-white/10'}`}>
          {count}
        </span>
      )}
    </button>
  )
}

export default function PlansPage() {
  const [filter, setFilter] = useState<'ALL' | 'PLANNED' | 'OPEN' | 'CLOSED'>('ALL');

  const [plans, setPlans] = useState<TradePlanSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch plans on mount
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const data = await ApiClient.get<TradePlanSummary[]>('/api/plans');
        setPlans(data);
      } catch (error) {
        console.error("Failed to fetch plans:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  const handleStatusChange = async (id: number, newStatus: string) => {
    // Optimistic update
    const oldPlans = [...plans];
    setPlans(plans.map(p => p.id === id ? { ...p, status: newStatus } : p));

    try {


      // Actually ApiClient.patch body is 2nd arg.
      // We need to pass query params.
      // ApiClient.patch(`/api/plans/${id}/status?new_status=${newStatus}`, {})
      await ApiClient.patch(`/api/plans/${id}/status?new_status=${newStatus}`, {});
    } catch (error) {
      console.error("Failed to update status:", error);
      // Revert
      setPlans(oldPlans);
    }
  };

  const filteredPlans = filter === 'ALL'
    ? plans
    : plans.filter(p => p.status === filter);

  const counts = {
    ALL: plans.length,
    PLANNED: plans.filter(p => p.status === 'PLANNED').length,
    OPEN: plans.filter(p => p.status === 'OPEN').length,
    CLOSED: plans.filter(p => p.status === 'CLOSED').length,
  };

  return (
    <div className="max-w-5xl mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Trade Plans</h1>
          <p className="text-muted-foreground mt-1">Manage your active strategies and track performance.</p>
        </div>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" /> New Plan
        </Button>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <FilterTab active={filter === 'ALL'} onClick={() => setFilter('ALL')} label="All Plans" count={counts.ALL} />
        <FilterTab active={filter === 'PLANNED'} onClick={() => setFilter('PLANNED')} label="Planned" count={counts.PLANNED} />
        <FilterTab active={filter === 'OPEN'} onClick={() => setFilter('OPEN')} label="Open Trades" count={counts.OPEN} />
        <FilterTab active={filter === 'CLOSED'} onClick={() => setFilter('CLOSED')} label="History" count={counts.CLOSED} />
      </div>

      <div className="space-y-4">
        {filteredPlans.length > 0 ? (
          filteredPlans.map(plan => (
            <PlanRow
              key={plan.id}
              plan={plan}
              onStatusChange={handleStatusChange}
            />
          ))
        ) : (
          <div className="text-center py-12 rounded-xl border border-white/5 bg-white/5 text-muted-foreground">
            No plans found in this category.
          </div>
        )}
      </div>
    </div>
  );
}
