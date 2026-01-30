'use client';

import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import { useState } from 'react';

interface SearchBarProps {
  onSearch: (ticker: string) => void;
  isLoading?: boolean;
}

export function SearchBar({ onSearch, isLoading }: SearchBarProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim().toUpperCase());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-2xl mx-auto">
      <div className="relative group">
        <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative flex items-center bg-black/40 backdrop-blur-xl border border-white/10 rounded-full overflow-hidden shadow-2xl transition-all focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20">
          <Search className="ml-4 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Ticker (e.g. NVDA, AAPL)..."
            className="flex-1 bg-transparent border-none px-4 py-4 text-lg font-medium text-white placeholder:text-muted-foreground/50 focus:outline-none focus:ring-0 uppercase tracking-wider"
            disabled={isLoading}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-2 mr-1 text-muted-foreground hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <Button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="m-1 rounded-full px-6 bg-primary text-primary-foreground font-bold hover:bg-primary/90 shadow-[0_0_15px_-3px_var(--primary)]"
          >
            {isLoading ? "Analyzing..." : "Deep Dive"}
          </Button>
        </div>
      </div>
    </form>
  );
}
