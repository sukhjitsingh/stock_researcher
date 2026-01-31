'use client';

import { Button } from '@/components/ui/button';
import { Bell, Search, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function Header() {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedValue = searchValue.trim().toUpperCase();
    // Validate ticker format: letters, numbers, and dots only
    if (trimmedValue && /^[A-Za-z0-9.]{1,10}$/.test(trimmedValue)) {
      router.push(`/analyze?symbol=${trimmedValue}`);
      setSearchValue('');
    }
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-white/10 bg-black/20 backdrop-blur-xl px-8">
      <div className="flex flex-1 items-center">
        <form onSubmit={handleSubmit} className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search tickers, news, or reports..."
            maxLength={10}
            aria-label="Search tickers"
            className="h-9 w-full rounded-full border border-white/10 bg-white/5 pl-10 pr-4 text-sm text-white placeholder-muted-foreground focus:border-primary/50 focus:bg-white/10 focus:outline-none focus:ring-0 transition-all"
          />
        </form>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-white">
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
        </Button>

        <div className="h-6 w-px bg-white/10" />

        <Button variant="ghost" className="flex items-center gap-2 pl-2 pr-4 text-sm font-medium hover:bg-white/5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-orange-500 text-black">
            <User className="h-4 w-4" />
          </div>
          <span className="hidden md:inline-block">Trader One</span>
        </Button>
      </div>
    </header>
  );
}
