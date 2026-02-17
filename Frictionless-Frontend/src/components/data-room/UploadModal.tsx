'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { FileDropzone } from '@/components/shared/FileDropzone';
import { useMediaQuery } from '@/lib/hooks/useMediaQuery';

interface UploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, "Upload Files" will call this with the selected files (e.g. to upload to data room and trigger processing). */
  onUploadComplete?: (files: File[]) => Promise<void>;
}

function UploadContent({
  onUpload,
  onUploadClick,
  uploadDisabled,
}: {
  onUpload: (files: File[]) => void;
  onUploadClick: () => void;
  uploadDisabled: boolean;
}) {
  return (
    <div className="space-y-5">
      <FileDropzone
        accept=".pdf,.xlsx,.xls,.csv,.docx,.doc,.png,.jpg,.jpeg,.zip"
        multiple
        maxSize={50 * 1024 * 1024}
        onUpload={onUpload}
      />
      <p className="text-xs text-muted-foreground">
        Uploaded files are added to your Data Room. PDFs and spreadsheets are analyzed to update your readiness score.
      </p>
      <div className="flex justify-end gap-2">
        <Button
          className="bg-electric-blue hover:bg-electric-blue/90"
          onClick={onUploadClick}
          disabled={uploadDisabled}
        >
          Upload Files
        </Button>
      </div>
    </div>
  );
}

export function UploadModal({ open, onOpenChange, onUploadComplete }: UploadModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const handleUpload = useCallback((files: File[]) => {
    setSelectedFiles(files);
  }, []);

  const handleUploadClick = useCallback(async () => {
    if (!selectedFiles.length) return;
    if (onUploadComplete) {
      setUploading(true);
      try {
        await onUploadComplete(selectedFiles);
        setSelectedFiles([]);
      } finally {
        setUploading(false);
      }
    }
    onOpenChange(false);
  }, [selectedFiles, onUploadComplete, onOpenChange]);

  const uploadDisabled = selectedFiles.length === 0 || uploading;

  const content = (
    <UploadContent
      onUpload={handleUpload}
      onUploadClick={handleUploadClick}
      uploadDisabled={uploadDisabled}
    />
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg bg-obsidian-800 border-obsidian-600">
          <DialogHeader>
            <DialogTitle className="font-display">Upload Documents</DialogTitle>
            <DialogDescription>
              Add files to your data room. Supported: PDF, XLSX, CSV, DOCX, Images, ZIP.
            </DialogDescription>
          </DialogHeader>
          {content}
          <DialogFooter>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="bg-obsidian-800 border-obsidian-600 rounded-t-2xl max-h-[85vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle className="font-display">Upload Documents</SheetTitle>
          <SheetDescription>
            Add files to your data room.
          </SheetDescription>
        </SheetHeader>
        <div className="py-4">
          {content}
        </div>
        <SheetFooter>
          <Button variant="secondary" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
