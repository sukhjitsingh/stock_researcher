const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://stockresearcher.vercel.app";

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export const api = {
  getQuote: (symbol: string) => fetchApi(`/api/quote/${symbol}`),
  getVolatility: (symbol: string) => fetchApi(`/api/volatility/${symbol}`),
  scan: () => fetchApi("/api/scan", { method: "POST" }),
  getScan: (id: number) => fetchApi(`/api/scan/${id}`),
  listScans: () => fetchApi("/api/scans"),
  analyze: (symbol: string) =>
    fetchApi("/api/analyze", {
      method: "POST",
      body: JSON.stringify({ symbol }),
    }),
  generateStrategies: (symbol: string, capital: number) =>
    fetchApi("/api/strategy", {
      method: "POST",
      body: JSON.stringify({ symbol, capital }),
    }),
  listPlans: (params?: { symbol?: string; status?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.symbol) searchParams.set("symbol", params.symbol);
    if (params?.status) searchParams.set("status", params.status);
    const qs = searchParams.toString();
    return fetchApi(`/api/plans${qs ? `?${qs}` : ""}`);
  },
  updatePlanStatus: (planId: number, newStatus: string) =>
    fetchApi(`/api/plans/${planId}/status?new_status=${newStatus}`, {
      method: "PATCH",
    }),
};
