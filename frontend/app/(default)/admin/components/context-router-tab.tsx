'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Zap,
  Sparkles,
  Globe,
  Loader2,
  Check,
  Play,
  Cpu,
  Clock,
  Laptop,
  Key,
} from 'lucide-react';
import { SystemSettings, RouterConfig } from '@/lib/services/admin-settings';

interface ContextRouterTabProps {
  settings: SystemSettings | null;
  onUpdate: (updated: Partial<SystemSettings>) => Promise<boolean>;
}

const CHEAP_ROUTER_MODELS = [
  { provider: 'google', id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Recommended)' },
  { provider: 'google', id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  { provider: 'google', id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  { provider: 'google', id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite' },
  { provider: 'groq', id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant (Groq)' },
  { provider: 'openai', id: 'gpt-4o-mini', label: 'GPT-4o mini (OpenAI)' },
  { provider: 'openrouter', id: 'deepseek/deepseek-chat:free', label: 'DeepSeek V3 Free (OpenRouter)' },
];

export function ContextRouterTab({ settings, onUpdate }: ContextRouterTabProps) {
  const [routingState, setRoutingState] = useState<RouterConfig>({
    enabled: settings?.routing?.enabled ?? true,
    provider: settings?.routing?.provider || 'google',
    model: settings?.routing?.model || 'gemini-2.5-flash',
    api_key: settings?.routing?.api_key || '',
    system_knowledge_description: settings?.routing?.system_knowledge_description || '',
  });

  const [googleKey, setGoogleKey] = useState(settings?.api_keys?.google || settings?.api_keys?.gemini || '');
  const [tavilyKey, setTavilyKey] = useState(settings?.api_keys?.tavily || '');
  const [browserbaseKey, setBrowserbaseKey] = useState(settings?.api_keys?.browserbase_api_key || '');
  const [browserbaseProjectId, setBrowserbaseProjectId] = useState(settings?.api_keys?.browserbase_project_id || '');

  const [isSaving, setIsSaving] = useState(false);
  const [testQuery, setTestQuery] = useState('What are the top tech headlines today?');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [decisionResult, setDecisionResult] = useState<any | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const success = await onUpdate({
      routing: routingState,
      api_keys: {
        ...(settings?.api_keys || {}),
        google: googleKey,
        gemini: googleKey,
        tavily: tavilyKey,
        browserbase_api_key: browserbaseKey,
        browserbase_project_id: browserbaseProjectId,
      },
    });
    setIsSaving(false);
    if (success) {
      toast.success('Router & API keys saved');
    }
  };

  const handleRunTest = async () => {
    if (!testQuery.trim()) return;
    setIsEvaluating(true);
    setDecisionResult(null);

    try {
      const res = await fetch('/api/admin/router-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: testQuery.trim() }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Test failed');
      setDecisionResult(data.decision);
      toast.success(`Routed to ${data.decision.route}`);
    } catch (err: any) {
      toast.error(err.message || 'Evaluation error');
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSave} className="space-y-4">
        {/* Main Router Configuration */}
        <Card className="bg-card border-border/70 shadow-xs">
          <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <CardTitle className="text-sm font-semibold">Context-Aware Router</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                {routingState.enabled ? 'Active' : 'Disabled'}
              </span>
              <Switch
                checked={routingState.enabled}
                onCheckedChange={(checked) =>
                  setRoutingState((prev) => ({ ...prev, enabled: checked }))
                }
              />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Router Model Selection */}
              <div className="space-y-1">
                <Label className="text-xs font-medium flex items-center gap-1">
                  <Cpu className="h-3.5 w-3.5 text-blue-500" />
                  Router Model
                </Label>
                <Select
                  value={routingState.model}
                  onValueChange={(val) => {
                    const match = CHEAP_ROUTER_MODELS.find((m) => m.id === val);
                    setRoutingState((prev) => ({
                      ...prev,
                      model: val,
                      provider: (match?.provider as any) || prev.provider,
                    }));
                  }}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {CHEAP_ROUTER_MODELS.map((m) => (
                      <SelectItem key={m.id} value={m.id} className="text-xs">
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Context Router / Google Gemini API Key */}
              <div className="space-y-1">
                <Label className="text-xs font-medium flex items-center gap-1 text-blue-600 dark:text-blue-400">
                  <Sparkles className="h-3.5 w-3.5" />
                  Context Router API Key (Google Gemini)
                </Label>
                <Input
                  type="password"
                  value={googleKey}
                  onChange={(e) => setGoogleKey(e.target.value)}
                  placeholder="AIzaSy... (Google Gemini Key)"
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            {/* Knowledge Base Topic Hint */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Knowledge Base Topics (Optional)</Label>
              <Input
                value={routingState.system_knowledge_description || ''}
                onChange={(e) =>
                  setRoutingState((prev) => ({
                    ...prev,
                    system_knowledge_description: e.target.value,
                  }))
                }
                placeholder="e.g. Employee handbook, technical docs, product specs..."
                className="h-9 text-xs"
              />
            </div>
          </CardContent>
        </Card>

        {/* Integration API Keys */}
        <Card className="bg-card border-border/70 shadow-xs">
          <CardHeader className="p-4 pb-3 flex flex-row items-center gap-2 space-y-0">
            <Key className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <CardTitle className="text-sm font-semibold">Web Search & App Automation Keys</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Tavily Key */}
              <div className="space-y-1">
                <Label className="text-xs font-medium flex items-center gap-1">
                  <Globe className="h-3.5 w-3.5 text-sky-500" />
                  Tavily API Key (Web Access)
                </Label>
                <Input
                  type="password"
                  value={tavilyKey}
                  onChange={(e) => setTavilyKey(e.target.value)}
                  placeholder="tvly-..."
                  className="h-9 text-xs font-mono"
                />
              </div>

              {/* Browserbase API Key */}
              <div className="space-y-1">
                <Label className="text-xs font-medium flex items-center gap-1">
                  <Laptop className="h-3.5 w-3.5 text-indigo-500" />
                  Browserbase API Key (App Opening)
                </Label>
                <Input
                  type="password"
                  value={browserbaseKey}
                  onChange={(e) => setBrowserbaseKey(e.target.value)}
                  placeholder="bb_live_..."
                  className="h-9 text-xs font-mono"
                />
              </div>

              {/* Browserbase Project ID */}
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs font-medium">Browserbase Project ID</Label>
                <Input
                  type="text"
                  value={browserbaseProjectId}
                  onChange={(e) => setBrowserbaseProjectId(e.target.value)}
                  placeholder="proj_..."
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button
                type="submit"
                disabled={isSaving}
                className="h-8 px-4 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium gap-1.5"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Save Settings
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Real-time Sandbox */}
      <Card className="bg-card border-border/70 shadow-xs">
        <CardHeader className="p-4 pb-2 flex flex-row items-center gap-2 space-y-0">
          <Play className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <CardTitle className="text-sm font-semibold">Test Context Router</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-3">
          <div className="flex gap-2">
            <Input
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
              placeholder="Enter a test prompt..."
              className="text-xs h-9"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleRunTest();
                }
              }}
            />
            <Button
              type="button"
              onClick={handleRunTest}
              disabled={isEvaluating}
              className="h-9 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shrink-0"
            >
              {isEvaluating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              Test
            </Button>
          </div>

          {decisionResult && (
            <div className="p-3 rounded-lg border bg-muted/40 flex items-center justify-between text-xs animate-in fade-in-50">
              <div className="flex items-center gap-2">
                <span className="font-medium text-muted-foreground">Route:</span>
                <Badge
                  className={
                    decisionResult.route === 'RAG'
                      ? 'bg-emerald-600 text-white font-bold'
                      : decisionResult.route === 'ONLINE'
                      ? 'bg-sky-600 text-white font-bold'
                      : 'bg-purple-600 text-white font-bold'
                  }
                >
                  {decisionResult.route}
                </Badge>
                <span className="font-semibold">
                  {Math.round((decisionResult.confidence || 0) * 100)}%
                </span>
                <span className="text-muted-foreground truncate max-w-xs">
                  — {decisionResult.reasoning}
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {decisionResult.latencyMs || 0}ms
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
