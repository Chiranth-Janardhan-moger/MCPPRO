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
    label: 'Analytics',
    icon: Activity,
    color: 'text-blue-500',
  },
  {
    id: 'router',
    label: 'Context Router',
    icon: Zap,
    color: 'text-cyan-500',
  },
  {
    id: 'api-keys',
    label: 'API Keys & Models',
    icon: Key,
    color: 'text-purple-500',
  },
  {
    id: 'documents',
    label: 'Knowledge Base',
    icon: Database,
    color: 'text-emerald-500',
  },
  {
    id: 'access',
    label: 'Access Control',
    icon: Lock,
    color: 'text-amber-500',
  },
];

export default function AdminPage() {
  const { isAdmin, isAuthenticated, isLoading: isAuthLoading } = useIsAdmin();
  const [activeTab, setActiveTab] = useState('router');

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
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-xs text-muted-foreground font-medium">Verifying admin access...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto my-16 p-6 rounded-2xl border bg-card text-center space-y-3 shadow-md">
        <div className="size-12 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
          <AlertTriangle className="size-6" />
        </div>
        <h2 className="text-xl font-bold">Admin Privileges Required</h2>
        <p className="text-xs text-muted-foreground">
          This panel is restricted to authorized administrators.
        </p>
        <div className="pt-2 flex items-center justify-center gap-2">
          <Button asChild variant="outline" size="sm" className="text-xs">
            <Link href="/">Return Home</Link>
          </Button>
          {!isAuthenticated ? (
            <Button asChild size="sm" className="text-xs bg-blue-600 hover:bg-blue-700 text-white">
              <Link href="/signin?next=/admin">Sign In as Admin</Link>
            </Button>
          ) : (
            <Button asChild size="sm" className="text-xs bg-blue-600 hover:bg-blue-700 text-white">
              <Link href="/chat">Open Chat Studio</Link>
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4 pb-10">
      {/* Compact Top Header */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-card border shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight">Admin Console</h1>
          </div>
          <Badge className="bg-blue-600 text-white text-[10px] uppercase font-bold px-1.5 py-0">
            Admin
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchSettings();
              fetchAnalytics();
              toast.success('Refreshed');
            }}
            className="h-8 text-xs gap-1.5"
          >
            <RefreshCw className={`h-3 w-3 ${isLoadingAnalytics || isLoadingSettings ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button asChild size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1.5">
            <Link href="/chat">
              <BrainCircuit className="h-3 w-3" />
              Chat Studio
              <ExternalLink className="h-3 w-3 opacity-60" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Side Navigation Bar & Content */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
        {/* Left Side Navigation Bar (Clean & Compact) */}
        <div className="md:col-span-3 space-y-1">
          <div className="p-2 rounded-xl bg-card border shadow-xs space-y-1">
            {ADMIN_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2.5 text-xs font-medium cursor-pointer',
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs font-semibold'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className={cn('h-4 w-4', isActive ? 'text-white' : item.color)} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Active Content Area */}
        <div className="md:col-span-9 space-y-4">
          {activeTab === 'router' && (
            <ContextRouterTab settings={settings} onUpdate={handleUpdateSettings} />
          )}

          {activeTab === 'api-keys' && (
            <ApiKeysTab settings={settings} onUpdate={handleUpdateSettings} />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsTab
              data={analyticsData}
              isLoading={isLoadingAnalytics}
              onRefresh={fetchAnalytics}
            />
          )}

          {activeTab === 'documents' && (
            <GlobalDocumentsTab />
          )}

          {activeTab === 'access' && (
            <AccessControlTab settings={settings} onUpdate={handleUpdateSettings} />
          )}
        </div>
      </div>
    </div>
  );
}
