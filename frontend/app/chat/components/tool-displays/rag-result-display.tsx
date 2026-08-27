import React from 'react';
import { FileText, Database } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Chunk {
  text?: string;
  documentName?: string;
  source?: string;
  score?: number;
}

interface RagResultDisplayProps {
  chunks?: Chunk[] | any;
}

export const RagResultDisplay: React.FC<RagResultDisplayProps> = ({ chunks }) => {
  const safeChunks: Chunk[] = Array.isArray(chunks)
    ? chunks.map((c) => (typeof c === 'string' ? { text: c, documentName: 'Document' } : c))
    : [];

  if (safeChunks.length === 0) {
    return (
      <div className="p-3 rounded-xl border border-border/70 bg-muted/20 text-xs text-muted-foreground flex items-center gap-2">
        <Database className="h-4 w-4 text-purple-500" />
        <span>Document search completed (0 direct chunks matched query).</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 my-2 w-full">
      <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
        <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        <span>Retrieved Knowledge Base Context ({safeChunks.length} chunks)</span>
      </div>
      <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-1">
        {safeChunks.map((chunk, index) => (
          <div key={index} className="p-3 border border-border/70 rounded-xl bg-card text-xs space-y-1.5 shadow-xs">
            <div className="flex items-center justify-between gap-2">
              <Badge variant="outline" className="text-[10px] font-medium bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800">
                {chunk.documentName || chunk.source || 'Knowledge Base Document'}
              </Badge>
              {typeof chunk.score === 'number' && (
                <span className="text-[10px] text-muted-foreground">
                  Score: {Math.round(chunk.score * 100)}%
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">
              {chunk.text || JSON.stringify(chunk)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
