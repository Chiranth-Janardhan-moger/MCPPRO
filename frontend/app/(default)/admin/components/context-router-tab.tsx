'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
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
  Database,
  Globe,
  Loader2,
  Check,
  Play,
  HelpCircle,
  Cpu,
  Clock,
  Key,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Laptop,
} from 'lucide-react';
import { SystemSettings, RouterConfig } from '@/lib/services/admin-settings';

interface ContextRouterTabProps {
  settings: SystemSettings | null;
  onUpdate: (updated: Partial<SystemSettings>) => Promise<boolean>;
}

const CHEAP_ROUTER_MODELS = [
  { provider: 'google', id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Google - Recommended for Router: Ultra Fast & Accurate)' },
  { provider: 'google', id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (Google - High Speed & Multimodal)' },
  { provider: 'google', id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (Google - Cost-Effective)' },
  { provider: 'google', id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite (Google - Lightweight)' },
  { provider: 'groq', id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant (Groq - Sub-second LPU)' },
  { provider: 'openai', id: 'gpt-4o-mini', label: 'GPT-4o mini (OpenAI - High accuracy lightweight)' },
  { provider: 'openrouter', id: 'deepseek/deepseek-chat:free', label: 'DeepSeek V3 Free (OpenRouter - 0 Cost)' },
  { provider: 'openrouter', id: 'meta-llama/llama-3.1-8b-instruct:free', label: 'Llama 3.1 8B Free (OpenRouter)' },
];

const PRESET_QUERIES = [
  {
    text: 'What is our corporate policy regarding medical leave in the employee handbook?',
    expected: 'RAG',
  },
  {
    text: 'What are the top tech headlines and stock movements happening today?',
    expected: 'ONLINE',
  },
  {
    text: 'Write a TypeScript generic function to merge two sorted arrays.',
    expected: 'DIRECT',
  },
  {
    text: 'Where are the architectural diagrams located in our system docs?',
    expected: 'RAG',
  },
];

export function ContextRouterTab({ settings, onUpdate }: ContextRouterTabProps) {
  const [routingState, setRoutingState] = useState<RouterConfig>({
    enabled: settings?.routing?.enabled ?? true,
    provider: settings?.routing?.provider || 'google',
    model: settings?.routing?.model || 'gemini-2.5-flash',
    api_key: settings?.routing?.api_key || '',
    system_knowledge_description:
      settings?.routing?.system_knowledge_description ||
      'Corporate policies, standard operating procedures, documentation, user manuals, and fixed knowledge base documents.',
  });

  // Additional keys editable directly from router view
  const [googleKey, setGoogleKey] = useState(settings?.api_keys?.google || settings?.api_keys?.gemini || '');
  const [tavilyKey, setTavilyKey] = useState(settings?.api_keys?.tavily || '');
  const [browserbaseKey, setBrowserbaseKey] = useState(settings?.api_keys?.browserbase_api_key || '');
  const [browserbaseProjectId, setBrowserbaseProjectId] = useState(settings?.api_keys?.browserbase_project_id || '');

  const [isSaving, setIsSaving] = useState(false);

  // Sandbox state
  const [testQuery, setTestQuery] = useState(
    'What is our refund policy according to the terms of service?'
  );
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
      toast.success('Context-Aware Router & API credentials saved successfully!');
    }
  };

  const handleRunTest = async () => {
    if (!testQuery.trim()) {
      toast.error('Please enter a test prompt.');
      return;
    }

    setIsEvaluating(true);
    setDecisionResult(null);

    try {
      const res = await fetch('/api/admin/router-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: testQuery.trim() }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Router test evaluation failed');
      }

      setDecisionResult(data.decision);
      toast.success(`Classified as ${data.decision.route} (${Math.round((data.decision.confidence || 0) * 100)}%)`);
    } catch (err: any) {
      toast.error(err.message || 'Evaluation error');
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Settings Form */}
      <form onSubmit={handleSave} className="space-y-6">
        <Card className="bg-card/70 backdrop-blur-sm border-purple-100/70 dark:border-purple-900/40 shadow-sm">
          <CardHeader className="p-4 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">
                    Context-Aware Routing Engine
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Uses a high-efficiency cheaper model (such as Gemini 2.5 Flash) to pre-evaluate queries and intelligently route between RAG, Live Web Search (Tavily), or Direct LLM execution.
                  </CardDescription>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Label htmlFor="router-toggle" className="text-xs font-semibold">
                  {routingState.enabled ? 'Enabled' : 'Disabled'}
                </Label>
                <Switch
                  id="router-toggle"
                  checked={routingState.enabled}
                  onCheckedChange={(checked) =>
                    setRoutingState((prev) => ({ ...prev, enabled: checked }))
                  }
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Cheaper Router Model Selection */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Cpu className="h-3.5 w-3.5 text-blue-500" />
                  Cheaper Router Model
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
                    <SelectValue placeholder="Select cheaper model" />
                  </SelectTrigger>
                  <SelectContent>
                    {CHEAP_ROUTER_MODELS.map((m) => (
                      <SelectItem key={m.id} value={m.id} className="text-xs">
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  Selected model will classify user queries at 0.0 temperature in &lt;200ms.
                </p>
              </div>

              {/* Dedicated Router API Key (Optional) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                    Dedicated Router Key (Optional)
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Falls back to main Google API key
                  </span>
                </Label>
                <Input
                  type="password"
                  value={routingState.api_key || ''}
                  onChange={(e) =>
                    setRoutingState((prev) => ({ ...prev, api_key: e.target.value }))
                  }
                  placeholder="Leave empty to use main Google key..."
                  className="h-9 text-xs font-mono"
                />
                <p className="text-[10px] text-muted-foreground">
                  Custom key if you wish to isolate router costs from main user inference.
                </p>
              </div>
            </div>

            {/* System Knowledge Base Prompt Hint */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5 text-emerald-500" />
                Knowledge Base Topics / Scope Hint
              </Label>
              <Textarea
                rows={2}
                value={routingState.system_knowledge_description || ''}
                onChange={(e) =>
                  setRoutingState((prev) => ({
                    ...prev,
                    system_knowledge_description: e.target.value,
                  }))
                }
                placeholder="Describe what fixed documents and corporate files are indexed..."
                className="text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                Assists the router in identifying queries that relate to fixed documents in your system knowledge base.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Credentials Vault for Context Aware, Web Access & App Automation */}
        <Card className="bg-card/70 backdrop-blur-sm border-blue-100/70 dark:border-blue-900/40 shadow-sm">
          <CardHeader className="p-4 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                <Key className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">
                  Required Integration Keys
                </CardTitle>
                <CardDescription className="text-xs">
                  Configure the API keys used by Context-Aware Routing (Gemini 2.5 Flash), Web Search (Tavily), and App Automation (Browserbase).
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Google Gemini API Key */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                  Google Gemini API Key (Powers Gemini 2.5 Flash)
                </Label>
                <Input
                  type="password"
                  value={googleKey}
                  onChange={(e) => setGoogleKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="h-9 text-xs font-mono"
                />
                <p className="text-[10px] text-muted-foreground">
                  Used by Context Router when executing Gemini 2.5 Flash query classification.
                </p>
              </div>

              {/* Tavily Web Search API Key */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-sky-500" />
                  Tavily API Key (Powers Live Web Search)
                </Label>
                <Input
                  type="password"
                  value={tavilyKey}
                  onChange={(e) => setTavilyKey(e.target.value)}
                  placeholder="tvly-..."
                  className="h-9 text-xs font-mono"
                />
                <p className="text-[10px] text-muted-foreground">
                  Used when router decides <code className="font-semibold text-blue-500">ONLINE</code> to fetch real-time web results.
                </p>
              </div>

              {/* Browserbase API Key (App Automation) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1.5">
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
                <p className="text-[10px] text-muted-foreground">
                  Enables opening web apps, interacting with live pages, and Stagehand browser execution.
                </p>
              </div>

              {/* Browserbase Project ID */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-purple-500" />
                  Browserbase Project ID
                </Label>
                <Input
                  type="text"
                  value={browserbaseProjectId}
                  onChange={(e) => setBrowserbaseProjectId(e.target.value)}
                  placeholder="proj_..."
                  className="h-9 text-xs font-mono"
                />
                <p className="text-[10px] text-muted-foreground">
                  Project identifier from your Browserbase cloud dashboard.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={isSaving}
                className="h-9 px-5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium gap-1.5 shadow-sm"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Save All Router & API Credentials
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Interactive Router Sandbox */}
      <Card className="bg-card/70 backdrop-blur-sm border-blue-100/70 dark:border-blue-900/40 shadow-sm">
        <CardHeader className="p-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                <Play className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">
                  Real-Time Routing Sandbox
                </CardTitle>
                <CardDescription className="text-xs">
                  Test query intent classification using your configured model ({routingState.model}).
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-4">
          {/* Preset Prompts */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-medium text-muted-foreground">
              Try sample query scenarios:
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_QUERIES.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setTestQuery(p.text)}
                  className="px-2.5 py-1 rounded-full text-[11px] border border-border/80 bg-muted/40 hover:bg-muted text-foreground transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="font-semibold text-primary">[{p.expected}]</span>
                  <span className="truncate max-w-[260px]">{p.text}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Test Prompt</Label>
            <div className="flex gap-2">
              <Input
                value={testQuery}
                onChange={(e) => setTestQuery(e.target.value)}
                placeholder="Enter any user prompt to evaluate route..."
                className="text-xs h-10"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleRunTest();
                  }
                }}
              />
              <Button
                type="button"
                onClick={handleRunTest}
                disabled={isEvaluating}
                className="h-10 px-4 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shrink-0 shadow-sm"
              >
                {isEvaluating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Routing...
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5" />
                    Evaluate Route
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Test Decision Output */}
          {decisionResult && (
            <div className="p-4 rounded-xl border border-border/80 bg-muted/30 space-y-3 animate-in fade-in-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Classified Route:</span>
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
                  <span className="text-xs font-semibold text-foreground">
                    ({Math.round((decisionResult.confidence || 0) * 100)}% confidence)
                  </span>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {decisionResult.latencyMs || 0}ms
                  </span>
                  <span className="flex items-center gap-1 font-mono">
                    <Cpu className="h-3 w-3" />
                    {decisionResult.modelUsed}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    Reasoning
                  </span>
                  <p className="p-2 rounded-lg bg-background border text-foreground leading-relaxed">
                    {decisionResult.reasoning}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    Refined Query for Execution
                  </span>
                  <p className="p-2 rounded-lg bg-background border font-mono text-[11px] text-foreground leading-relaxed">
                    {decisionResult.refinedQuery || decisionResult.refined_query || testQuery}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
