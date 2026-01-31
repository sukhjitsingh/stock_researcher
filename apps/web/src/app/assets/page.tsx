'use client';

import { Button } from '@/components/ui/button';
import { ApiClient } from '@/lib/api';
import { ArrowRight, Loader2, TrendingDown, TrendingUp, X } from 'lucide-react';
import { useState } from 'react';

// Sector watchlists from CLAUDE.md
const WATCHLISTS = {
  tech: {
    semiconductors: ['NVDA', 'TSM', 'AVGO', 'ASML', 'AMD', 'INTC', 'QCOM', 'MU', 'TXN', 'MRVL', 'ARM', 'AMAT', 'LRCX'],
    'ai-cloud': ['MSFT', 'GOOGL', 'AMZN', 'META', 'PLTR', 'SMCI', 'DELL', 'CRM', 'NOW', 'SNOW'],
  },
  mining: {
    gold: ['NEM', 'GOLD', 'AEM', 'FNV', 'WPM', 'KGC', 'AGI'],
    silver: ['AG', 'PAAS', 'HL', 'MAG'],
    lithium: ['ALB', 'SQM', 'LAC', 'LTHM'],
    uranium: ['CCJ', 'NXE', 'DNN', 'UUUU', 'UEC'],
  },
  financials: {
    banks: ['JPM', 'BAC', 'WFC', 'C', 'GS', 'MS', 'USB', 'PNC', 'KEY', 'CFG'],
    fintech: ['PYPL', 'SQ', 'SOFI', 'AFRM', 'UPST', 'NU', 'COIN'],
    insurance: ['BRK.B', 'PGR', 'TRV', 'ALL', 'MET'],
  },
};

type Sector = 'tech' | 'mining' | 'financials';

interface QuoteData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
}

export default function AssetsPage() {
  const [activeSector, setActiveSector] = useState<Sector>('tech');
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleTickerClick = async (ticker: string) => {
    setSelectedTicker(ticker);
    setIsLoading(true);
    setQuoteData(null);

    try {
      const response = await ApiClient.get<any>(`/api/quote/${ticker}`);

      // Map API response to QuoteData
      setQuoteData({
        symbol: response.symbol || ticker,
        price: response.price || response.current_price || 0,
        change: response.change || 0,
        changePercent: response.change_percent || response.changePercent || 0,
        dayHigh: response.day_high || response.dayHigh || 0,
        dayLow: response.day_low || response.dayLow || 0,
        volume: response.volume || 0,
      });
    } catch (error) {
      console.error(`Failed to fetch quote for ${ticker}:`, error);
      setQuoteData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyze = () => {
    if (selectedTicker) {
      window.location.href = `/analyze?symbol=${selectedTicker}`;
    }
  };

  const closeQuote = () => {
    setSelectedTicker(null);
    setQuoteData(null);
  };

  const renderSubGroup = (title: string, tickers: string[]) => (
    <div key={title} className="mb-6">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        {title}
      </h3>
      <div className="flex flex-wrap gap-2">
        {tickers.map((ticker) => (
          <button
            type="button"
            key={ticker}
            onClick={() => handleTickerClick(ticker)}
            className={`px-4 py-2 rounded-lg border transition-all ${
              selectedTicker === ticker
                ? 'border-primary bg-primary/20 text-primary font-bold shadow-[0_0_15px_-3px_var(--primary)]'
                : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
            }`}
          >
            {ticker}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex h-full gap-6">
      {/* Main Content: Sector Tabs & Ticker Grid */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        {/* Sector Tabs */}
        <div className="flex gap-2 p-2 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setActiveSector('tech')}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
              activeSector === 'tech'
                ? 'bg-primary text-primary-foreground shadow-[0_0_20px_-5px_var(--primary)]'
                : 'hover:bg-white/5'
            }`}
          >
            Tech
          </button>
          <button
            type="button"
            onClick={() => setActiveSector('mining')}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
              activeSector === 'mining'
                ? 'bg-primary text-primary-foreground shadow-[0_0_20px_-5px_var(--primary)]'
                : 'hover:bg-white/5'
            }`}
          >
            Mining
          </button>
          <button
            type="button"
            onClick={() => setActiveSector('financials')}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
              activeSector === 'financials'
                ? 'bg-primary text-primary-foreground shadow-[0_0_20px_-5px_var(--primary)]'
                : 'hover:bg-white/5'
            }`}
          >
            Financials
          </button>
        </div>

        {/* Ticker Grid */}
        <div className="flex-1 overflow-y-auto rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-6">
          {activeSector === 'tech' && (
            <>
              {renderSubGroup('Semiconductors', WATCHLISTS.tech.semiconductors)}
              {renderSubGroup('AI/Cloud', WATCHLISTS.tech['ai-cloud'])}
            </>
          )}

          {activeSector === 'mining' && (
            <>
              {renderSubGroup('Gold', WATCHLISTS.mining.gold)}
              {renderSubGroup('Silver', WATCHLISTS.mining.silver)}
              {renderSubGroup('Lithium', WATCHLISTS.mining.lithium)}
              {renderSubGroup('Uranium', WATCHLISTS.mining.uranium)}
            </>
          )}

          {activeSector === 'financials' && (
            <>
              {renderSubGroup('Banks', WATCHLISTS.financials.banks)}
              {renderSubGroup('Fintech', WATCHLISTS.financials.fintech)}
              {renderSubGroup('Insurance', WATCHLISTS.financials.insurance)}
            </>
          )}
        </div>
      </div>

      {/* Right Sidebar: Quote Panel */}
      <div className="w-96 flex-shrink-0">
        {selectedTicker ? (
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">{selectedTicker}</h2>
              <button
                type="button"
                onClick={closeQuote}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Loading quote...</p>
              </div>
            )}

            {/* Quote Data */}
            {!isLoading && quoteData && (
              <>
                {/* Price */}
                <div className="mb-6">
                  <div className="text-4xl font-bold mb-2">
                    ${quoteData.price.toFixed(2)}
                  </div>
                  <div
                    className={`flex items-center gap-2 text-lg font-semibold ${
                      quoteData.change >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {quoteData.change >= 0 ? (
                      <TrendingUp className="h-5 w-5" />
                    ) : (
                      <TrendingDown className="h-5 w-5" />
                    )}
                    <span>
                      {quoteData.change >= 0 ? '+' : ''}
                      {quoteData.change.toFixed(2)} (
                      {quoteData.changePercent >= 0 ? '+' : ''}
                      {quoteData.changePercent.toFixed(2)}%)
                    </span>
                  </div>
                </div>

                {/* Day Range */}
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Day High</span>
                    <span className="font-semibold">${quoteData.dayHigh.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Day Low</span>
                    <span className="font-semibold">${quoteData.dayLow.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Volume</span>
                    <span className="font-semibold">
                      {quoteData.volume.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Analyze Button */}
                <Button
                  onClick={handleAnalyze}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_-5px_var(--primary)] font-bold py-6"
                >
                  Deep Dive Analysis
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </>
            )}

            {/* Error State */}
            {!isLoading && !quoteData && (
              <div className="text-center py-12 text-muted-foreground">
                Failed to load quote data.
                <br />
                Please try again.
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center rounded-xl border border-white/10 bg-white/5 backdrop-blur-md text-muted-foreground text-center p-6">
            Select a ticker to view real-time quote
          </div>
        )}
      </div>
    </div>
  );
}
