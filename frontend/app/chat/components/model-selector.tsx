"use client"

import * as React from "react"
import { CaretSortIcon, CheckIcon, ChevronLeftIcon } from "@radix-ui/react-icons"
import { Loader2 } from "lucide-react"

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

const PROVIDER_LABELS: Record<string, string> = {
  google: "Google Gemini",
  openai: "OpenAI",
  anthropic: "Anthropic Claude",
  groq: "Groq",
  xai: "xAI Grok",
  openrouter: "OpenRouter",
}

/** Non-chat model families that should never appear in a chat model picker. */
const NON_CHAT_PATTERN =
  /(tts|embedding|rerank|lyria|veo|imagen|nano.?banana|robotics|computer.?use|native.?audio|live|aqa|deep.?research|antigravity|clip|image-gen|whisper|guard)/i

function providerLabel(provider: string): string {
  return (
    PROVIDER_LABELS[provider] ??
    provider
      .split(/[-_/]/)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(" ")
  )
}

/** Clean the incoming list: drop non-chat families and dedupe ids. */
function prepareModels(models: SelectorModel[]): SelectorModel[] {
  const seen = new Set<string>()
  const cleaned: SelectorModel[] = []
  for (const m of models) {
    if (seen.has(m.value)) continue
    if (NON_CHAT_PATTERN.test(m.value) || NON_CHAT_PATTERN.test(m.label)) continue
    seen.add(m.value)
    cleaned.push(m)
  }
  return cleaned.sort((a, b) => a.label.localeCompare(b.label))
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

  const groups = React.useMemo(() => {
    const map = new Map<string, SelectorModel[]>()
    for (const m of all) {
      const key = m.provider || "other"
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(m)
    }
    return map
  }, [all])

  const defaultModel = all.find((m) => m.value === "gemini-3.6-flash")

  const filteredGroups = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    const out = new Map<string, SelectorModel[]>()
    for (const [provider, list] of groups) {
      const filtered = q
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
  }

  const activeList = activeProvider ? filteredGroups.get(activeProvider) ?? [] : []

  if (view === "providers") {
    return (
      <div className="flex flex-col outline-none">
        <div className="border-b p-2">
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search models..."
            className="h-8 bg-transparent"
          />
        </div>
        <div className="max-h-[320px] overflow-y-auto p-1">
          {defaultModel && !query && (
            <button
              onClick={() => choose(defaultModel.value)}
              className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent"
            >
              <span className="flex items-center gap-2 font-medium">
                {defaultModel.label}
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  Default
                </Badge>
              </span>
              {selectedModel === defaultModel.value && (
                <CheckIcon className="h-4 w-4" />
              )}
            </button>
          )}
          {[...filteredGroups.entries()].map(([provider, list]) => (
            <button
              key={provider}
              onClick={() => {
                setActiveProvider(provider)
                setView("models")
                setQuery("")
              }}
              className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent"
            >
              <span>{providerLabel(provider)}</span>
              <span className="text-xs text-muted-foreground">
                {list.length}
                {(list.some((m) => m.freeTier)) && (
                  <Badge variant="outline" className="ml-2 text-[10px] px-1 py-0">
                    free tier
                  </Badge>
                )}
              </span>
            </button>
          ))}
          {filteredGroups.size === 0 && (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              No models found.
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col outline-none">
      <div className="flex items-center gap-1 border-b p-1.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => {
            setView("providers")
            setQuery("")
          }}
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </Button>
        <span className="truncate text-sm font-medium">
          {activeProvider ? providerLabel(activeProvider) : ""}
        </span>
      </div>
      <div className="max-h-[320px] overflow-y-auto p-1">
        {activeList.map((m) => (
          <button
            key={m.value}
            onClick={() => choose(m.value)}
            className={cn(
              "flex w-full items-start justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent",
              m.value === selectedModel && "bg-accent/60"
            )}
          >
            <span className="flex min-w-0 flex-col items-start">
              <span className="flex items-center gap-2 truncate font-medium">
                {m.label}
                {m.value === "gemini-3.6-flash" && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    Default
                  </Badge>
                )}
                {m.freeTier && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0">
                    Free
                  </Badge>
                )}
              </span>
              {!m.freeTier && m.inputPricePerMTok != null && (
                <span className="text-xs text-muted-foreground">
                  ${m.inputPricePerMTok}/M in · $
                  {m.outputPricePerMTok ?? "?"}/M out
                </span>
              )}
            </span>
            <CheckIcon
              className={cn(
                "mt-1 h-4 w-4 shrink-0",
                selectedModel === m.value ? "opacity-100" : "opacity-0"
              )}
            />
          </button>
        ))}
        {activeList.length === 0 && (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            No models available.
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
    <span className="truncate">{current}</span>
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
      className="w-[220px] justify-between text-muted-foreground hover:text-foreground"
    >
      <TriggerLabel models={models} selectedModel={selectedModel} />
      {current === undefined && models.length === 0 ? (
        <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin opacity-50" />
      ) : (
        <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      )}
    </Button>
  )

  const bodyProps = { models, selectedModel, onSelect: setSelectedModel }

  if (!isMobile) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent align="start" className="w-[300px] p-0">
          <PickerBody {...bodyProps} />
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent>
        <div className="mt-4 border-t pb-4">
          <PickerBody {...bodyProps} />
        </div>
      </DrawerContent>
    </Drawer>
  )
}
