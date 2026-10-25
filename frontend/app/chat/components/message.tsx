"use client";

import type { Message } from "ai";
import { AnimatePresence, motion } from "framer-motion";
import { memo, useState, useEffect } from "react";
import { SparklesIcon } from "./icons";
import { cn } from "@/lib/utils";
import { MarkdownContent } from "@/components/ui/markdown-content";
import {
  Database,
  Globe,
  Sparkles,
  Loader2,
  ChevronDown,
  Copy,
  Check,
  Brain,
  Layers,
  Clock,
} from "lucide-react";
import { ToolResultDisplay } from "./tool-result-display";

/**
 * Claude-style collapsible reasoning & tool execution panel.
 * Features quiet analysis header, intent router details, and tool invocations.
 */
function ClaudeThoughtPanel({
  routerAnnotation,
  toolInvocations,
  isLoading,
  hasContent,
}: {
  routerAnnotation?: any;
  toolInvocations?: any[];
  isLoading: boolean;
  hasContent: boolean;
}) {
  const [isOpen, setIsOpen] = useState(Boolean(isLoading && !hasContent));

  const hasTools = Boolean(toolInvocations && toolInvocations.length > 0);
  const route = routerAnnotation?.route;

  // Title generation matching Claude's quiet analysis header
  let summaryTitle = "Thought process & analysis";
  if (isLoading && !hasContent) {
    summaryTitle = hasTools ? "Executing tool actions..." : "Thinking & analyzing...";
  } else if (hasTools) {
    const count = toolInvocations!.length;
    if (count === 1) {
      const first = toolInvocations![0]?.toolName;
      if (first === "tavilySearch") summaryTitle = "Web search completed";
      else if (first === "searchUploadedDocuments") summaryTitle = "Document knowledge search completed";
      else if (first === "generateChart") summaryTitle = "Data chart generated";
      else summaryTitle = "Tool action completed";
    } else {
      summaryTitle = `${count} execution steps completed`;
    }
  } else if (route) {
    const latency = routerAnnotation?.latencyMs ? `${routerAnnotation.latencyMs}ms` : "";
    if (route === "RAG") summaryTitle = `Document knowledge intent ${latency ? `(${latency})` : ""}`;
    else if (route === "ONLINE") summaryTitle = `Live web search intent ${latency ? `(${latency})` : ""}`;
    else summaryTitle = `Direct model reasoning ${latency ? `(${latency})` : ""}`;
  }

  return (
    <div
      className={cn(
        "w-full my-1 rounded-xl border border-zinc-200/90 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/50 text-xs overflow-hidden transition-all shadow-2xs border-l-[3px]",
        route === "RAG"
          ? "border-l-purple-500 dark:border-l-purple-400"
          : route === "ONLINE"
          ? "border-l-cyan-500 dark:border-l-cyan-400"
          : "border-l-blue-500 dark:border-l-blue-400"
      )}
    >
      {/* Clickable Header Bar */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          {isLoading && !hasContent ? (
            <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin shrink-0" />
          ) : route === "RAG" ? (
            <Database className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
          ) : route === "ONLINE" ? (
            <Globe className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
          ) : (
            <Brain className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          )}
          <span className="font-medium text-zinc-700 dark:text-zinc-300 truncate">
            {summaryTitle}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-2">
          {route && (
            <span
              className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase border",
                route === "RAG" &&
                  "bg-purple-100/70 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/60",
                route === "ONLINE" &&
                  "bg-cyan-100/70 text-cyan-700 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800/60",
                route === "DIRECT" &&
                  "bg-emerald-100/70 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60"
              )}
            >
              {route}
            </span>
          )}
          <ChevronDown
            className={cn(
              "w-3.5 h-3.5 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </div>
      </button>

      {/* Collapsible Details Body */}
      {isOpen && (
        <div className="px-3 pt-1 pb-3 border-t border-zinc-200/60 dark:border-zinc-800/60 space-y-2">
          {routerAnnotation && (
            <div className="text-[11px] text-muted-foreground leading-relaxed pt-1 flex items-start gap-1.5">
              <span className="font-semibold text-zinc-700 dark:text-zinc-300 shrink-0">
                Intent Analysis:
              </span>
              <span>{routerAnnotation.reasoning || "Context evaluated"}</span>
              {routerAnnotation.model && (
                <span className="text-[10px] text-muted-foreground/70 shrink-0 ml-auto">
                  {routerAnnotation.model} ({routerAnnotation.latencyMs ?? 0}ms)
                </span>
              )}
            </div>
          )}

          {hasTools && (
            <div className="space-y-1.5 pt-1">
              {toolInvocations!.map((toolCall) => (
                <ToolResultDisplay key={toolCall.toolCallId} toolCall={toolCall} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const PurePreviewMessage = ({
  message,
  isLoading,
}: {
  message: Message;
  isLoading: boolean;
}) => {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const routerAnnotation = (message.annotations || []).find(
    (a: any) => a?.type === "router_decision"
  ) as any;

  const hasTools = Boolean(message.toolInvocations && message.toolInvocations.length > 0);
  const hasContent = Boolean(message.content && String(message.content).trim().length > 0);
  const hasExecution = Boolean(routerAnnotation || hasTools);

  const wordCount = hasContent
    ? String(message.content).trim().split(/\s+/).filter(Boolean).length
    : 0;

  const handleCopy = async () => {
    if (!message.content) return;
    try {
      await navigator.clipboard.writeText(String(message.content));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn("Failed to copy message:", err);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="w-full mx-auto max-w-3xl px-3 sm:px-4 py-1.5 group/message"
        initial={{ y: 4, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        data-role={message.role}
      >
        <div
          className={cn("flex gap-3 w-full items-start", {
            "justify-end": isUser,
            "justify-start": !isUser,
          })}
        >
          {/* Assistant Avatar */}
          {!isUser && (
            <div className="size-7 sm:size-8 flex items-center rounded-xl justify-center shrink-0 border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 text-blue-500 shadow-sm mt-0.5">
              <SparklesIcon size={14} />
            </div>
          )}

          <div
            className={cn("flex flex-col gap-1.5 max-w-[92%] sm:max-w-2xl w-full", {
              "items-end": isUser,
              "items-start": !isUser,
            })}
          >
            {/* Claude-style Collapsible Execution & Thought Container */}
            {!isUser && hasExecution && (
              <ClaudeThoughtPanel
                routerAnnotation={routerAnnotation}
                toolInvocations={message.toolInvocations}
                isLoading={isLoading}
                hasContent={hasContent}
              />
            )}

            {/* Answer Message Body (Claude Typography & Aesthetic) */}
            {hasContent && (
              <div
                className={cn("text-sm leading-relaxed transition-all", {
                  "self-end max-w-[85%] px-4 py-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200/70 dark:border-zinc-700/60 text-zinc-900 dark:text-zinc-100 rounded-tr-xs shadow-2xs font-normal":
                    isUser,
                  "self-start w-full px-4 py-3 rounded-2xl bg-white dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-tl-xs shadow-2xs":
                    !isUser,
                })}
              >
                <MarkdownContent
                  content={message.content as string}
                  id={message.id}
                />
              </div>
            )}

            {/* Assistant Action Toolbar (Copy, Word Count, Route Indicator) */}
            {!isUser && hasContent && !isLoading && (
              <div className="flex items-center gap-2 pt-0.5 px-1 text-[11px] text-muted-foreground opacity-70 hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
                  title="Copy response to clipboard"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>

                {wordCount > 0 && (
                  <span className="text-[10px] text-muted-foreground/60 select-none">
                    • {wordCount} words
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export const PreviewMessage = memo(
  PurePreviewMessage,
  (prevProps, nextProps) => {
    if (prevProps.isLoading !== nextProps.isLoading) return false;
    if (prevProps.message.content !== nextProps.message.content) return false;
    if (prevProps.message.toolInvocations?.length !== nextProps.message.toolInvocations?.length) return false;
    if (prevProps.message.annotations?.length !== nextProps.message.annotations?.length) return false;
    if (JSON.stringify(prevProps.message.toolInvocations) !== JSON.stringify(nextProps.message.toolInvocations)) return false;
    return true;
  }
);

/**
 * Modern Claude 3.7 / Perplexity style Thinking Message.
 * Displays live stopwatch ticker, multi-phase status messages, and subtle pulse wave.
 */
export const ThinkingMessage = () => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 100) / 10);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  let statusLabel = "Thinking & analyzing...";
  if (elapsed < 1.5) {
    statusLabel = "Classifying query intent...";
  } else if (elapsed < 3.5) {
    statusLabel = "Retrieving context & knowledge...";
  } else {
    statusLabel = "Synthesizing response...";
  }

  return (
    <motion.div
      className="w-full mx-auto max-w-3xl px-3 sm:px-4 py-1.5 group/message"
      initial={{ y: 4, opacity: 0 }}
      animate={{ y: 0, opacity: 1, transition: { delay: 0.05 } }}
      data-role="assistant"
    >
      <div className="flex gap-3 w-full items-start">
        <div className="size-7 sm:size-8 flex items-center rounded-xl justify-center shrink-0 border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 text-blue-500 shadow-sm mt-0.5">
          <SparklesIcon size={14} />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-zinc-50 via-blue-50/20 to-zinc-50 dark:from-zinc-900/80 dark:via-zinc-900/60 dark:to-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800 text-xs shadow-2xs">
            <Brain className="h-3.5 w-3.5 animate-pulse text-blue-500 shrink-0" />
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {statusLabel}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground/70 bg-zinc-200/50 dark:bg-zinc-800 px-1.5 py-0.5 rounded-md">
              {elapsed.toFixed(1)}s
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
