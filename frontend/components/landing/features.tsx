"use client"

import { motion } from "framer-motion"
import { Bot, BrainCircuit, Database, KeyRound, Layers, Sparkles, Terminal, Zap, ShieldCheck } from "lucide-react"
import SectionBadge from "@/components/ui/section-badge"
import { cn } from "@/lib/utils"

const features = [
  {
    title: "Multi-Model Intelligence",
    info: "Switch freely between Anthropic Claude 3.7, OpenAI o3/GPT-4o, Google Gemini 2.0, Groq LPU, and OpenRouter.",
    icon: BrainCircuit,
    gradient: "from-blue-500 to-indigo-500",
  },
  {
    title: "Model Context Protocol (MCP)",
    info: "Native support for custom MCP tools, automated function calling, tool execution pipelines, and SSE servers.",
    icon: Terminal,
    gradient: "from-sky-500 to-cyan-500",
  },
  {
    title: "Hybrid Vector Retrieval",
    info: "Multi-tenant vector search backed by Qdrant Cloud, Pinecone, and high-performance in-memory caching layers.",
    icon: Database,
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    title: "BYOK Browser Key Vault",
    info: "Add and manage your OpenAI, Anthropic, Gemini, and Groq API keys locally in your browser settings with zero server leakage.",
    icon: KeyRound,
    gradient: "from-purple-500 to-violet-500",
  },
  {
    title: "Real-Time Agentic Streaming",
    info: "Token-by-token streaming with interactive tool call notifications, syntax-highlighted code, and multi-turn persistence.",
    icon: Zap,
    gradient: "from-amber-500 to-orange-500",
  },
  {
    title: "Document Ingestion & OCR",
    info: "Upload PDFs, Markdown files, and datasets with automated text chunking, embedding generation, and OCR fallback.",
    icon: Layers,
    gradient: "from-pink-500 to-rose-500",
  },
]

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
}

export function Features() {
  return (
    <section className="py-20 sm:py-24 lg:py-28 bg-muted/20 border-y border-border/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <SectionBadge title="Platform Features" />
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mt-6 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl"
          >
            Built for High-Performance AI Workflows
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg"
          >
            Everything you need to build, test, and deploy intelligent multi-agent systems connected to real-world data and tools.
          </motion.p>
        </div>

        <motion.div 
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                variants={item}
                className={cn(
                  "relative flex flex-col justify-between rounded-2xl border bg-card/90 p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/40 group backdrop-blur-sm"
                )}
              >
                <div>
                  <div className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md",
                    feature.gradient
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {feature.info}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}