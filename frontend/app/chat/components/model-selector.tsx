"use client"

import * as React from "react"
import { CaretSortIcon, CheckIcon, ChevronLeftIcon } from "@radix-ui/react-icons"
import { Loader2, Sparkles, Zap, Bot, BrainCircuit, Globe, Cpu } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer"
import { useIsMobile } from "@/hooks/use-mobile"

export interface SelectorModel {
  value: string
  label: string
  provider?: string
  freeTier?: boolean
  inputPricePerMTok?: number
  outputPricePerMTok?: number
}

interface ModelSelectorProps {
  models: SelectorModel[]
  selectedModel: string
  setSelectedModel: (model: string) => void
}

const PROVIDER_CONFIG: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; description: string }
> = {
  anthropic: {
    label: "Anthropic Claude",
    icon: BrainCircuit,
    description: "Claude 3.7 Sonnet, 3.5 Sonnet, Haiku, Opus",
  },
  openai: {
    label: "OpenAI",
    icon: Bot,
    description: "GPT-4o, GPT-4o mini, o3-mini, o1",
  },
  google: {
    label: "Google Gemini",
    icon: Sparkles,
    description: "Gemini 2.0 Flash, 1.5 Pro, Flash Thinking",
  },
  openrouter: {
    label: "OpenRouter",
    icon: Globe,
    description: "DeepSeek, Llama 3.3, Free & Open Weights",
  },
  groq: {
    label: "Groq",
    icon: Zap,
    description: "LPU Ultra-fast Llama & Mixtral",
  },
  xai: {
    label: "xAI Grok",
    icon: Cpu,
    description: "Grok 2 & Grok Vision",
  },
}

function providerLabel(provider: string): string {
  return (
    PROVIDER_CONFIG[provider]?.label ??
    provider
      .split(/[-_/]/)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(" ")
  )
}

function prepareModels(models: SelectorModel[]): SelectorModel[] {
  const seen = new Set<string>()
  const cleaned: SelectorModel[] = []
  for (const m of models) {
    if (seen.has(m.value)) continue
    seen.add(m.value)
    cleaned.push(m)
  }
  return cleaned
}

interface PickerBodyProps {
  models: SelectorModel[]
  selectedModel: string
  onSelect: (value: string) => void
}

