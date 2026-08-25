"use client";

import type { Message } from "ai";
import { AnimatePresence, motion } from "framer-motion";
import { memo } from "react";
import { SparklesIcon } from "./icons";
import { cn } from "@/lib/utils";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { Database, Globe, Zap, HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const PurePreviewMessage = ({
  message,
  isLoading,
}: {
  message: Message;
  isLoading: boolean;
}) => {
  const isUser = message.role === "user";

  // Check for router decision annotation
  const routerAnnotation = (message.annotations || []).find(
    (a: any) => a?.type === "router_decision"
  ) as any;

  return (
    <AnimatePresence>
      <motion.div
        className="w-full mx-auto max-w-3xl px-3 sm:px-4 py-1 group/message"
        initial={{ y: 5, opacity: 0 }}
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
            className={cn("flex flex-col gap-1.5 max-w-[88%] sm:max-w-xl", {
              "items-end": isUser,
              "items-start": !isUser,
            })}
          >
            {/* Context-Aware Router Decision Badge */}
            {!isUser && routerAnnotation && (
              <div className="flex items-center gap-1 text-[11px]">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-medium border cursor-pointer transition-colors shadow-xs",
                        routerAnnotation.route === "RAG" &&
                          "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60",
                        routerAnnotation.route === "ONLINE" &&
                          "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800/60",
                        routerAnnotation.route === "DIRECT" &&
                          "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60"
                      )}
                    >
                      {routerAnnotation.route === "RAG" && (
                        <>
                          <Database className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                          <span>Routed to System RAG</span>
                        </>
                      )}
                      {routerAnnotation.route === "ONLINE" && (
                        <>
                          <Globe className="h-3 w-3 text-cyan-600 dark:text-cyan-400" />
                          <span>Routed to Web Search</span>
                        </>
                      )}
                      {routerAnnotation.route === "DIRECT" && (
                        <>
                          <Zap className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                          <span>Direct LLM Execution</span>
                        </>
                      )}
                      <span className="opacity-70 text-[10px]">
                        ({Math.round((routerAnnotation.confidence || 0.9) * 100)}%)
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-xs space-y-1">
                    <p className="font-semibold">Context-Aware Routing Decision</p>
                    <p className="text-muted-foreground">{routerAnnotation.reasoning || "Contextually evaluated intent"}</p>
                    {routerAnnotation.model && (
                      <p className="text-[10px] text-muted-foreground/70">
                        Evaluated via {routerAnnotation.model} ({routerAnnotation.latencyMs ?? 0}ms)
                      </p>
                    )}
                  </TooltipContent>
                </Tooltip>
              </div>
            )}

            {message.content && (
              <div
                className={cn("px-4 py-2.5 rounded-2xl text-sm leading-relaxed transition-all", {
                  "bg-gradient-to-br from-blue-100/80 via-white to-sky-100/70 border border-blue-200/80 dark:from-blue-950/50 dark:via-zinc-900 dark:to-sky-950/40 dark:border-blue-800/50 text-blue-950 dark:text-blue-100 font-normal rounded-tr-xs shadow-xs":
                    isUser,
                  "bg-white/90 dark:bg-zinc-800/90 border border-zinc-200/80 dark:border-zinc-700/60 text-zinc-900 dark:text-zinc-100 rounded-tl-xs shadow-xs":
                    !isUser,
                })}
              >
                <MarkdownContent
                  content={message.content as string}
                  id={message.id}
                />
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
    if (prevProps.message.annotations?.length !== nextProps.message.annotations?.length) return false;
    return true;
  },
);

export const ThinkingMessage = () => {
  const role = "assistant";
  return (
    <motion.div
      className="w-full mx-auto max-w-3xl px-3 sm:px-4 py-1 group/message"
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1, transition: { delay: 0.2 } }}
      data-role={role}
    >
      <div className="flex gap-3 w-full items-start">
        <div className="size-7 sm:size-8 flex items-center rounded-xl justify-center shrink-0 border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 text-blue-500 shadow-sm mt-0.5 animate-pulse">
          <SparklesIcon size={14} />
        </div>

        <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl rounded-tl-xs bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700/60 text-xs text-muted-foreground shadow-sm">
          <span className="inline-block size-1.5 rounded-full bg-blue-500 animate-ping" />
          <span>Routing context & executing tools...</span>
        </div>
      </div>
    </motion.div>
  );
};
