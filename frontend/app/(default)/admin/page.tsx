'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  ShieldCheck,
  Activity,
  Key,
  Zap,
  Database,
  Lock,
  Loader2,
  ExternalLink,
  BrainCircuit,
  AlertTriangle,
  RefreshCw,
  Layers,
} from 'lucide-react';
import Link from 'next/link';
import { useIsAdmin } from '@/hooks/use-is-admin';
import { SystemSettings } from '@/lib/services/admin-settings';
import { AnalyticsTab } from './components/analytics-tab';
import { ApiKeysTab } from './components/api-keys-tab';
import { ContextRouterTab } from './components/context-router-tab';
import { GlobalDocumentsTab } from './components/global-documents-tab';
import { AccessControlTab } from './components/access-control-tab';
import { cn } from '@/lib/utils';

const ADMIN_NAV_ITEMS = [
  {
    id: 'analytics',
    label: 'Analytics & Telemetry',
    description: 'System traffic, routes, latency, and query logs',
    icon: Activity,
    color: 'text-blue-500',
    bgActive: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/80',
  },
  {
    id: 'api-keys',
    label: 'API Keys & Models',
    description: 'Central provider credentials & model defaults',
    icon: Key,
    color: 'text-purple-500',
    bgActive: 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/80',
  },
  {
    id: 'router',
    label: 'Context-Aware Router',
    description: 'Cheaper classifier model & testing sandbox',
    icon: Zap,
    color: 'text-cyan-500',
    bgActive: 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800/80',
  },
  {
    id: 'documents',
    label: 'Fixed Knowledge Base',
    description: 'Global system documents indexed for all users',
    icon: Database,
    color: 'text-emerald-500',
    bgActive: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/80',
  },
  {
    id: 'access',
    label: 'Access Control',
    description: 'User upload restrictions & admin permissions',
    icon: Lock,
    color: 'text-amber-500',
    bgActive: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/80',
  },
];

export default function AdminPage() {
  const { isAdmin, isAuthenticated, isLoading: isAuthLoading } = useIsAdmin();
  const [activeTab, setActiveTab] = useState('analytics');

  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [analyticsData, setAnalyticsData] = useState<any | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true);

  const fetchSettings = async () => {
    setIsLoadingSettings(true);
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
      }
    } catch (err: any) {
      console.error('Failed to load settings:', err);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  const fetchAnalytics = async () => {
    setIsLoadingAnalytics(true);
    try {
      const res = await fetch('/api/admin/analytics');
      const data = await res.json();
      if (data.success) {
        setAnalyticsData(data);
      }
    } catch (err: any) {
      console.error('Failed to load analytics:', err);
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchSettings();
      fetchAnalytics();
    }
  }, [isAdmin]);

  const handleUpdateSettings = async (updated: Partial<SystemSettings>): Promise<boolean> => {
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update settings');
      }
      setSettings(data.settings);
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Update failed');
      return false;
    }
  };

  if (isAuthLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <p className="text-sm text-muted-foreground font-medium">Verifying administrator privileges...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 rounded-2xl border border-border/80 bg-card text-center space-y-4 shadow-xl">
        <div className="size-16 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto ring-8 ring-amber-500/10">
          <AlertTriangle className="size-8" />
        </div>
        <h2 className="text-2xl font-bold">Admin Privileges Required</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          The Admin Panel is restricted to authorized administrators. Please sign in with an administrative account or request access from the system administrator.
        </p>
        <div className="pt-4 flex items-center justify-center gap-3">
          <Button asChild variant="outline" className="text-xs">
            <Link href="/">Return Home</Link>
          </Button>
          {!isAuthenticated ? (
            <Button asChild className="text-xs bg-blue-600 hover:bg-blue-700 text-white">
              <Link href="/signin?next=/admin">Sign In as Admin</Link>
            </Button>
          ) : (
            <Button asChild className="text-xs bg-blue-600 hover:bg-blue-700 text-white">
              <Link href="/chat">Open Chat Studio</Link>
            </Button>
          )}
        </div>
      </div>
    );
  }

  const currentNav = ADMIN_NAV_ITEMS.find((item) => item.id === activeTab);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in-50">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-blue-900/10 via-sky-900/10 to-purple-900/10 border border-blue-200/60 dark:border-blue-900/40 backdrop-blur-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">Admin Console</h1>
            <Badge className="bg-blue-600 text-white text-[10px] uppercase font-bold tracking-wider px-2 py-0.5">
              Admin System
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Centralized management for API credentials, fixed knowledge base RAG, context router, and analytics telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchSettings();
              fetchAnalytics();
              toast.success('Admin data refreshed');
            }}
            className="h-8 text-xs gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoadingAnalytics || isLoadingSettings ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button asChild size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1.5">
            <Link href="/chat">
              <BrainCircuit className="h-3.5 w-3.5" />
              Chat Studio
              <ExternalLink className="h-3 w-3 opacity-60" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Side Navigation Bar & Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Side Navigation Bar */}
        <div className="md:col-span-4 lg:col-span-3 space-y-2 sticky top-20">
          <div className="p-3.5 rounded-2xl bg-card/80 border border-border/70 backdrop-blur-md shadow-sm space-y-1.5">
            <div className="px-2 py-1 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Admin Navigation
              </span>
            </div>

            {ADMIN_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    'w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-3 border text-xs cursor-pointer',
                    isActive
                      ? cn(item.bgActive, 'shadow-xs font-semibold')
                      : 'border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                  )}
                >
                  <div
                    className={cn(
                      'p-1.5 rounded-lg shrink-0 mt-0.5',
                      isActive ? 'bg-background shadow-xs' : 'bg-muted'
                    )}
                  >
                    <Icon className={cn('h-4 w-4', item.color)} />
                  </div>
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <p className={cn('text-xs font-semibold leading-tight', isActive ? 'text-foreground' : 'text-foreground/90')}>
                      {item.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground line-clamp-1 leading-normal">
                      {item.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Active Content Area */}
        <div className="md:col-span-8 lg:col-span-9 space-y-4">
          {activeTab === 'analytics' && (
            <div className="animate-in fade-in-50 duration-200">
              <AnalyticsTab
                data={analyticsData}
                isLoading={isLoadingAnalytics}
                onRefresh={fetchAnalytics}
              />
            </div>
          )}

          {activeTab === 'api-keys' && (
            <div className="animate-in fade-in-50 duration-200">
              <ApiKeysTab settings={settings} onUpdate={handleUpdateSettings} />
            </div>
          )}

          {activeTab === 'router' && (
            <div className="animate-in fade-in-50 duration-200">
              <ContextRouterTab settings={settings} onUpdate={handleUpdateSettings} />
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="animate-in fade-in-50 duration-200">
              <GlobalDocumentsTab />
            </div>
          )}

          {activeTab === 'access' && (
            <div className="animate-in fade-in-50 duration-200">
              <AccessControlTab settings={settings} onUpdate={handleUpdateSettings} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
