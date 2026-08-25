'use client';

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { useIsAdmin } from '@/hooks/use-is-admin';
import { SystemSettings } from '@/lib/services/admin-settings';
import { AnalyticsTab } from './components/analytics-tab';
import { ApiKeysTab } from './components/api-keys-tab';
import { ContextRouterTab } from './components/context-router-tab';
import { GlobalDocumentsTab } from './components/global-documents-tab';
import { AccessControlTab } from './components/access-control-tab';

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

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in-50">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-blue-900/10 via-sky-900/10 to-purple-900/10 border border-blue-200/60 dark:border-blue-900/40 backdrop-blur-md">
        <div className="space-y-1.5">
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
            Centralized orchestration for functional API keys, fixed knowledge base RAG, context-aware routing, and usage analytics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="h-9 text-xs gap-1.5">
            <Link href="/chat">
              <BrainCircuit className="h-4 w-4 text-blue-500" />
              Chat Studio
              <ExternalLink className="h-3 w-3 opacity-60" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 h-auto p-1 bg-muted/60 backdrop-blur-md rounded-xl border border-border/60">
          <TabsTrigger
            value="analytics"
            className="flex items-center gap-2 py-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg"
          >
            <Activity className="h-3.5 w-3.5 text-blue-500" />
            <span>Analytics</span>
          </TabsTrigger>

          <TabsTrigger
            value="api-keys"
            className="flex items-center gap-2 py-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg"
          >
            <Key className="h-3.5 w-3.5 text-purple-500" />
            <span>API Keys & Models</span>
          </TabsTrigger>

          <TabsTrigger
            value="router"
            className="flex items-center gap-2 py-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg"
          >
            <Zap className="h-3.5 w-3.5 text-cyan-500" />
            <span>Context Router</span>
          </TabsTrigger>

          <TabsTrigger
            value="documents"
            className="flex items-center gap-2 py-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg"
          >
            <Database className="h-3.5 w-3.5 text-emerald-500" />
            <span>Fixed Knowledge Base</span>
          </TabsTrigger>

          <TabsTrigger
            value="access"
            className="flex items-center gap-2 py-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg col-span-2 md:col-span-1"
          >
            <Lock className="h-3.5 w-3.5 text-amber-500" />
            <span>Access Control</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Analytics */}
        <TabsContent value="analytics" className="space-y-4 outline-hidden">
          <AnalyticsTab
            data={analyticsData}
            isLoading={isLoadingAnalytics}
            onRefresh={fetchAnalytics}
          />
        </TabsContent>

        {/* Tab 2: API Keys & Defaults */}
        <TabsContent value="api-keys" className="space-y-4 outline-hidden">
          <ApiKeysTab settings={settings} onUpdate={handleUpdateSettings} />
        </TabsContent>

        {/* Tab 3: Context-Aware Router */}
        <TabsContent value="router" className="space-y-4 outline-hidden">
          <ContextRouterTab settings={settings} onUpdate={handleUpdateSettings} />
        </TabsContent>

        {/* Tab 4: Fixed Global Documents */}
        <TabsContent value="documents" className="space-y-4 outline-hidden">
          <GlobalDocumentsTab />
        </TabsContent>

        {/* Tab 5: Access Control & Permissions */}
        <TabsContent value="access" className="space-y-4 outline-hidden">
          <AccessControlTab settings={settings} onUpdate={handleUpdateSettings} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
