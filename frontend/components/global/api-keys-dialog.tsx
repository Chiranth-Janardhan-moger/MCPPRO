"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Key, Eye, EyeOff, Check, Trash2, Settings, ShieldCheck } from "lucide-react"

export interface UserApiKeys {
  openai?: string
  anthropic?: string
  google?: string
  openrouter?: string
  groq?: string
  xai?: string
}

const STORAGE_KEY = "mcppro_custom_api_keys"

export function getUserApiKeys(): UserApiKeys {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function saveUserApiKeys(keys: UserApiKeys) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys))
  } catch (err) {
    console.error("Failed to save API keys", err)
  }
}

const PROVIDERS = [
  {
    id: "anthropic",
    label: "Anthropic Claude",
    envName: "ANTHROPIC_API_KEY",
    placeholder: "sk-ant-api03-...",
    hint: "Required for Claude 3.7 / 3.5 Sonnet & Haiku models",
  },
  {
    id: "openai",
    label: "OpenAI",
    envName: "OPENAI_API_KEY",
    placeholder: "sk-proj-...",
    hint: "Required for GPT-4o, o3-mini, and o1 models",
  },
  {
    id: "google",
    label: "Google Gemini",
    envName: "GOOGLE_GENERATIVE_AI_API_KEY",
    placeholder: "AIzaSy...",
    hint: "Required for Gemini 2.0 Flash & 1.5 Pro models",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    envName: "OPENROUTER_API_KEY",
    placeholder: "sk-or-v1-...",
    hint: "Access hundreds of open & paid models with a single key",
  },
  {
    id: "groq",
    label: "Groq",
    envName: "GROQ_API_KEY",
    placeholder: "gsk_...",
    hint: "Required for ultra-fast Llama & Mixtral inference",
  },
  {
    id: "xai",
    label: "xAI Grok",
    envName: "XAI_API_KEY",
    placeholder: "xai-...",
    hint: "Required for Grok 2 & Grok Vision",
  },
] as const

interface ApiKeysDialogProps {
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ApiKeysDialog({ trigger, open, onOpenChange }: ApiKeysDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internalOpen
  const setIsOpen = isControlled ? onOpenChange : setInternalOpen

  const [keys, setKeys] = React.useState<UserApiKeys>({})
  const [showKeys, setShowKeys] = React.useState<Record<string, boolean>>({})
  const [saved, setSaved] = React.useState(false)

  React.useEffect(() => {
    if (isOpen) {
      setKeys(getUserApiKeys())
      setSaved(false)
    }
  }, [isOpen])

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    saveUserApiKeys(keys)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const handleClearAll = () => {
    setKeys({})
    saveUserApiKeys({})
  }

  const toggleShow = (providerId: string) => {
    setShowKeys((prev) => ({ ...prev, [providerId]: !prev[providerId] }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground">
            <Settings className="h-4 w-4" />
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Key className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold">API Key Settings</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Keys are stored locally in your browser and used for AI requests.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSave} className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {PROVIDERS.map((provider) => {
            const val = keys[provider.id as keyof UserApiKeys] || ""
            const isVisible = showKeys[provider.id]

            return (
              <div key={provider.id} className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    {provider.label}
                    {val.trim().length > 0 && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
                        Saved
                      </Badge>
                    )}
                  </label>
                  <span className="text-[10px] text-muted-foreground font-mono">{provider.envName}</span>
                </div>
                <div className="relative flex items-center">
                  <Input
                    type={isVisible ? "text" : "password"}
                    value={val}
                    onChange={(e) =>
                      setKeys((prev) => ({
                        ...prev,
                        [provider.id]: e.target.value,
                      }))
                    }
                    placeholder={provider.placeholder}
                    className="h-8 text-xs pr-8 font-mono bg-background"
                  />
                  <button
                    type="button"
                    onClick={() => toggleShow(provider.id)}
                    className="absolute right-2 text-muted-foreground hover:text-foreground"
                    title={isVisible ? "Hide API key" : "Show API key"}
                  >
                    {isVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground">{provider.hint}</p>
              </div>
            )
          })}

          <div className="flex items-center justify-between pt-2 border-t mt-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="text-xs text-destructive hover:bg-destructive/10 h-8"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Clear Keys
            </Button>
            <div className="flex items-center gap-2">
              <Button type="submit" size="sm" className="text-xs h-8">
                {saved ? (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1 text-emerald-400" />
                    Saved!
                  </>
                ) : (
                  "Save Keys"
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
