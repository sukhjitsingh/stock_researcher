import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number | React.ReactNode;
  subValue?: string;
  icon?: LucideIcon;
  status?: 'success' | 'warning' | 'danger' | 'neutral';
  className?: string;
  children?: React.ReactNode;
}

export function MetricCard({
  title,
  value,
  subValue,
  icon: Icon,
  status = 'neutral',
  className,
  children
}: MetricCardProps) {

  const statusStyles = {
    success: "border-green-500/30 bg-green-500/5",
    warning: "border-orange-500/30 bg-orange-500/5",
    danger: "border-red-500/30 bg-red-500/5",
    neutral: "border-white/10 bg-white/5",
  };

  const iconStyles = {
    success: "text-green-500",
    warning: "text-orange-500",
    danger: "text-red-500",
    neutral: "text-muted-foreground",
  };

  return (
    <div className={cn(
      "relative p-6 rounded-2xl border backdrop-blur-md transition-all hover:bg-white/10",
      statusStyles[status],
      className
    )}>
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{title}</h3>
        {Icon && <Icon className={cn("h-5 w-5", iconStyles[status])} />}
      </div>

      <div className="space-y-1">
        <div className="text-2xl font-bold text-white tracking-tight">{value}</div>
        {subValue && <div className="text-sm text-muted-foreground">{subValue}</div>}
      </div>

      {children && <div className="mt-4 pt-4 border-t border-white/5">{children}</div>}
    </div>
  );
}
