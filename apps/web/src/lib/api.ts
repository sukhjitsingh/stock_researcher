// Determine appropriate API base URL
const isProduction = process.env.NODE_ENV === 'production';
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || (isProduction ? "https://stockresearcher.vercel.app" : "http://localhost:3000");

export class ApiClient {
  private static async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

    const headers = {
      "Content-Type": "application/json",
      ...options?.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText || response.statusText}`);
    }

    return response.json();
  }

  static get<T>(endpoint: string, params?: Record<string, string | number>) {
    const queryString = params
      ? "?" + new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString()
      : "";
    return this.request<T>(`${endpoint}${queryString}`, { method: "GET" });
  }

  static post<T>(endpoint: string, body: any) {
    return this.request<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  static patch<T>(endpoint: string, body: any) {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  static delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: "DELETE" });
  }
}
