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
  Save,
  CheckCircle2,
} from 'lucide-react';
import { SystemSettings, RouterConfig } from '@/lib/services/admin-settings';

interface ContextRouterTabProps {
  settings: SystemSettings | null;
  onUpdate: (updated: Partial<SystemSettings>) => Promise<boolean>;
}

const CHEAP_ROUTER_MODELS = [
  { provider: 'google', id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Recommended - Fast & Accurate)' },
  { provider: 'google', id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash' },
  { provider: 'google', id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  { provider: 'google', id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
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
      toast.success('Context Router and API keys saved successfully!');
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
      {/* Context-Aware Router Form */}
      <form onSubmit={handleSave} className="space-y-4">
        <Card className="bg-card border-border/80 shadow-xs">
          <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between space-y-0 border-b">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <CardTitle className="text-sm font-semibold">Context-Aware Router Configuration</CardTitle>
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

          <CardContent className="p-4 space-y-4">
            {/* Row 1: Model & Google Gemini Key */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Router Model Selection */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
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

              {/* Google Gemini API Key */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                  <Sparkles className="h-3.5 w-3.5" />
                  Context Router Key (Google Gemini AIzaSy...)
                </Label>
                <Input
                  type="password"
                  value={googleKey}
                  onChange={(e) => setGoogleKey(e.target.value)}
                  placeholder="Paste Google Gemini Key (AIzaSy...)"
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            {/* Row 2: Tavily Key & Browserbase Key */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Tavily API Key */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-sky-500" />
                  Tavily API Key (Live Web Search)
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
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Laptop className="h-3.5 w-3.5 text-indigo-500" />
                  Browserbase API Key (App Opening & Cloud Browser)
                </Label>
                <Input
                  type="password"
                  value={browserbaseKey}
                  onChange={(e) => setBrowserbaseKey(e.target.value)}
                  placeholder="bb_live_..."
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            {/* Row 3: Browserbase Project ID & Knowledge Scope */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Browserbase Project ID</Label>
                <Input
                  type="text"
                  value={browserbaseProjectId}
                  onChange={(e) => setBrowserbaseProjectId(e.target.value)}
                  placeholder="proj_..."
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Knowledge Scope Hint (Optional)</Label>
                <Input
                  value={routingState.system_knowledge_description || ''}
                  onChange={(e) =>
                    setRoutingState((prev) => ({
                      ...prev,
                      system_knowledge_description: e.target.value,
                    }))
                  }
                  placeholder="e.g. Employee handbook, internal policies, system documentation..."
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Prominent Save Button */}
            <div className="flex items-center justify-between pt-3 border-t">
              <p className="text-[11px] text-muted-foreground">
                Changes take effect immediately across all chat sessions.
              </p>
              <Button
                type="submit"
                disabled={isSaving}
                className="h-9 px-6 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2 shadow-sm"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save Router Settings</span>
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Real-time Sandbox */}
      <Card className="bg-card border-border/80 shadow-xs">
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
              className="h-9 px-4 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shrink-0 shadow-xs"
            >
              {isEvaluating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Evaluating...</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" />
                  <span>Test</span>
                </>
              )}
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
