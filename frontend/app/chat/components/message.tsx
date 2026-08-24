"use client";

import type { Message } from "ai";
import { AnimatePresence, motion } from "framer-motion";
import { memo } from "react";
import { SparklesIcon, UserIcon } from "./icons";
import { cn } from "@/lib/utils";
import { MarkdownContent } from "@/components/ui/markdown-content";

const PurePreviewMessage = ({
  message,
  isLoading,
}: {
  message: Message;
  isLoading: boolean;
}) => {
  const isUser = message.role === "user";

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
            className={cn("flex flex-col gap-1 max-w-[88%] sm:max-w-xl", {
              "items-end": isUser,
              "items-start": !isUser,
            })}
          >
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
          <span>Thinking & executing tools...</span>
        </div>
      </div>
    </motion.div>
  );
};
