"use client";

import React, { useState } from 'react';
import { FileText, Database, ChevronDown, ChevronUp, Layers, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Chunk {
  text?: string;
  documentName?: string;
  source?: string;
  score?: number;
  page?: number | string;
}

interface RagResultDisplayProps {
  chunks?: Chunk[] | any;
  query?: string;
}

export const RagResultDisplay: React.FC<RagResultDisplayProps> = ({ chunks, query }) => {
  const [showAll, setShowAll] = useState(false);

  const safeChunks: Chunk[] = Array.isArray(chunks)
    ? chunks
        .map((c) =>
          typeof c === 'string'
            ? { text: c, documentName: 'Document' }
            : {
                text: c.text || c.content || (typeof c === 'object' ? JSON.stringify(c) : ''),
                documentName: c.documentName || c.metadata?.source || c.metadata?.document_name || c.source || 'Knowledge Base Document',
                score: c.score,
                page: c.page || c.metadata?.page,
              }
        )
        .filter((c) => c.text && c.text.trim().length > 0)
    : [];

  if (safeChunks.length === 0) {
    return (
      <div className="p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 text-xs text-muted-foreground flex items-center gap-2">
        <Database className="h-4 w-4 text-purple-500 shrink-0" />
        <span>Document search completed (0 direct vector chunks matched).</span>
      </div>
    );
  }

  const displayedChunks = showAll ? safeChunks : safeChunks.slice(0, 3);

  return (
    <div className="flex flex-col gap-2 my-1.5 w-full">
      {/* Header bar */}
      <div className="flex items-center justify-between text-xs font-semibold text-zinc-800 dark:text-zinc-200">
        <div className="flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
          <span>Knowledge Chunks Retrieved ({safeChunks.length})</span>
        </div>
        {safeChunks.length > 3 && (
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="text-[11px] font-medium text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
          >
            <span>{showAll ? 'Show less' : `View all ${safeChunks.length}`}</span>
            {showAll ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
      </div>

      {/* Chunk cards */}
      <div className="grid grid-cols-1 gap-2">
        {displayedChunks.map((chunk, index) => {
          const scorePercent = typeof chunk.score === 'number' ? Math.round(chunk.score * 100) : null;
          const isHighMatch = scorePercent !== null && scorePercent >= 80;

          return (
            <div
              key={index}
              className="p-3 border border-zinc-200/80 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900/60 text-xs space-y-1.5 shadow-2xs hover:border-purple-500/40 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <FileText className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate text-[11px]">
                    {chunk.documentName || 'Knowledge Base Document'}
                  </span>
                  {chunk.page && (
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      p. {chunk.page}
                    </span>
                  )}
                </div>

                {scorePercent !== null && (
                  <Badge
                    variant="outline"
                    className={`text-[9.5px] px-1.5 py-0 font-medium shrink-0 ${
                      isHighMatch
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                    }`}
                  >
                    {scorePercent}% match
                  </Badge>
                )}
              </div>

              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed line-clamp-3">
                {chunk.text}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
