"use client";

import React, { useState } from 'react';
import { Globe, ExternalLink, Sparkles, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TavilyResultItem {
  title: string;
  url: string;
  content?: string;
  score?: number;
}

export function TavilySearchResult({ data, query }: { data: any; query?: string }) {
  const [showAll, setShowAll] = useState(false);
  const [failedFavicons, setFailedFavicons] = useState<Record<string, boolean>>({});

  let parsed = data;
  if (typeof data === 'string') {
    try {
      parsed = JSON.parse(data);
    } catch {
      parsed = null;
    }
  }

  const results: TavilyResultItem[] = Array.isArray(parsed?.results)
    ? parsed.results
    : Array.isArray(parsed)
    ? parsed
    : [];

  const answer: string | undefined = parsed?.answer;
  const searchQuery = query || parsed?.query || '';

  const handleFaviconError = (domain: string) => {
    setFailedFavicons((prev) => ({ ...prev, [domain]: true }));
  };

  if (results.length === 0 && !answer) {
    return (
      <div className="p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 text-xs text-muted-foreground flex items-center gap-2">
        <Globe className="h-4 w-4 text-cyan-500 shrink-0" />
        <span>Web search query executed. No sources returned.</span>
      </div>
    );
  }

  const displayedResults = showAll ? results : results.slice(0, 4);

  return (
    <div className="flex flex-col gap-2.5 my-1.5 w-full">
      {/* Top Search Query Banner (Perplexity Style) */}
      {searchQuery && (
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-zinc-100/80 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/50 text-[11px] text-zinc-700 dark:text-zinc-300">
          <Search className="h-3.5 w-3.5 text-cyan-500 shrink-0" />
          <span className="text-muted-foreground shrink-0">Searched:</span>
          <span className="font-medium text-foreground truncate">&ldquo;{searchQuery}&rdquo;</span>
        </div>
      )}

      {/* Direct Synthesized Answer (if available) */}
      {answer && (
        <div className="p-3 rounded-xl bg-gradient-to-r from-cyan-50/80 via-sky-50/40 to-blue-50/80 dark:from-cyan-950/40 dark:via-zinc-900/50 dark:to-blue-950/40 border border-cyan-200/80 dark:border-cyan-800/60 text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed shadow-2xs">
          <div className="flex items-center gap-1.5 font-semibold mb-1 text-cyan-800 dark:text-cyan-300">
            <Sparkles className="h-3.5 w-3.5 text-cyan-500 shrink-0" />
            <span>Search Direct Answer</span>
          </div>
          <p className="line-clamp-4 text-zinc-700 dark:text-zinc-300">{answer}</p>
        </div>
      )}

      {/* Source Citation Cards (Perplexity Card Grid) */}
      {results.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-800 dark:text-zinc-200">
            <div className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
              <span>Web Sources ({results.length})</span>
            </div>
            {results.length > 4 && (
              <button
                type="button"
                onClick={() => setShowAll(!showAll)}
                className="text-[11px] font-medium text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
              >
                <span>{showAll ? 'Show less' : `View all ${results.length}`}</span>
                {showAll ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {displayedResults.map((item, index) => {
              let domain = '';
              try {
                domain = new URL(item.url).hostname.replace(/^www\./, '');
              } catch {
                domain = 'web';
              }

              const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
              const hasFaviconFailed = failedFavicons[domain];

              return (
                <a
                  key={index}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative flex flex-col justify-between p-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 hover:border-cyan-500/50 dark:hover:border-cyan-500/40 hover:shadow-xs transition-all duration-150 text-xs space-y-1.5"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {/* Domain Favicon */}
                        {!hasFaviconFailed ? (
                          <img
                            src={faviconUrl}
                            alt=""
                            className="w-3.5 h-3.5 rounded-xs shrink-0 object-contain"
                            onError={() => handleFaviconError(domain)}
                          />
                        ) : (
                          <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        )}
                        <span className="text-[10px] font-medium text-muted-foreground truncate max-w-[120px]">
                          {domain}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <span className="inline-flex items-center justify-center size-4 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[9px] font-bold text-zinc-600 dark:text-zinc-400 group-hover:bg-cyan-100 group-hover:text-cyan-700 dark:group-hover:bg-cyan-950 dark:group-hover:text-cyan-300 transition-colors">
                          {index + 1}
                        </span>
                        <ExternalLink className="h-3 w-3 text-muted-foreground opacity-40 group-hover:opacity-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-all" />
                      </div>
                    </div>

                    <p className="font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 line-clamp-1 transition-colors text-[11px] leading-snug">
                      {item.title}
                    </p>
                  </div>

                  {item.content && (
                    <p className="text-[10.5px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {item.content}
                    </p>
                  )}
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
