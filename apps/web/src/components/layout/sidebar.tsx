'use client';

import { cn } from '@/lib/utils';
import {
  BarChart2,
  FileText,
  LayoutDashboard,
  Microscope,
  ScanLine,
  Settings,
  Wallet
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Market Scan', href: '/scan', icon: ScanLine },
  { name: 'Analysis', href: '/analyze', icon: Microscope },
  { name: 'Strategies', href: '/strategy', icon: BarChart2 },
  { name: 'Trade Plans', href: '/plans', icon: FileText },
  { name: 'Assets', href: '/assets', icon: Wallet },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col border-r border-white/10 bg-black/20 backdrop-blur-xl">
      <div className="flex h-16 items-center border-b border-white/10 px-6">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tighter">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
            Finux
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-3">
        <nav className="flex flex-col gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_-5px_var(--primary)]"
                    : "text-muted-foreground hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon className={cn("h-4 w-4", isActive && "text-primary")} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-white/10">
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-white/5 hover:text-white transition-colors"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </div>
    </div>
  );
}
