'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Activity,
  ExternalLink,
  Github,
  BookOpen,
  Server,
  Loader2,
  CheckCircle2,
  XCircle,
  Zap,
  Globe,
  Clock,
  Radio
} from 'lucide-react';
import { ApiClient } from '@/lib/api';

// Determine the same base URL logic as api.ts
const isProduction = process.env.NODE_ENV === 'production';
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || (isProduction ? "https://stockresearcher.vercel.app" : "http://localhost:3000");

interface HealthResponse {
  status: string;
  version?: string;
  runtime?: string;
  timestamp?: string;
}

export default function SettingsPage() {
  const [healthStatus, setHealthStatus] = useState<'loading' | 'connected' | 'disconnected'>('loading');
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanMessage, setScanMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    checkApiHealth();
  }, []);

  async function checkApiHealth() {
    try {
      setHealthStatus('loading');
      const response = await ApiClient.get<HealthResponse>('/api/health');
      setHealthData(response);
      setHealthStatus('connected');
    } catch (error) {
      console.error('Health check failed:', error);
      setHealthStatus('disconnected');
    }
  }

  async function runMarketScan() {
    try {
      setScanLoading(true);
      setScanMessage(null);
      const response = await ApiClient.post<any>('/api/scan', {});
      setScanMessage({
        type: 'success',
        text: `Market scan completed. Scan ID: ${response.scan_id || 'Unknown'}`
      });
    } catch (error) {
      setScanMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to run market scan'
      });
    } finally {
      setScanLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Settings</h1>
        <p className="text-muted-foreground">System status, configuration, and quick links.</p>
      </div>

      {/* API Connection Status */}
      <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">API Connection Status</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={checkApiHealth}
            disabled={healthStatus === 'loading'}
          >
            {healthStatus === 'loading' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Activity className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Connection Status */}
          <div className="p-4 rounded-lg bg-white/5 border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Status</span>
              {healthStatus === 'loading' ? (
                <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
              ) : healthStatus === 'connected' ? (
                <CheckCircle2 className="h-5 w-5 text-green-400" />
              ) : (
                <XCircle className="h-5 w-5 text-red-400" />
              )}
            </div>
            <p className={`text-xl font-semibold ${
              healthStatus === 'connected' ? 'text-green-400' :
              healthStatus === 'disconnected' ? 'text-red-400' :
              'text-blue-400'
            }`}>
              {healthStatus === 'loading' ? 'Checking...' :
               healthStatus === 'connected' ? 'Connected' :
               'Disconnected'}
            </p>
          </div>

          {/* API Base URL */}
          <div className="p-4 rounded-lg bg-white/5 border border-white/5">
            <p className="text-sm text-muted-foreground mb-2">API Base URL</p>
            <p className="text-sm font-mono text-primary break-all">{BASE_URL}</p>
          </div>

          {/* API Version */}
          <div className="p-4 rounded-lg bg-white/5 border border-white/5">
            <p className="text-sm text-muted-foreground mb-2">API Version</p>
            <p className="text-xl font-semibold">
              {healthData?.version || 'N/A'}
            </p>
          </div>

          {/* Runtime */}
          <div className="p-4 rounded-lg bg-white/5 border border-white/5">
            <p className="text-sm text-muted-foreground mb-2">Runtime</p>
            <p className="text-xl font-semibold">
              {healthData?.runtime || 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Environment Info */}
      <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-6">
        <h2 className="text-xl font-semibold mb-6">Environment Configuration</h2>

        <div className="grid gap-4 md:grid-cols-3">
          {/* API Base URL Card */}
          <div className="p-4 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">API Endpoint</p>
                <p className="text-xs text-muted-foreground">REST API</p>
              </div>
            </div>
            <p className="text-xs font-mono text-muted-foreground break-all">{BASE_URL}</p>
          </div>

          {/* MCP Endpoint Card */}
          <div className="p-4 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Radio className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">MCP Server</p>
                <p className="text-xs text-muted-foreground">Claude Protocol</p>
              </div>
            </div>
            <p className="text-xs font-mono text-muted-foreground break-all">{BASE_URL}/mcp</p>
          </div>

          {/* Cron Schedule Card */}
          <div className="p-4 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Cron Schedule</p>
                <p className="text-xs text-muted-foreground">Auto Scan</p>
              </div>
            </div>
            <p className="text-xs font-mono text-muted-foreground">Monday 14:00 UTC</p>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-6">
        <h2 className="text-xl font-semibold mb-6">Quick Links</h2>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* API Health */}
          <a
            href={`${BASE_URL}/api/health`}
            target="_blank"
            rel="noopener noreferrer"
            className="group p-4 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-primary/20 transition-all duration-300 hover:translate-y-[-2px] hover:shadow-[0_0_20px_-5px_var(--primary)]"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                <Activity className="h-5 w-5 text-green-400" />
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <p className="text-sm font-medium mb-1">API Health</p>
            <p className="text-xs text-muted-foreground">Check system status</p>
          </a>

          {/* MCP Server */}
          <a
            href={`${BASE_URL}/mcp/`}
            target="_blank"
            rel="noopener noreferrer"
            className="group p-4 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-primary/20 transition-all duration-300 hover:translate-y-[-2px] hover:shadow-[0_0_20px_-5px_var(--primary)]"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                <Server className="h-5 w-5 text-blue-400" />
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <p className="text-sm font-medium mb-1">MCP Server</p>
            <p className="text-xs text-muted-foreground">Claude MCP endpoint</p>
          </a>

          {/* GitHub */}
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="group p-4 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-primary/20 transition-all duration-300 hover:translate-y-[-2px] hover:shadow-[0_0_20px_-5px_var(--primary)]"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                <Github className="h-5 w-5 text-purple-400" />
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <p className="text-sm font-medium mb-1">GitHub</p>
            <p className="text-xs text-muted-foreground">View source code</p>
          </a>

          {/* Documentation */}
          <a
            href="/docs"
            className="group p-4 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-primary/20 transition-all duration-300 hover:translate-y-[-2px] hover:shadow-[0_0_20px_-5px_var(--primary)]"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                <BookOpen className="h-5 w-5 text-amber-400" />
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <p className="text-sm font-medium mb-1">Documentation</p>
            <p className="text-xs text-muted-foreground">API reference</p>
          </a>
        </div>
      </div>

      {/* Data Management */}
      <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-6">
        <h2 className="text-xl font-semibold mb-6">Data Management</h2>

        <div className="space-y-4">
          {/* Run Market Scan */}
          <div className="p-4 rounded-lg bg-white/5 border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium mb-1">Market Scan</p>
                <p className="text-xs text-muted-foreground">
                  Fetch top gainers, losers, and most active stocks from Alpha Vantage
                </p>
              </div>
              <Button
                onClick={runMarketScan}
                disabled={scanLoading}
                className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_-5px_var(--primary)]"
              >
                {scanLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Run Market Scan
                  </>
                )}
              </Button>
            </div>

            {scanMessage && (
              <div className={`p-3 rounded-lg border text-sm ${
                scanMessage.type === 'success'
                  ? 'bg-green-500/10 border-green-500/20 text-green-400'
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}>
                {scanMessage.text}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
