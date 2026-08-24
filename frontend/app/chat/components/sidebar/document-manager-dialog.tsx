'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, Trash2 } from 'lucide-react';
import { createSupabaseBrowser } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface Document {
  id: string;
  file_name: string;
  status: string;
  updated_at: string;
  chunk_count?: number | null;
}

interface DocumentManagerDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const getStatusVariant = (status: string): 'destructive' | 'default' => {
  if (status === 'failed') {
    return 'destructive';
  }
  return 'default';
};

const getStatusColorClass = (status: string) => {
  switch (status) {
    case 'ready':
      return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-200/50 dark:border-green-800/50';
    case 'failed':
      return '';
    case 'pending':
    case 'partitioning':
    case 'partitioned':
    case 'refined':
    case 'chunked':
    case 'indexed':
    case 'summary_indexed':
    case 'keyword_indexed':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border-amber-200/50 dark:border-amber-800/50';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  }
};

export function DocumentManagerDialog({ isOpen, onOpenChange }: DocumentManagerDialogProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = async () => {
    try {
      const supabase = createSupabaseBrowser();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in.');

      const { data, error: dbError } = await supabase
        .from('user_documents')
        .select('id, file_name, status, chunk_count, created_at, updated_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (dbError) throw new Error(dbError.message);
      setDocuments(
        (data ?? []).map((d: any) => ({
          id: d.id,
          file_name: d.file_name,
          status: d.status,
          updated_at: d.updated_at ?? d.created_at,
          chunk_count: d.chunk_count,
        }))
      );
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (docId: string, fileName: string) => {
    setDeletingId(docId);
    try {
      const supabase = createSupabaseBrowser();
      const { error: deleteErr } = await supabase
        .from('user_documents')
        .delete()
        .eq('id', docId);

      if (deleteErr) throw deleteErr;

      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      toast.success('Document deleted successfully', {
        description: `${fileName} was removed from your index.`,
      });
    } catch (err: any) {
      console.error('Failed to delete document:', err);
      toast.error('Failed to delete document', {
        description: err?.message || 'Please try again.',
      });
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDocuments();
      const interval = setInterval(fetchDocuments, 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Document Manager</DialogTitle>
          <DialogDescription>
            View and manage your indexed documents for RAG.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <ScrollArea className="h-[360px] pr-3">
              <div className="space-y-2">
                {documents.length > 0 ? (
                  documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="group flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-xl border border-border/70 bg-card hover:bg-accent/40 hover:border-blue-300 dark:hover:border-blue-800 transition-all"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm font-semibold truncate text-foreground">
                            {doc.file_name}
                          </p>
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            {typeof doc.chunk_count === 'number' && doc.chunk_count > 0 ? (
                              <span className="font-medium text-blue-600 dark:text-sky-400">
                                {doc.chunk_count} chunks
                              </span>
                            ) : null}
                            {typeof doc.chunk_count === 'number' && doc.chunk_count > 0 ? (
                              <span>•</span>
                            ) : null}
                            <span>
                              {new Date(doc.updated_at).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant={getStatusVariant(doc.status)}
                          className={`text-[10px] px-2 py-0.5 font-medium capitalize rounded-md ${getStatusColorClass(doc.status)}`}
                        >
                          {doc.status.replace(/_/g, ' ')}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                          onClick={() => handleDelete(doc.id, doc.file_name)}
                          disabled={deletingId === doc.id}
                          title="Delete document"
                        >
                          {deletingId === doc.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-red-500" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 px-4">
                    <p className="text-sm text-muted-foreground font-medium">
                      No documents indexed yet.
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Upload PDFs, Markdown, or text files to query with RAG.
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
