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
} from 'lucide-react';
import { SystemSettings, RouterConfig } from '@/lib/services/admin-settings';

interface ContextRouterTabProps {
  settings: SystemSettings | null;
  onUpdate: (updated: Partial<SystemSettings>) => Promise<boolean>;
}

const CHEAP_ROUTER_MODELS = [
  { provider: 'google', id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite (Google - Ultra Fast & Cost-Effective)' },
  { provider: 'google', id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash (Google - Balanced & Free Tier)' },
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
    model: settings?.routing?.model || 'gemini-3.5-flash-lite',
    api_key: settings?.routing?.api_key || '',
    system_knowledge_description:
      settings?.routing?.system_knowledge_description ||
      'Corporate policies, standard operating procedures, documentation, user manuals, and fixed knowledge base documents.',
  });

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
    });
    setIsSaving(false);
    if (success) {
      toast.success('Context-Aware Router configuration updated!');
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
      <form onSubmit={handleSave} className="space-y-4">
        <Card className="bg-card/70 backdrop-blur-sm border-purple-100/70 dark:border-purple-900/40">
          <CardHeader className="p-4 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">
                    Context-Aware Routing Engine
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Uses a high-efficiency cheaper model to pre-evaluate queries and intelligently route between RAG, Live Web Search, or Direct execution.
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
                  Ultra-low latency model used for &lt;300ms query classification.
                </p>
              </div>

              {/* Dedicated Router API Key (Optional) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                    Dedicated Router API Key (Optional)
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Falls back to system provider key
                  </span>
                </Label>
                <Input
                  type="password"
                  value={routingState.api_key || ''}
                  onChange={(e) =>
                    setRoutingState((prev) => ({ ...prev, api_key: e.target.value }))
                  }
                  placeholder="Leave empty to use main provider key..."
                  className="h-9 text-xs font-mono"
                />
                <p className="text-[10px] text-muted-foreground">
                  Custom key if you wish to isolate router costs from main inference.
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

            <div className="flex justify-end pt-1">
              <Button
                type="submit"
                disabled={isSaving}
                className="h-8 text-xs bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 gap-1.5 shadow-sm"
              >
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Save Router Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Real-time Interactive Testing Sandbox */}
      <Card className="bg-card/70 backdrop-blur-sm border-blue-100/70 dark:border-blue-900/40">
        <CardHeader className="p-4 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600 dark:bg-cyan-950/60 dark:text-cyan-400">
              <Play className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">
                Live Router Classification Playground
              </CardTitle>
              <CardDescription className="text-xs">
                Test how the cheaper model categorizes any user prompt into RAG, Web Search, or Direct LLM in real time.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-medium text-muted-foreground">Try presets:</span>
              {PRESET_QUERIES.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setTestQuery(preset.text)}
                  className="px-2 py-0.5 rounded-md bg-muted hover:bg-muted/80 text-[10px] text-foreground transition-colors border border-border/60"
                >
                  {preset.expected === 'RAG' && '📁 RAG: '}
                  {preset.expected === 'ONLINE' && '🌐 Web: '}
                  {preset.expected === 'DIRECT' && '⚡ Direct: '}
                  {preset.text.slice(0, 32)}...
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Input
                value={testQuery}
                onChange={(e) => setTestQuery(e.target.value)}
                placeholder="Enter sample user query to test router..."
                className="h-10 text-xs flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRunTest();
                }}
              />
              <Button
                onClick={handleRunTest}
                disabled={isEvaluating || !testQuery.trim()}
                className="h-10 px-4 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
              >
                {isEvaluating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Evaluating...
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5" />
                    Test Route Decision
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Result Card */}
          {decisionResult && (
            <div className="p-4 rounded-xl border border-border bg-background/80 space-y-3 animate-in fade-in-50">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">Classification:</span>
                  <Badge
                    className={`text-xs px-2.5 py-1 font-bold ${
                      decisionResult.route === 'RAG'
                        ? 'bg-purple-600 text-white'
                        : decisionResult.route === 'ONLINE'
                        ? 'bg-cyan-600 text-white'
                        : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {decisionResult.route === 'RAG' && <Database className="h-3 w-3 mr-1" />}
                    {decisionResult.route === 'ONLINE' && <Globe className="h-3 w-3 mr-1" />}
                    {decisionResult.route === 'DIRECT' && <Zap className="h-3 w-3 mr-1" />}
                    {decisionResult.route}
                  </Badge>
                  <span className="text-xs font-semibold text-muted-foreground">
                    Confidence: {Math.round((decisionResult.confidence || 0) * 100)}%
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="h-3.5 w-3.5 text-blue-500" />
                    {decisionResult.latencyMs}ms latency
                  </span>
                  <span className="font-mono text-[11px]">
                    via {decisionResult.modelUsed} ({decisionResult.providerUsed})
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-lg bg-muted/40 space-y-1">
                  <span className="font-semibold text-muted-foreground text-[10px]">
                    Router Reasoning:
                  </span>
                  <p className="text-foreground">{decisionResult.reasoning}</p>
                </div>

                <div className="p-2.5 rounded-lg bg-muted/40 space-y-1">
                  <span className="font-semibold text-muted-foreground text-[10px]">
                    Refined Retrieval Query:
                  </span>
                  <p className="font-mono text-[11px] text-blue-600 dark:text-sky-400">
                    "{decisionResult.refinedQuery}"
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
