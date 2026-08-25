'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import {
  Database,
  Upload,
  FileText,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileBox,
  RefreshCw,
  Info,
} from 'lucide-react';

interface GlobalDocument {
  id: string;
  file_name: string;
  status: string;
  chunk_count: number;
  file_size?: number;
  uploaded_by_email?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export function GlobalDocumentsTab() {
  const [documents, setDocuments] = useState<GlobalDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/documents');
      const data = await res.json();
      if (data.success) {
        setDocuments(data.documents || []);
      }
    } catch (err: any) {
      toast.error('Failed to load global documents');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Please select a file to upload.');
      return;
    }

    setIsUploading(true);
    const uploadToast = toast.loading(`Ingesting ${selectedFile.name} into fixed knowledge base...`);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (description.trim()) {
        formData.append('description', description.trim());
      }

      const res = await fetch('/api/admin/documents', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Upload failed');
      }

      toast.success(`${selectedFile.name} successfully indexed!`, {
        id: uploadToast,
        description: `Processed ${data.chunks_processed || 0} chunks into the vector store.`,
      });

      setSelectedFile(null);
      setDescription('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchDocuments();
    } catch (err: any) {
      toast.error('Upload failed', {
        id: uploadToast,
        description: err.message || 'Could not process document.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string, fileName: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/documents?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Delete failed');
      }

      toast.success(`${fileName} removed from global knowledge base.`);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (err: any) {
      toast.error(`Delete failed: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Information Banner */}
      <div className="p-3.5 rounded-xl border border-blue-200/70 dark:border-blue-900/50 bg-blue-50/70 dark:bg-blue-950/30 flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-semibold text-blue-950 dark:text-blue-200">
            Fixed System Knowledge Base for All Users
          </p>
          <p className="text-blue-900/80 dark:text-blue-300/80 leading-relaxed">
            Documents uploaded here are <strong>fixed and globally shared</strong> across the entire system. Standard users will automatically retrieve knowledge and accurate answers from these documents via RAG vector search, even if user file uploads are disabled.
          </p>
        </div>
      </div>

      {/* Upload New Global Document Card */}
      <Card className="bg-card/70 backdrop-blur-sm border-blue-100/70 dark:border-blue-900/40">
        <CardHeader className="p-4 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Upload className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Upload Fixed Knowledge Document</CardTitle>
              <CardDescription className="text-xs">
                Supports PDF, DOCX, TXT, Markdown, CSV, JSON, XLSX, and PPTX up to 25MB.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <form onSubmit={handleUpload} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              {/* File input */}
              <div className="md:col-span-6 space-y-1">
                <Label className="text-xs font-medium">Select Document</Label>
                <Input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".pdf,.txt,.md,.docx,.doc,.csv,.json,.xlsx,.xls,.ppt,.pptx"
                  className="h-9 text-xs cursor-pointer file:cursor-pointer file:text-xs"
                />
              </div>

              {/* Description */}
              <div className="md:col-span-6 space-y-1">
                <Label className="text-xs font-medium">Topic / Description (Optional)</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., 2026 Employee Benefits & Policies"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <p className="text-[11px] text-muted-foreground">
                {selectedFile ? `Selected: ${selectedFile.name} (${formatFileSize(selectedFile.size)})` : 'No file chosen'}
              </p>
              <Button
                type="submit"
                disabled={isUploading || !selectedFile}
                className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-sm cursor-pointer"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Chunking & Embedding...
                  </>
                ) : (
                  <>
                    <Upload className="h-3.5 w-3.5" />
                    Ingest into Knowledge Base
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Indexed Global Documents List */}
      <Card className="bg-card/70 backdrop-blur-sm">
        <CardHeader className="p-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
                <Database className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Indexed Fixed Documents</CardTitle>
                <CardDescription className="text-xs">
                  {documents.length} system documents currently vectorized and available for retrieval.
                </CardDescription>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchDocuments}
              disabled={isLoading}
              className="h-8 text-xs gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-[11px] bg-muted/30">
                  <TableHead>File Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[100px]">Chunks</TableHead>
                  <TableHead className="w-[90px]">Size</TableHead>
                  <TableHead className="w-[90px]">Status</TableHead>
                  <TableHead className="w-[120px]">Uploaded</TableHead>
                  <TableHead className="w-[70px] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-600 mx-auto" />
                      <p className="text-xs text-muted-foreground mt-2">Loading documents...</p>
                    </TableCell>
                  </TableRow>
                ) : documents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      <FileBox className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                      <p className="text-sm font-medium">No fixed global documents uploaded yet.</p>
                      <p className="text-xs text-muted-foreground/70 mt-0.5">
                        Upload system documents above to make them accessible to all users.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  documents.map((doc) => (
                    <TableRow key={doc.id} className="text-xs hover:bg-muted/40">
                      <TableCell className="font-semibold flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                        <span className="truncate max-w-[200px]">{doc.file_name}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground truncate max-w-[180px]">
                        {doc.description || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono text-[10px]">
                          {doc.chunk_count} chunks
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[11px] font-mono text-muted-foreground">
                        {formatFileSize(doc.file_size)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={doc.status === 'ready' ? 'outline' : 'destructive'}
                          className={`text-[10px] capitalize ${
                            doc.status === 'ready'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : ''
                          }`}
                        >
                          {doc.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[10px] text-muted-foreground">
                        {new Date(doc.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(doc.id, doc.file_name)}
                          disabled={deletingId === doc.id}
                          className="h-7 w-7 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50"
                          title="Delete from knowledge base"
                        >
                          {deletingId === doc.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-red-500" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
