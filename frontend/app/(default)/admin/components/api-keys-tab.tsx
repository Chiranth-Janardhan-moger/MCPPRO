'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Key,
  Eye,
  EyeOff,
  Check,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Globe,
  Lock,
  Cpu,
} from 'lucide-react';
import { SystemSettings } from '@/lib/services/admin-settings';
import { MODEL_CATALOG } from '@/lib/ai/models';

interface ApiKeysTabProps {
  settings: SystemSettings | null;
  onUpdate: (updated: Partial<SystemSettings>) => Promise<boolean>;
}

const PROVIDER_ITEMS = [
  {
    id: 'google',
    label: 'Google Gemini',
    envKey: 'GOOGLE_GENERATIVE_AI_API_KEY / GEMINI_API_KEY',
    placeholder: 'AIzaSy...',
    hint: 'Powers Gemini 3.7 Flash, 3.6 Flash, 3.5 Flash-Lite, 2.5 Pro',
    icon: Sparkles,
  },
  {
    id: 'openai',
    label: 'OpenAI',
    envKey: 'OPENAI_API_KEY',
    placeholder: 'sk-proj-...',
    hint: 'Powers GPT-4o, GPT-4o mini, o3-mini, and o1 models',
    icon: Cpu,
  },
  {
    id: 'anthropic',
    label: 'Anthropic Claude',
    envKey: 'ANTHROPIC_API_KEY',
    placeholder: 'sk-ant-api03-...',
    hint: 'Powers Claude 3.7 Sonnet, 3.5 Sonnet & Haiku',
    icon: Key,
  },
  {
    id: 'groq',
    label: 'Groq Cloud',
    envKey: 'GROQ_API_KEY',
    placeholder: 'gsk_...',
    hint: 'Powers ultra-fast Llama 3.3 70B & Llama 3.1 8B inference',
    icon: Cpu,
  },
  {
    id: 'xai',
    label: 'xAI Grok',
    envKey: 'XAI_API_KEY',
    placeholder: 'xai-...',
    hint: 'Powers Grok 3, Grok 2, and Grok Vision models',
    icon: Key,
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    envKey: 'OPENROUTER_API_KEY',
    placeholder: 'sk-or-v1-...',
    hint: 'Access hundreds of open-weights & frontier models via single key',
    icon: Globe,
  },
  {
    id: 'tavily',
    label: 'Tavily Web Search',
    envKey: 'TAVILY_API_KEY',
    placeholder: 'tvly-...',
    hint: 'Powers live internet search, breaking news, and real-time facts',
    icon: Globe,
  },
  {
    id: 'browserbase_api_key',
    label: 'Browserbase API Key (App Opening & Web Browser Automation)',
    envKey: 'BROWSERBASE_API_KEY',
    placeholder: 'bb_live_...',
    hint: 'Powers cloud browser execution, Stagehand agent, and opening web apps/pages',
    icon: Globe,
  },
  {
    id: 'browserbase_project_id',
    label: 'Browserbase Project ID',
    envKey: 'BROWSERBASE_PROJECT_ID',
    placeholder: 'proj_...',
    hint: 'Project ID associated with your Browserbase cloud browser instance',
    icon: Lock,
  },
  {
    id: 'backend_token',
    label: 'Backend Bearer Token',
    envKey: 'BACKEND_BEARER_TOKEN / BEARER_TOKEN',
    placeholder: 'Bearer token for FastAPI RAG service...',
    hint: 'Secures communication between frontend and backend RAG vector engine',
    icon: Lock,
  },
];

