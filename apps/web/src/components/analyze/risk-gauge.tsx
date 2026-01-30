import { cn } from '@/lib/utils';

interface RiskGaugeProps {
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
}

export function RiskGauge({ level }: RiskGaugeProps) {
  const levels = ['LOW', 'MEDIUM', 'HIGH', 'EXTREME'];
  const currentIndex = levels.indexOf(level);

  const colors = [
    'bg-green-500',   // LOW
    'bg-yellow-500',  // MEDIUM
    'bg-orange-600',  // HIGH
    'bg-red-600'      // EXTREME
  ];

  return (
    <div className="w-full">
      <div className="flex justify-between mb-2">
        <span className="text-sm font-medium text-muted-foreground">Risk Level</span>
        <span className={cn("font-bold",
          level === 'LOW' ? "text-green-500" :
            level === 'MEDIUM' ? "text-yellow-500" :
              level === 'HIGH' ? "text-orange-500" : "text-red-500"
        )}>
          {level}
        </span>
      </div>

      <div className="flex h-2 w-full gap-1 rounded-full overflow-hidden bg-white/5">
        {levels.map((l, idx) => (
          <div
            key={l}
            className={cn(
              "flex-1 transition-all duration-500",
              idx <= currentIndex ? colors[idx] : "bg-transparent opacity-20",
              idx === currentIndex && "shadow-[0_0_10px_0px_currentColor]"
            )}
          />
        ))}
      </div>

      <div className="flex justify-between mt-1 text-[10px] text-muted-foreground font-mono">
        <span>SAFE</span>
        <span>SPECULATIVE</span>
      </div>
    </div>
  );
}
