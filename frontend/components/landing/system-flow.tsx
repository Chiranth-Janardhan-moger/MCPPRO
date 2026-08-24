"use client"

import { motion } from "framer-motion"
import { BrainCircuit, Database, Terminal, Sparkles, ArrowRight } from "lucide-react"
import Link from "next/link"
import { ShimmerButton } from "@/components/magicui/shimmer-button"
import SectionBadge from "@/components/ui/section-badge"

const flowSteps = [
  {
    step: "01",
    title: "Configure Model & API Keys",
    description: "Choose from Claude 3.7, GPT-4o, Gemini 2.0, Groq, or OpenRouter. Set your keys directly in browser storage with instant switching.",
    icon: BrainCircuit,
    gradient: "from-blue-500 to-indigo-500",
  },
  {
    step: "02",
    title: "Ingest Documents & Vector Stores",
    description: "Upload PDFs, research papers, and datasets. Documents are automatically chunked, embedded, and indexed in Qdrant & Pinecone.",
    icon: Database,
    gradient: "from-sky-500 to-cyan-500",
  },
  {
    step: "03",
    title: "Run Multi-Agent MCP Tools",
    description: "Your autonomous agents call Model Context Protocol (MCP) tools for real-time web retrieval, GitHub operations, and vector searches.",
    icon: Terminal,
    gradient: "from-purple-500 to-violet-500",
  },
  {
    step: "04",
    title: "Stream Structured Insights",
    description: "Get lightning-fast token streaming, interactive code highlights, structured tool result viewers, and persistent conversations.",
    icon: Sparkles,
    gradient: "from-emerald-500 to-teal-500",
  },
]

export function SystemFlow() {
  return (
    <section className="py-20 sm:py-24 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <SectionBadge title="Architecture & Flow" />
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mt-6 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl"
          >
            How MCPPRO Orchestrates Agents
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg"
          >
            A cohesive architecture connecting state-of-the-art language models with your private knowledge and external tools.
          </motion.p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {flowSteps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative flex flex-col justify-between rounded-2xl border bg-card/90 p-6 shadow-sm hover:shadow-md transition-all backdrop-blur-sm"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${step.gradient} flex items-center justify-center text-white shadow-md`}>
                    <step.icon className="h-5 w-5" />
                  </div>
                  <span className="font-mono text-2xl font-bold text-muted-foreground/30">
                    {step.step}
                  </span>
                </div>
                <h3 className="mt-5 text-base font-semibold text-foreground">{step.title}</h3>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-16 rounded-3xl border bg-gradient-to-r from-blue-600/10 via-sky-500/10 to-cyan-500/10 p-8 sm:p-12 text-center backdrop-blur-xl"
        >
          <h3 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Ready to experience next-generation agentic AI?
          </h3>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
            Start chatting with Claude 3.7, GPT-4o, or Gemini 2.0 and connect your documents in seconds.
          </p>
          <div className="mt-6 flex justify-center">
            <Link href="/chat">
              <ShimmerButton
                className="flex items-center gap-2 px-6 py-3 text-sm font-semibold shadow-lg shadow-blue-500/25"
                background="linear-gradient(to right, #2563eb, #0284c7)"
              >
                <span className="text-white">Get Started with MCPPRO</span>
                <ArrowRight className="h-4 w-4 text-white" />
              </ShimmerButton>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  )
}