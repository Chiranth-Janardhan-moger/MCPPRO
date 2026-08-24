"use client"

import { motion } from "framer-motion"
import { Check, Code2, Database, Terminal, Sparkles, ArrowRight } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

export function FeatureDetails() {
  return (
    <section className="py-20 sm:py-24 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <Badge variant="outline" className="px-3 py-1 text-xs border-primary/30 text-primary">
            Core Architecture
          </Badge>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mt-6 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl"
          >
            Engineered for Precision & Speed
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg"
          >
            From protocol-level MCP tool dispatch to sub-millisecond vector querying, every module is designed for production reliability.
          </motion.p>
        </div>

        <div className="mt-16 space-y-16 lg:space-y-24">
          {/* Feature 1: MCP Tool Calling */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500 mb-4">
                <Terminal className="h-5 w-5" />
              </div>
              <h3 className="text-2xl font-bold text-foreground sm:text-3xl">
                Dynamic MCP Tool Execution
              </h3>
              <p className="mt-4 text-base text-muted-foreground leading-relaxed">
                Connect your language models directly to external tools, databases, and APIs using the standardized Model Context Protocol (MCP). Agents autonomously determine tool parameters, run executions, and synthesize live results into real-time streaming output.
              </p>
              <ul className="mt-6 space-y-2.5 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span>Native MCP SSE and HTTP server compatibility</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span>Automated schema extraction & dynamic validation</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span>Structured tool-call annotations with live UI chips</span>
                </li>
              </ul>
            </div>
            
            {/* Visual Code Box */}
            <div className="rounded-2xl border bg-card/90 p-4 shadow-xl backdrop-blur-xl font-mono text-xs overflow-hidden">
              <div className="flex items-center justify-between border-b pb-2.5 mb-3 text-muted-foreground">
                <span className="text-[11px] font-semibold text-foreground">tool_registry.py</span>
                <Badge variant="outline" className="text-[9px] text-primary border-primary/30">MCP Protocol</Badge>
              </div>
              <pre className="text-muted-foreground leading-relaxed overflow-x-auto p-1">
                <code>
                  <span className="text-blue-400">@registry.register_tool</span>{'\n'}
                  <span className="text-purple-400">class</span> <span className="text-amber-300">VectorSearchTool</span>(BaseTool):{'\n'}
                  {'  '}name = <span className="text-emerald-400">&quot;mcp_search_docs&quot;</span>{'\n'}
                  {'  '}description = <span className="text-emerald-400">&quot;Hybrid vector search in Qdrant&quot;</span>{'\n\n'}
                  {'  '}<span className="text-purple-400">async def</span> <span className="text-sky-300">execute</span>(self, query: str, top_k: int = 5):{'\n'}
                  {'    '}embeddings = <span className="text-purple-400">await</span> model.embed(query){'\n'}
                  {'    '}results = <span className="text-purple-400">await</span> qdrant.search(embeddings, limit=top_k){'\n'}
                  {'    '}<span className="text-purple-400">return</span> format_tool_response(results)
                </code>
              </pre>
            </div>
          </div>

          {/* Feature 2: Hybrid Dense Vector Ingestion */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center lg:flex-row-reverse">
            <div className="lg:order-2">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 mb-4">
                <Database className="h-5 w-5" />
              </div>
              <h3 className="text-2xl font-bold text-foreground sm:text-3xl">
                Hybrid Vector Retrieval & Multi-Store Caching
              </h3>
              <p className="mt-4 text-base text-muted-foreground leading-relaxed">
                Ingest massive PDF documents, research files, and markdown notes. Our multi-store architecture manages dense vector indexes in Qdrant Cloud or Pinecone, backed by persistent in-memory caching to eliminate redundant embedding roundtrips.
              </p>
              <ul className="mt-6 space-y-2.5 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span>Sub-millisecond similarity queries with payload filters</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span>OCR text extraction with PyMuPDF & Tesseract</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span>Automatic document deduplication & SHA-256 caching</span>
                </li>
              </ul>
            </div>

            {/* Visual Vector Metric Card */}
            <div className="lg:order-1 rounded-2xl border bg-card/90 p-5 shadow-xl backdrop-blur-xl space-y-3">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-semibold text-foreground">Vector Store Status</span>
                </div>
                <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/40">Connected</Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="rounded-xl bg-muted/40 p-3 border border-border/50">
                  <div className="text-[11px] text-muted-foreground">Active Provider</div>
                  <div className="text-sm font-semibold text-foreground mt-0.5">Qdrant Cloud</div>
                </div>
                <div className="rounded-xl bg-muted/40 p-3 border border-border/50">
                  <div className="text-[11px] text-muted-foreground">Query Latency</div>
                  <div className="text-sm font-semibold text-emerald-500 mt-0.5">14.2 ms</div>
                </div>
                <div className="rounded-xl bg-muted/40 p-3 border border-border/50">
                  <div className="text-[11px] text-muted-foreground">Embedding Dim</div>
                  <div className="text-sm font-semibold text-foreground mt-0.5">1,536 (Dense)</div>
                </div>
                <div className="rounded-xl bg-muted/40 p-3 border border-border/50">
                  <div className="text-[11px] text-muted-foreground">Cache Hit Ratio</div>
                  <div className="text-sm font-semibold text-blue-500 mt-0.5">99.4%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}