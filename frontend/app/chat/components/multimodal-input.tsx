"use client";

import { useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SuggestedActions } from "./suggested-actions";
import { ModelSelector } from "./model-selector";
import { Message } from "ai";

interface MultimodalInputProps {
  chatId: string;
  messages: Message[];
  append: (message: Message) => Promise<string | null | undefined>;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  models: { value: string; label: string }[];
  modelState: {
    selectedModel: string;
    setSelectedModel: (model: string) => void;
  };
}

export function MultimodalInput({
  chatId,
  messages,
  append,
  value,
  onChange,
  handleSubmit,
  isLoading,
  models,
  modelState,
}: MultimodalInputProps) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="relative flex flex-col gap-4"
    >
      <div className="relative">
        {messages.length === 0 && (
          <SuggestedActions
            append={append}
            chatId={chatId}
            handleSubmit={handleSubmit}
          />
        )}
        <Textarea
          value={value}
          onChange={onChange}
          placeholder="Ask MCPPRO anything or search knowledge base..."
          className={cn(
            "min-h-[56px] max-h-[calc(75dvh)] overflow-y-auto resize-none rounded-2xl text-sm leading-relaxed",
            "bg-white/95 dark:bg-zinc-900/95 border border-zinc-200/90 dark:border-zinc-800 shadow-xs",
            "focus-visible:ring-1 focus-visible:ring-blue-500/50 dark:focus-visible:ring-blue-400/40",
            "pt-3 px-4 pb-12"
          )}
          rows={2}
          disabled={isLoading}
          onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              formRef.current?.requestSubmit();
            }
          }}
        />

        <div className="absolute bottom-2.5 left-3 gap-2">
          <ModelSelector
            models={models}
            selectedModel={modelState.selectedModel}
            setSelectedModel={modelState.setSelectedModel}
          />
        </div>

        <div className="absolute bottom-2.5 right-3 flex items-center gap-2">
          {isLoading ? (
            <Button
              type="button"
              className="rounded-full p-2 h-8 w-8 border dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed"
            >
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={!value.trim()}
              className={cn(
                "rounded-full p-2 h-8 w-8 border transition-all",
                value.trim()
                  ? "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white shadow-xs"
                  : "bg-zinc-100 text-zinc-400 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-600 dark:border-zinc-700 cursor-not-allowed"
              )}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
