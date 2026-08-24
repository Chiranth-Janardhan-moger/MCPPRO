"use client"

import { ArrowRight, Bot, Sparkles, BrainCircuit, Zap, Terminal, CheckCircle2, Shield, Layers } from "lucide-react"
import Link from "next/link"
import { BlurFade } from "@/components/magicui/blur-fade"
import { BorderBeam } from "@/components/magicui/border-beam"
import { ShimmerButton } from "@/components/magicui/shimmer-button"
import { AnimatedShinyText } from "@/components/magicui/animated-shiny-text"
import { Badge } from "@/components/ui/badge"

export function Hero() {
  return (
    <section className="relative overflow-hidden py-16 sm:py-24 lg:py-28">
      {/* Background Glow */}
      <div className="pointer-events-none absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
        <div
          className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-blue-600 to-cyan-400 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
          style={{
            clipPath:
              'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
          }}
        />
      </div>

      {/* Pill Badge */}
      <div className="group relative mx-auto flex justify-center">
        <BlurFade delay={0.15} inView>
          <div className="group rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 backdrop-blur-md transition-all ease-in hover:bg-primary/10">
            <AnimatedShinyText className="inline-flex items-center justify-center text-xs sm:text-sm font-medium transition ease-out">
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Model Context Protocol & Multi-Agent AI Platform
              </span>
            </AnimatedShinyText>
          </div>
        </BlurFade>
      </div>

      {/* Hero Headline */}
      <div className="mt-8 text-center px-4">
        <BlurFade delay={0.3} inView>
          <h1 className="mx-auto max-w-5xl text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            Autonomous AI Agents Powered by{" "}
            <span className="bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400 bg-clip-text text-transparent">
              MCP & Frontier Models
            </span>
          </h1>
        </BlurFade>
        <BlurFade delay={0.45} inView>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg sm:mt-7">
            Orchestrate Anthropic Claude 3.7 Sonnet, OpenAI o3/GPT-4o, Google Gemini 2.0, and OpenRouter with extensible Model Context Protocol (MCP) tool execution and streaming agents.
          </p>
        </BlurFade>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5 sm:mt-10">
        <BlurFade delay={0.6} inView>
          <Link href="/chat">
            <ShimmerButton
              className="flex items-center gap-2 px-6 py-3 text-sm sm:text-base font-semibold shadow-lg shadow-blue-500/20"
              background="linear-gradient(to right, #2563eb, #0284c7)"
            >
              <span className="text-white">Launch Chat Studio</span>
              <ArrowRight className="h-4 w-4 text-white transition-transform group-hover:translate-x-1" />
            </ShimmerButton>
          </Link>
        </BlurFade>
        <BlurFade delay={0.7} inView>
          <Link href="/dashboard">
            <div className="flex items-center gap-2 rounded-full border bg-card/80 px-6 py-3 text-sm font-medium text-foreground backdrop-blur-sm transition-colors hover:bg-accent/80 hover:text-accent-foreground shadow-sm">
              <Layers className="h-4 w-4 text-primary" />
              <span>Explore Dashboard</span>
            </div>
          </Link>
        </BlurFade>
      </div>

      {/* Provider Pill Showcase */}
      <div className="mt-10 flex flex-wrap items-center justify-center gap-2 max-w-3xl mx-auto px-4">
        <BlurFade delay={0.8} inView>
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Supported Providers:</span>
            <Badge variant="secondary" className="gap-1 py-1 px-2.5 font-normal">
              <BrainCircuit className="h-3 w-3 text-amber-500" />
              Anthropic Claude 3.7
            </Badge>
            <Badge variant="secondary" className="gap-1 py-1 px-2.5 font-normal">
              <Bot className="h-3 w-3 text-emerald-500" />
              OpenAI GPT-4o & o3
            </Badge>
            <Badge variant="secondary" className="gap-1 py-1 px-2.5 font-normal">
              <Sparkles className="h-3 w-3 text-blue-500" />
              Google Gemini 2.0
            </Badge>
            <Badge variant="secondary" className="gap-1 py-1 px-2.5 font-normal">
              <Zap className="h-3 w-3 text-orange-500" />
              Groq LPU
            </Badge>
            <Badge variant="secondary" className="gap-1 py-1 px-2.5 font-normal">
              DeepSeek R1 / V3
            </Badge>
          </div>
        </BlurFade>
      </div>

      {/* Interactive UI Mockup Card */}
      <div className="relative mx-auto mt-14 max-w-5xl px-4 sm:mt-16">
        <BlurFade delay={0.9} inView>
          <div className="relative rounded-2xl border bg-card/90 p-3 sm:p-4 shadow-2xl backdrop-blur-xl ring-1 ring-border/50">
            {/* Mockup Header Bar */}
            <div className="flex items-center justify-between border-b pb-3 px-2">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500/80" />
                <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                <span className="ml-2 font-mono text-xs text-muted-foreground hidden sm:inline">
                  MCPPRO Agentic Workspace
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] bg-background/50 border-emerald-500/30 text-emerald-500">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  MCP Server Active
                </Badge>
                <Badge variant="secondary" className="text-[10px]">
                  Claude 3.7 Sonnet
                </Badge>
              </div>
            </div>

            {/* Mockup Content Body */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4">
              {/* Left Column: Tool Invocations */}
              <div className="space-y-2 rounded-xl bg-muted/40 p-3 border border-border/50">
                <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                  <span className="flex items-center gap-1.5">
                    <Terminal className="h-3.5 w-3.5 text-primary" />
                    Tool Executions
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">3 calls</span>
                </div>
                
                <div className="space-y-1.5 font-mono text-[11px]">
                  <div className="rounded-lg bg-background p-2 border border-border/60">
                    <div className="text-emerald-500 font-medium">✓ mcp_search_docs</div>
                    <div className="text-muted-foreground text-[10px] truncate">query: &quot;hybrid Qdrant vector retrieval&quot;</div>
                  </div>
                  <div className="rounded-lg bg-background p-2 border border-border/60">
                    <div className="text-blue-500 font-medium">✓ mcp_github_fetch</div>
                    <div className="text-muted-foreground text-[10px] truncate">repo: &quot;Chiranth-Janardhan-moger/MCPPRO&quot;</div>
                  </div>
                  <div className="rounded-lg bg-background p-2 border border-border/60">
                    <div className="text-purple-500 font-medium">✓ mcp_calc_pricing</div>
                    <div className="text-muted-foreground text-[10px] truncate">tokens: 1,420 | cost: $0.0042</div>
                  </div>
                </div>
              </div>

              {/* Center & Right Column: Chat & Code Streaming */}
              <div className="md:col-span-2 space-y-3 rounded-xl bg-muted/20 p-3 sm:p-4 border border-border/50">
                {/* User Prompt */}
                <div className="flex items-start gap-2.5">
                  <div className="h-6 w-6 shrink-0 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                    U
                  </div>
                  <div className="rounded-xl bg-muted p-2.5 text-xs text-foreground max-w-[90%]">
                    Synthesize the document index and run a multi-agent vector query across our Qdrant cluster.
                  </div>
                </div>

                {/* Assistant Output */}
                <div className="flex items-start gap-2.5">
                  <div className="h-6 w-6 shrink-0 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white">
                    AI
                  </div>
                  <div className="flex-1 space-y-2 text-xs">
                    <p className="text-foreground leading-relaxed">
                      Successfully queried the vector index with <strong>hybrid dense-sparse retrieval</strong>. Top 3 matched segments retrieved from Qdrant with sub-millisecond latency:
                    </p>
                    <div className="rounded-lg bg-background/90 p-2.5 font-mono text-[11px] border border-border/70 text-muted-foreground">
                      <div className="text-sky-400 font-semibold">{`// Vector Retrieval Result [score: 0.942]`}</div>
                      <div>{`{ "collection": "docs_cache", "matches": 3, "latency_ms": 14.2 }`}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <BorderBeam size={250} duration={12} delay={9} />
          </div>
        </BlurFade>
      </div>
    </section>
  )
}