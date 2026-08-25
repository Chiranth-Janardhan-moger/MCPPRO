"use client"

import { ArrowRight, Bot, Sparkles, BrainCircuit, Zap, Terminal, CheckCircle2, Shield, Layers, ShieldCheck } from "lucide-react"
import Link from "next/link"
import { BlurFade } from "@/components/magicui/blur-fade"
import { BorderBeam } from "@/components/magicui/border-beam"
import { ShimmerButton } from "@/components/magicui/shimmer-button"
import { AnimatedShinyText } from "@/components/magicui/animated-shiny-text"
import { Badge } from "@/components/ui/badge"
import { useIsAdmin } from "@/hooks/use-is-admin"

export function Hero() {
  const { isAdmin } = useIsAdmin()

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

        {isAdmin && (
          <BlurFade delay={0.65} inView>
            <Link href="/admin">
              <div className="flex items-center gap-2 rounded-full border border-blue-500/30 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 px-6 py-3 text-sm font-semibold text-blue-600 dark:text-blue-400 backdrop-blur-sm transition-all hover:bg-blue-600 hover:text-white shadow-sm">
                <ShieldCheck className="h-4 w-4" />
                <span>Admin Console</span>
              </div>
            </Link>
          </BlurFade>
        )}

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
              <Zap className="h-3 w-3 text-purple-500" />
              Groq LPU (Llama 3.3)
            </Badge>
          </div>
        </BlurFade>
      </div>
    </section>
  )
}