export function ApiKeysTab({ settings, onUpdate }: ApiKeysTabProps) {
  const [formState, setFormState] = useState<Record<string, string>>({
    default_model: settings?.default_model || 'gemini-3.6-flash',
    google: settings?.api_keys?.google || settings?.api_keys?.gemini || '',
    openai: settings?.api_keys?.openai || '',
    anthropic: settings?.api_keys?.anthropic || '',
    groq: settings?.api_keys?.groq || '',
    xai: settings?.api_keys?.xai || '',
    openrouter: settings?.api_keys?.openrouter || '',
    tavily: settings?.api_keys?.tavily || '',
    browserbase_api_key: settings?.api_keys?.browserbase_api_key || '',
    browserbase_project_id: settings?.api_keys?.browserbase_project_id || '',
    backend_token: settings?.api_keys?.backend_token || '',
  });

  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<
    Record<string, { success: boolean; message: string; latencyMs?: number }>
  >({});

  const toggleShow = (id: string) => {
    setShowKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleTestKey = async (provider: string) => {
    const key = formState[provider];
    if (!key || !key.trim()) {
      toast.error(`Please enter an API key for ${provider} first.`);
      return;
    }

    setTestingProvider(provider);
    try {
      const res = await fetch('/api/admin/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, key: key.trim() }),
      });
      const data = await res.json();

      setTestResults((prev) => ({
        ...prev,
        [provider]: {
          success: data.success,
          message: data.message || (data.success ? 'Valid' : 'Failed'),
          latencyMs: data.latencyMs,
        },
      }));

      if (data.success) {
        toast.success(`${provider.toUpperCase()} API key connected successfully (${data.latencyMs ?? 0}ms)!`);
      } else {
        toast.error(`${provider.toUpperCase()} check failed: ${data.message}`);
      }
    } catch (err: any) {
      toast.error(`Connection test failed: ${err.message}`);
    } finally {
      setTestingProvider(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const updatedSettings: Partial<SystemSettings> = {
      default_model: formState.default_model,
      api_keys: {
        openai: formState.openai.trim(),
        anthropic: formState.anthropic.trim(),
        google: formState.google.trim(),
        gemini: formState.google.trim(),
        groq: formState.groq.trim(),
        xai: formState.xai.trim(),
        openrouter: formState.openrouter.trim(),
        tavily: formState.tavily.trim(),
        backend_token: formState.backend_token.trim(),
      },
    };

    const success = await onUpdate(updatedSettings);
    setIsSaving(false);
    if (success) {
      toast.success('System API keys and default model saved successfully!');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Top Banner / Default Model Card */}
      <Card className="bg-card/70 backdrop-blur-sm border-blue-100/70 dark:border-blue-900/40">
        <CardHeader className="p-4 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Cpu className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">System Default Chat Model</CardTitle>
              <CardDescription className="text-xs">
                Select the primary model used for standard user conversations when no model is explicitly chosen.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="max-w-md">
            <Select
              value={formState.default_model}
              onValueChange={(val) => setFormState((prev) => ({ ...prev, default_model: val }))}
            >
              <SelectTrigger className="h-10 text-xs">
                <SelectValue placeholder="Select default model" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {MODEL_CATALOG.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="text-xs">
                    <div className="flex items-center justify-between gap-3 w-full">
                      <span className="font-medium">{m.label}</span>
                      <span className="text-[10px] text-muted-foreground uppercase font-mono">
                        {m.provider}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Functional API Keys Grid */}
      <Card className="bg-card/70 backdrop-blur-sm">
        <CardHeader className="p-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
                <Key className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Functional API Keys</CardTitle>
                <CardDescription className="text-xs">
                  Configure centralized credentials. All standard users can run inference without entering their own keys.
                </CardDescription>
              </div>
            </div>
            <Button
              type="submit"
              disabled={isSaving}
              className="h-8 text-xs bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700 gap-1.5 shadow-sm"
            >
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Save All Settings
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PROVIDER_ITEMS.map((provider) => {
              const val = formState[provider.id] || '';
              const isVisible = showKeys[provider.id];
              const isTesting = testingProvider === provider.id;
              const testResult = testResults[provider.id];
              const Icon = provider.icon;

              return (
                <div
                  key={provider.id}
                  className="p-3.5 rounded-xl border border-border/70 bg-background/50 hover:border-blue-300/60 dark:hover:border-blue-800/60 transition-all space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5 text-blue-500" />
                      {provider.label}
                      {val.trim().length > 0 && (
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1 py-0 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-mono"
                        >
                          Configured
                        </Badge>
                      )}
                    </Label>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {provider.envKey.split(' ')[0]}
                    </span>
                  </div>

                  <div className="relative flex items-center gap-1.5">
                    <div className="relative flex-1">
                      <Input
                        type={isVisible ? 'text' : 'password'}
                        value={val}
                        onChange={(e) =>
                          setFormState((prev) => ({
                            ...prev,
                            [provider.id]: e.target.value,
                          }))
                        }
                        placeholder={provider.placeholder}
                        className="h-8 text-xs font-mono pr-8 bg-background"
                      />
                      <button
                        type="button"
                        onClick={() => toggleShow(provider.id)}
                        className="absolute right-2 top-2 text-muted-foreground hover:text-foreground cursor-pointer"
                        title={isVisible ? 'Hide key' : 'Show key'}
                      >
                        {isVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestKey(provider.id)}
                      disabled={isTesting || !val.trim()}
                      className="h-8 text-[11px] px-2.5 shrink-0"
                    >
                      {isTesting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        'Test'
                      )}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <p className="truncate mr-2">{provider.hint}</p>
                    {testResult && (
                      <span
                        className={`flex items-center gap-1 shrink-0 font-medium ${
                          testResult.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {testResult.success ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <AlertCircle className="h-3 w-3" />
                        )}
                        {testResult.success ? `Connected (${testResult.latencyMs}ms)` : 'Failed'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={isSaving}
              className="h-9 px-6 text-xs bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-500 text-white font-semibold shadow-md shadow-blue-500/20 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  Saving Changes...
                </>
              ) : (
                'Save All Settings'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
