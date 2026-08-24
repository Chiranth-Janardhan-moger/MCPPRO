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
            <ScrollArea className="h-[400px] pr-4">
              <div className="grid gap-3">
                {documents.length > 0 ? (
                  documents.map((doc) => (
                    <Card key={doc.id} className="border-border/60 hover:border-border transition-colors">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium truncate pr-2 max-w-[280px]">
                          {doc.file_name}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={getStatusVariant(doc.status)}
                            className={`capitalize ${getStatusColorClass(doc.status)}`}
                          >
                            {doc.status.replace(/_/g, ' ')}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                            onClick={() => handleDelete(doc.id, doc.file_name)}
                            disabled={deletingId === doc.id}
                            title="Delete document"
                          >
                            {deletingId === doc.id ? (
                              <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-muted-foreground">
                          {typeof doc.chunk_count === 'number' && doc.chunk_count > 0
                            ? `${doc.chunk_count} chunks · `
                            : ''}
                          Last updated: {new Date(doc.updated_at).toLocaleString()}
                        </p>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-10">
                    No documents have been uploaded yet.
                  </p>
                )}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
