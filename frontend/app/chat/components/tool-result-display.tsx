"use client";

import React, { memo } from 'react';
import { ToolInvocation } from "ai";
import { motion } from 'framer-motion';
import { Database, Search, FileText, BarChart, Image as ImageIcon, Mail, MonitorPlay, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { SupabaseQuery } from "./tool-displays/supabase-query";
import { ChartDisplay } from './tool-displays/chart-display';
import { ImageDisplay } from './tool-displays/image-display';
import { TavilySearchResult } from "./tool-displays/tavily-search-result";
import { RagResultDisplay } from './tool-displays/rag-result-display';
import { GenericToolDisplay } from './tool-displays/generic-tool-display';
import { V0ToolDisplay } from './tool-displays/v0-tool-display';
import { FunctionSquareIcon } from "lucide-react";

interface ToolResultDisplayProps {
  toolCall: ToolInvocation;
  isLast?: boolean;
  isFirst?: boolean;
  totalTools?: number;
  currentIndex?: number;
}

const TOOL_COMPONENTS: { [key: string]: React.FC<any> } = {
  querySupabase: ({ result }) => <SupabaseQuery data={result} />,
  generateChart: ({ result, args }) => <ChartDisplay {...(result || args)} />,
  tavilySearch: ({ result, args }) => {
    let parsed = result;
    if (typeof result === 'string') {
      try { parsed = JSON.parse(result); } catch {}
    }
    return <TavilySearchResult data={parsed} query={args?.query || args?.question} />;
  },
  ragRetrieval: ({ result, args }) => <RagResultDisplay chunks={result?.chunks || result} query={args?.query} />,
  searchUploadedDocuments: ({ result, args }) => {
    let parsed = result;
    if (typeof result === 'string') {
      try { parsed = JSON.parse(result); } catch {}
    }
    const chunks = parsed?.chunks || (Array.isArray(parsed) ? parsed : (parsed?.result ? [{ text: parsed.result, documentName: 'Knowledge Base' }] : []));
    return <RagResultDisplay chunks={chunks} query={args?.query} />;
  },
  generateImage: ({ result, args }) => <ImageDisplay {...(result || args)} />,
};

function getToolComponent(toolName: string): React.FC<any> {
  if (toolName.startsWith('v0_')) {
    const V0Wrapper = ({ result }: any) => <V0ToolDisplay data={result} />;
    V0Wrapper.displayName = 'V0Wrapper';
    return V0Wrapper;
  }
  return TOOL_COMPONENTS[toolName] || GenericToolDisplay;
}

const TOOL_DISPLAY_NAMES: { [key: string]: string } = {
  generateChart: "Chart Generation",
  tavilySearch: "Web Search",
  searchUploadedDocuments: "Document Vector Search",
  ragRetrieval: "Document Retrieval",
  generateImage: "Image Generation",
  sendHealthReport: "Health Report",
  stagehandRun: "Web Automation",
};

function getToolDisplayName(toolName: string): string {
  if (toolName.startsWith('v0_')) return 'v0 Interface Tool';
  return TOOL_DISPLAY_NAMES[toolName] || toolName;
}

const TOOL_ICONS: { [key: string]: React.ComponentType<{ className?: string }> } = {
  querySupabase: Database,
  generateChart: BarChart,
  tavilySearch: Search,
  searchUploadedDocuments: FileText,
  ragRetrieval: FileText,
  generateImage: ImageIcon,
  sendHealthReport: Mail,
  stagehandRun: MonitorPlay,
};

function ToolResultDisplayInternal({ toolCall }: ToolResultDisplayProps) {
  const toolDisplayName = getToolDisplayName(toolCall.toolName);
  const ToolIcon = TOOL_ICONS[toolCall.toolName] || FunctionSquareIcon;
  const ToolComponent = getToolComponent(toolCall.toolName);
  
  const isLoading = toolCall.state === 'call';
  const isCompleted = toolCall.state === 'result';

  let data: any = null;
  let hasError = false;
  
  if (isCompleted) {
    try {
      data = typeof toolCall.result === 'string' 
        ? JSON.parse(toolCall.result) 
        : toolCall.result;
      hasError = Boolean(data?.error);
    } catch {
      data = toolCall.result;
    }
  }

  // Extract query preview if present in args
  const queryArg = toolCall.args?.query || toolCall.args?.question || toolCall.args?.prompt || '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 3 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="w-full my-1.5"
    >
      <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/40 p-3 shadow-2xs">
        {/* Tool Header Status Bar */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 shrink-0">
              <ToolIcon className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 shrink-0">
                {toolDisplayName}
              </span>
              {queryArg && (
                <span className="text-[11px] text-muted-foreground truncate max-w-[200px] sm:max-w-xs font-mono">
                  &ldquo;{queryArg}&rdquo;
                </span>
              )}
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-1 text-[11px] font-medium">
            {isLoading ? (
              <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Running</span>
              </span>
            ) : hasError ? (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <AlertCircle className="w-3 h-3" />
                <span>Error</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3 h-3" />
                <span>Ready</span>
              </span>
            )}
          </div>
        </div>

        {/* Error Output */}
        {hasError && data?.error && (
          <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 p-2 rounded-lg border border-amber-200 dark:border-amber-800">
            {data.error}
          </div>
        )}

        {/* Completed Tool Result Output */}
        {isCompleted && !hasError && (
          <div className="mt-2.5 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/60">
            <ToolComponent result={data} args={toolCall.args} />
          </div>
        )}
      </div>
    </motion.div>
  );
}

export const ToolResultDisplay = memo(ToolResultDisplayInternal);

export function ToolResultsContainer({ toolCalls }: { toolCalls: ToolInvocation[] }) {
  return (
    <div className="space-y-1.5 w-full">
      {toolCalls.map((toolCall) => (
        <ToolResultDisplay key={toolCall.toolCallId} toolCall={toolCall} />
      ))}
    </div>
  );
}
