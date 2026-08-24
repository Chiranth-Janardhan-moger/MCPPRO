'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { DocumentManagerDialog } from './document-manager-dialog';
import { UploadIcon } from '../icons';
import { createSupabaseBrowser } from '@/lib/supabase/client';

export function FileUpload() {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsPopoverOpen(false);

    const formData = new FormData();
    formData.append('file', file);

    const uploadToast = toast.loading('Uploading file...', {
      description: file.name,
    });

    try {
      const response = await fetch('/api/rag/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const detail = await response.json().catch(() => null);
        throw new Error(detail?.detail || detail?.error || `Upload failed with HTTP ${response.status}`);
      }

      const result = await response.json().catch(() => null);

      // Record the upload for the Document Manager (RLS-scoped to this user).
      try {
        const supabase = createSupabaseBrowser();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('user_documents').insert({
            user_id: user.id,
            file_name: file.name,
            status: result?.success ? 'ready' : 'failed',
            document_ref: result?.document_id ?? null,
            chunk_count: result?.chunks_processed ?? null,
          });
        }
      } catch (dbErr) {
        console.warn('[file-upload] Metadata recording skipped:', dbErr);
      }

      toast.success('Successfully file uploaded', {
        id: uploadToast,
        description: `${file.name} uploaded and indexed successfully (${result?.chunks_processed ?? 'ready'} chunks).`,
      });
    } catch (error) {
      toast.error('Upload Error',
        {
          id: uploadToast,
          description: error instanceof Error ? error.message : 'Could not upload file.',
        }
      );
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" className="w-full justify-start">
            <span className="mr-2">
              <UploadIcon />
            </span>
            My Documents
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="grid gap-4">
            <div className="space-y-2">
              <h4 className="font-medium leading-none">Uploaded Documents</h4>
              <p className="text-sm text-muted-foreground">
                Manage your documents for RAG.
              </p>
            </div>
            <div className="grid gap-2">
              <Button onClick={handleUploadClick}>Upload New File</Button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.txt,.md,.docx,.doc,.csv,.json,.xlsx,.xls,.ppt,.pptx,.png,.jpg,.jpeg"
              />
              <Button variant="outline" onClick={() => setIsDialogOpen(true)}>
                Manage Documents
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      <DocumentManagerDialog isOpen={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </>
  );
}
