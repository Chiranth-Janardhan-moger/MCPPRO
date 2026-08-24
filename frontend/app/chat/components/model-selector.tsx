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
  const [openRouterFilter, setOpenRouterFilter] = React.useState<"all" | "free" | "paid">("all")

  const groups = React.useMemo(() => {
    const map = new Map<string, SelectorModel[]>()
    // Ordered providers
    const providerOrder = ["anthropic", "openai", "google", "openrouter", "groq", "xai"]
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

      if (provider === "openrouter" && openRouterFilter !== "all") {
        filtered = filtered.filter((m) =>
          openRouterFilter === "free" ? Boolean(m.freeTier) : !m.freeTier
        )
      }

      if (filtered.length > 0) out.set(provider, filtered)
    }
    return out
  }, [groups, query, openRouterFilter])

  function choose(value: string) {
    onSelect(value)
    setView("providers")
    setActiveProvider(null)
    setQuery("")
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

    if (activeProvider === "openrouter" && openRouterFilter !== "all") {
      filtered = filtered.filter((m) =>
        openRouterFilter === "free" ? Boolean(m.freeTier) : !m.freeTier
      )
    }
    return filtered
  }, [activeProvider, groups, query, openRouterFilter])

  if (view === "providers") {
    return (
      <div className="flex flex-col outline-none">
        <div className="border-b p-2">
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search all models..."
            className="h-8 bg-transparent text-xs"
          />
        </div>
        <div className="max-h-[340px] overflow-y-auto p-1.5 space-y-1">
          {[...filteredGroups.entries()].map(([provider, list]) => {
            const config = PROVIDER_CONFIG[provider]
            const Icon = config?.icon ?? Bot
            const hasFree = list.some((m) => m.freeTier)

            return (
              <button
                key={provider}
                onClick={() => {
                  setActiveProvider(provider)
                  setView("models")
                  setQuery("")
                }}
                className="flex w-full items-center justify-between rounded-lg p-2 text-left text-sm transition-colors hover:bg-accent/70 group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium text-xs truncate">
                      {providerLabel(provider)}
                    </span>
                    <span className="text-[10px] text-muted-foreground truncate">
                      {config?.description ?? `${list.length} models available`}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  {hasFree && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
                      Free Tier
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground font-mono">
                    {list.length}
                  </span>
                </div>
              </button>
            )
          })}
          {filteredGroups.size === 0 && (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">
              No models found matching &quot;{query}&quot;
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col outline-none">
      <div className="flex items-center justify-between border-b p-1.5">
        <div className="flex items-center gap-1 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-md"
            onClick={() => {
              setView("providers")
              setQuery("")
            }}
          >
            <ChevronLeftIcon className="h-3.5 w-3.5" />
          </Button>
          <span className="truncate text-xs font-semibold">
            {activeProvider ? providerLabel(activeProvider) : "Models"}
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground font-mono px-1">
          {activeList.length} models
        </span>
      </div>

      <div className="border-b p-1.5 flex flex-col gap-1.5">
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Filter ${activeProvider ? providerLabel(activeProvider) : ''} models...`}
          className="h-7 text-xs bg-transparent"
        />

        {activeProvider === "openrouter" && (
          <div className="flex items-center gap-1 pt-0.5">
            <span className="text-[10px] text-muted-foreground font-medium mr-1">Filter:</span>
            {(["all", "free", "paid"] as const).map((filterType) => (
              <button
                key={filterType}
                type="button"
                onClick={() => setOpenRouterFilter(filterType)}
                className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors",
                  openRouterFilter === filterType
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {filterType === "all" ? "All" : filterType === "free" ? "Free Only" : "Paid"}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="max-h-[300px] overflow-y-auto p-1 space-y-0.5">
        {activeList.map((m) => (
          <button
            key={m.value}
            onClick={() => choose(m.value)}
            className={cn(
              "flex w-full items-start justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent",
              m.value === selectedModel && "bg-accent/80 font-medium"
            )}
          >
            <div className="flex min-w-0 flex-col items-start">
              <span className="flex items-center gap-1.5 truncate font-medium">
                {m.label}
                {m.freeTier && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                    Free
                  </Badge>
                )}
              </span>
              {!m.freeTier && m.inputPricePerMTok != null && (
                <span className="text-[10px] text-muted-foreground">
                  ${m.inputPricePerMTok}/M in · ${m.outputPricePerMTok ?? "?"}/M out
                </span>
              )}
            </div>
            <CheckIcon
              className={cn(
                "mt-0.5 h-3.5 w-3.5 shrink-0 text-primary",
                selectedModel === m.value ? "opacity-100" : "opacity-0"
              )}
            />
          </button>
        ))}
        {activeList.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">
            No models available under this filter.
          </p>
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
    <span className="truncate max-w-[130px] sm:max-w-[180px]">{current}</span>
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
      className="h-7 w-auto px-2 justify-start gap-1 text-xs text-muted-foreground hover:text-foreground font-medium rounded-lg hover:bg-accent/60"
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
        <PopoverContent align="start" className="w-[320px] p-0 shadow-lg border">
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
