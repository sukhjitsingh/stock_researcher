export interface ScanResult {
  ticker: string;
  price: number;
  change_amount: number;
  change_percentage: string;
  volume: number;
}

export interface MarketScan {
  id: number;
  date: string;
  scan_type: string;
  dominant_theme: string;
  top_gainers: ScanResult[];
  top_losers: ScanResult[];
  most_active: ScanResult[];
  ticker_count: number;
  notes?: string;
}