function PickerBody({ models, selectedModel, onSelect }: PickerBodyProps) {
  const all = React.useMemo(() => prepareModels(models), [models])
  const [view, setView] = React.useState<"providers" | "models">("providers")
  const [activeProvider, setActiveProvider] = React.useState<string | null>(null)
  const [query, setQuery] = React.useState("")
  const [modelFilter, setModelFilter] = React.useState<"all" | "free" | "paid">("all")

  const groups = React.useMemo(() => {
    const map = new Map<string, SelectorModel[]>()
    // Ordered providers: Anthropic, OpenAI, Google, xAI Grok, Groq, OpenRouter
    const providerOrder = ["anthropic", "openai", "google", "xai", "groq", "openrouter"]
    for (const p of providerOrder) {
      map.set(p, [])
    }
    for (const m of all) {
      const key = m.provider || "other"
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(m)
    }
    return map
  }, [all])

  const filteredGroups = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    const out = new Map<string, SelectorModel[]>()
    for (const [provider, list] of groups) {
      let filtered = q
        ? list.filter(
            (m) =>
              m.label.toLowerCase().includes(q) ||
              m.value.toLowerCase().includes(q)
          )
        : list

      if (filtered.length > 0) out.set(provider, filtered)
    }
    return out
  }, [groups, query])

  function choose(value: string) {
    onSelect(value)
    setView("providers")
    setActiveProvider(null)
    setQuery("")
    setModelFilter("all")
  }

  const activeList = React.useMemo(() => {
    if (!activeProvider) return []
    const list = groups.get(activeProvider) ?? []
    const q = query.trim().toLowerCase()
    let filtered = q
      ? list.filter(
          (m) =>
            m.label.toLowerCase().includes(q) ||
            m.value.toLowerCase().includes(q)
        )
      : list

    if (modelFilter === "free") {
      filtered = filtered.filter((m) => Boolean(m.freeTier))
    } else if (modelFilter === "paid") {
      filtered = filtered.filter((m) => !m.freeTier)
    }
    return filtered
  }, [activeProvider, groups, query, modelFilter])

  if (view === "providers") {
    return (
      <div className="flex flex-col outline-none">
        <div className="border-b p-2">
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search all frontier & open models..."
            className="h-8 bg-transparent text-xs"
          />
        </div>
        <div className="max-h-[360px] overflow-y-auto p-1.5 space-y-1">
          {[...filteredGroups.entries()].map(([provider, list]) => {
            const config = PROVIDER_CONFIG[provider]
            const Icon = config?.icon ?? Bot
            const hasFree = list.some((m) => m.freeTier)
            const count = list.length

            return (
              <button
                key={provider}
                onClick={() => {
                  setActiveProvider(provider)
                  setView("models")
                  setQuery("")
                  setModelFilter("all")
                }}
                className="flex w-full items-center justify-between rounded-xl p-2.5 text-left text-sm transition-all hover:bg-accent/80 hover:border-blue-200 dark:hover:border-blue-900 group cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-sm">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-xs text-foreground truncate">
                      {providerLabel(provider)}
                    </span>
                    <span className="text-[11px] text-muted-foreground truncate">
                      {config?.description ?? `${count} models available`}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {hasFree && (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-medium">
                      Free Tier
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground font-mono bg-muted/60 px-1.5 py-0.5 rounded-md">
                    {count}
                  </span>
                </div>
              </button>
            )
          })}
          {filteredGroups.size === 0 && (
            <p className="px-2 py-8 text-center text-xs text-muted-foreground">
              No models found matching &quot;{query}&quot;
            </p>
          )}
        </div>
      </div>
    )
  }

  const hasFreeInActive = (groups.get(activeProvider ?? "") ?? []).some((m) => m.freeTier)

  return (
    <div className="flex flex-col outline-none">
      <div className="flex items-center justify-between border-b p-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-md hover:bg-accent cursor-pointer"
            onClick={() => {
              setView("providers")
              setQuery("")
              setModelFilter("all")
            }}
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
          <span className="truncate text-xs font-bold text-foreground">
            {activeProvider ? providerLabel(activeProvider) : "Models"}
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground font-mono bg-muted/60 px-1.5 py-0.5 rounded-md">
          {activeList.length} models
        </span>
      </div>

      <div className="border-b p-2 flex flex-col gap-1.5">
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${activeProvider ? providerLabel(activeProvider) : ''} models...`}
          className="h-7 text-xs bg-transparent"
        />

        {/* Free / Paid Model Filter */}
        <div className="flex items-center gap-1.5 pt-0.5">
          <span className="text-[10px] text-muted-foreground font-medium mr-0.5">Models:</span>
          {(["all", "free", "paid"] as const).map((filterType) => {
            const isActive = modelFilter === filterType
            return (
              <button
                key={filterType}
                type="button"
                onClick={() => setModelFilter(filterType)}
                className={cn(
                  "text-[10px] px-2.5 py-0.5 rounded-full font-medium transition-all cursor-pointer",
                  isActive
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                )}
              >
                {filterType === "all" ? "All" : filterType === "free" ? "Free Tier" : "Paid"}
              </button>
            )
          })}
        </div>
      </div>

      <div className="max-h-[320px] overflow-y-auto p-1.5 space-y-1">
        {activeList.map((m) => (
          <button
            key={m.value}
            onClick={() => choose(m.value)}
            className={cn(
              "flex w-full items-start justify-between gap-2 rounded-xl p-2 text-left text-xs transition-all hover:bg-accent/80 cursor-pointer",
              m.value === selectedModel && "bg-blue-50/80 border border-blue-200 text-blue-950 font-medium"
            )}
          >
            <div className="flex min-w-0 flex-col items-start gap-0.5">
              <span className="flex items-center gap-1.5 truncate font-semibold text-foreground">
                {m.label}
                {m.freeTier && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0 text-emerald-600 border-emerald-500/40 font-medium">
                    Free
                  </Badge>
                )}
              </span>
              {!m.freeTier && m.inputPricePerMTok != null ? (
                <span className="text-[10px] text-muted-foreground">
                  ${m.inputPricePerMTok}/M in · ${m.outputPricePerMTok ?? "?"}/M out
                </span>
              ) : m.freeTier ? (
                <span className="text-[10px] text-emerald-600/80 font-medium">
                  Free tier available
                </span>
              ) : null}
            </div>
            <CheckIcon
              className={cn(
                "mt-0.5 h-4 w-4 shrink-0 text-blue-600",
                selectedModel === m.value ? "opacity-100" : "opacity-0"
              )}
            />
          </button>
        ))}
        {activeList.length === 0 && (
          <div className="text-center py-8 px-3">
            <p className="text-xs text-muted-foreground font-medium">
              No models available under &quot;{modelFilter}&quot; filter.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function TriggerLabel({
  models,
  selectedModel,
}: {
  models: SelectorModel[]
  selectedModel: string
}) {
  const current =
    models.find((m) => m.value === selectedModel)?.label ?? "Select model"
  return (
    <span className="truncate max-w-[140px] sm:max-w-[200px]">{current}</span>
  )
}

export function ModelSelector({ models, selectedModel, setSelectedModel }: ModelSelectorProps) {
  const [open, setOpen] = React.useState(false)
  const isMobile = useIsMobile()
  const current = models.find((m) => m.value === selectedModel)

  const trigger = (
    <Button
      variant="ghost"
      role="combobox"
      aria-expanded={open}
      className="h-7 w-auto px-2 justify-start gap-1 text-xs text-muted-foreground hover:text-foreground font-medium rounded-lg hover:bg-accent/60 cursor-pointer"
    >
      <TriggerLabel models={models} selectedModel={selectedModel} />
      {current === undefined && models.length === 0 ? (
        <Loader2 className="h-3 w-3 shrink-0 animate-spin opacity-50" />
      ) : (
        <CaretSortIcon className="h-3.5 w-3.5 shrink-0 opacity-60" />
      )}
    </Button>
  )

  const bodyProps = { models, selectedModel, onSelect: setSelectedModel }

  if (!isMobile) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent align="start" className="w-[340px] sm:w-[370px] p-0 shadow-xl border rounded-2xl overflow-hidden">
          <PickerBody {...bodyProps} />
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent>
        <div className="mt-4 border-t pb-4 px-2">
          <PickerBody {...bodyProps} />
        </div>
      </DrawerContent>
    </Drawer>
  )
}
