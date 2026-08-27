"use client";

import React from 'react';
import { Globe, ExternalLink, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TavilyResultItem {
  title: string;
  url: string;
  content?: string;
  score?: number;
}

export function TavilySearchResult({ data }: { data: any }) {
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

  if (results.length === 0 && !answer) {
    return (
      <div className="p-3 rounded-xl border border-border/70 bg-muted/20 text-xs text-muted-foreground flex items-center gap-2">
        <Globe className="h-4 w-4 text-cyan-500" />
        <span>Web search query executed.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5 my-2 w-full">
      {answer && (
        <div className="p-3 rounded-xl bg-cyan-50/70 dark:bg-cyan-950/30 border border-cyan-200/80 dark:border-cyan-800/60 text-xs text-cyan-950 dark:text-cyan-200 leading-relaxed shadow-xs">
          <div className="flex items-center gap-1.5 font-semibold mb-1 text-cyan-800 dark:text-cyan-300">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Search Direct Answer</span>
          </div>
          <p>{answer}</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Globe className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Live Web Sources ({results.length})</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {results.slice(0, 4).map((item, index) => {
              let domain = '';
              try {
                domain = new URL(item.url).hostname.replace(/^www\./, '');
              } catch {
                domain = 'web';
              }

              return (
                <a
                  key={index}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col justify-between p-2.5 rounded-xl border border-border/70 bg-card hover:bg-accent/40 hover:border-cyan-500/40 transition-all text-xs shadow-xs space-y-1.5"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-medium bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800">
                        {domain}
                      </Badge>
                      <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="font-semibold text-foreground group-hover:text-cyan-600 dark:group-hover:text-cyan-400 line-clamp-1 transition-colors">
                      {item.title}
                    </p>
                  </div>
                  {item.content && (
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
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
