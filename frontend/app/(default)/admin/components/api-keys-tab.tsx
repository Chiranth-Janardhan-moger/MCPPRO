'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Loader2,
  CheckCircle2,
  AlertCircle,
  Cpu,
} from 'lucide-react';
import { SystemSettings } from '@/lib/services/admin-settings';
import { MODEL_CATALOG } from '@/lib/ai/models';

interface ApiKeysTabProps {
  settings: SystemSettings | null;
  onUpdate: (updated: Partial<SystemSettings>) => Promise<boolean>;
}

const PROVIDER_ITEMS = [
  { id: 'google', label: 'Google Gemini Key (gemini-2.5-flash / gemini-3.7)', placeholder: 'AIzaSy...' },
  { id: 'openai', label: 'OpenAI Key (gpt-4o / o3-mini)', placeholder: 'sk-proj-...' },
  { id: 'anthropic', label: 'Anthropic Key (claude-3.7-sonnet)', placeholder: 'sk-ant-api03-...' },
  { id: 'groq', label: 'Groq Cloud Key (llama-3.3-70b)', placeholder: 'gsk_...' },
  { id: 'xai', label: 'xAI Grok Key (grok-3 / grok-2)', placeholder: 'xai-...' },
  { id: 'openrouter', label: 'OpenRouter Key (Unified Gateway)', placeholder: 'sk-or-v1-...' },
  { id: 'tavily', label: 'Tavily API Key (Web Access)', placeholder: 'tvly-...' },
  { id: 'browserbase_api_key', label: 'Browserbase Key (App Opening)', placeholder: 'bb_live_...' },
  { id: 'browserbase_project_id', label: 'Browserbase Project ID', placeholder: 'proj_...' },
  { id: 'backend_token', label: 'Backend Bearer Token (FastAPI RAG)', placeholder: 'Bearer token...' },
];

export function ApiKeysTab({ settings, onUpdate }: ApiKeysTabProps) {
  const [formState, setFormState] = useState<Record<string, string>>({
    default_model: settings?.default_model || 'gemini-2.5-flash',
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

  // Synchronize state when settings arrive
  React.useEffect(() => {
    if (settings) {
      setFormState({
        default_model: settings.default_model || 'gemini-2.5-flash',
        google: settings.api_keys?.google || settings.api_keys?.gemini || '',
        openai: settings.api_keys?.openai || '',
        anthropic: settings.api_keys?.anthropic || '',
        groq: settings.api_keys?.groq || '',
        xai: settings.api_keys?.xai || '',
        openrouter: settings.api_keys?.openrouter || '',
        tavily: settings.api_keys?.tavily || '',
        browserbase_api_key: settings.api_keys?.browserbase_api_key || '',
        browserbase_project_id: settings.api_keys?.browserbase_project_id || '',
        backend_token: settings.api_keys?.backend_token || '',
      });
    }
  }, [settings]);

  const toggleShow = (id: string) => {
    setShowKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleTestKey = async (providerId: string) => {
    const keyVal = formState[providerId];
    if (!keyVal || !keyVal.trim()) {
      toast.error(`Enter a ${providerId} key before testing.`);
      return;
    }

    setTestingProvider(providerId);
    try {
      const res = await fetch('/api/admin/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: providerId, key: keyVal.trim() }),
      });
      const data = await res.json();
      setTestResults((prev) => ({
        ...prev,
        [providerId]: {
          success: data.success,
          message: data.message,
          latencyMs: data.latencyMs,
        },
      }));
      if (data.success) {
        toast.success(`${providerId} key verified (${data.latencyMs || 0}ms)`);
      } else {
        toast.error(data.message || 'Key invalid');
      }
    } catch (err: any) {
      toast.error(err.message || 'Test failed');
    } finally {
      setTestingProvider(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const success = await onUpdate({
      default_model: formState.default_model,
      api_keys: {
        ...(settings?.api_keys || {}),
        google: formState.google,
        gemini: formState.google,
        openai: formState.openai,
        anthropic: formState.anthropic,
        groq: formState.groq,
        xai: formState.xai,
        openrouter: formState.openrouter,
        tavily: formState.tavily,
        browserbase_api_key: formState.browserbase_api_key,
        browserbase_project_id: formState.browserbase_project_id,
        backend_token: formState.backend_token,
      },
    });

    setIsSaving(false);
    if (success) {
      toast.success('API keys saved successfully!');
    }
  };

  return (
    <form
      onSubmit={handleSave}
      autoComplete="off"
      data-lpignore="true"
      data-1p-ignore="true"
      data-form-type="other"
      className="space-y-4"
    >
      {/* Default Chat Model */}
      <Card className="bg-card border-border/70 shadow-xs">
        <CardHeader className="p-4 pb-2 flex flex-row items-center gap-2 space-y-0">
          <Cpu className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <CardTitle className="text-sm font-semibold">System Default Chat Model</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="max-w-md">
            <Select
              value={formState.default_model}
              onValueChange={(val) => setFormState((p) => ({ ...p, default_model: val }))}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select default model" />
              </SelectTrigger>
              <SelectContent>
                {MODEL_CATALOG.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="text-xs">
                    {m.label} ({m.provider})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Provider API Keys */}
      <Card className="bg-card border-border/70 shadow-xs">
        <CardHeader className="p-4 pb-3 flex flex-row items-center gap-2 space-y-0">
          <Key className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          <CardTitle className="text-sm font-semibold">API Credentials</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {PROVIDER_ITEMS.map((item) => {
              const isShown = showKeys[item.id];
              const isTesting = testingProvider === item.id;
              const result = testResults[item.id];

              return (
                <div key={item.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">{item.label}</Label>
                    {result && (
                      <span className={`text-[10px] flex items-center gap-0.5 ${result.success ? 'text-emerald-600' : 'text-red-500'}`}>
                        {result.success ? <CheckCircle2 className="h-2.5 w-2.5" /> : <AlertCircle className="h-2.5 w-2.5" />}
                        {result.success ? `Valid (${result.latencyMs || 0}ms)` : 'Invalid'}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    <Input
                      name={`apikey_${item.id}_nofill`}
                      type={isShown || item.id === 'browserbase_project_id' ? 'text' : 'password'}
                      autoComplete="new-password"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      spellCheck={false}
                      value={formState[item.id] || ''}
                      onChange={(e) =>
                        setFormState((prev) => ({ ...prev, [item.id]: e.target.value }))
                      }
                      placeholder={item.placeholder}
                      className="h-8 text-xs font-mono"
                    />
                    {item.id !== 'browserbase_project_id' && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => toggleShow(item.id)}
                      >
                        {isShown ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isTesting || !formState[item.id]}
                      onClick={() => handleTestKey(item.id)}
                      className="h-8 px-2.5 text-[11px] shrink-0"
                    >
                      {isTesting ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Test'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-2">
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
                  Save API Keys
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
