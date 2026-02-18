'use client';

import { useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  FileSpreadsheet,
  FileImage,
  File,
  Download,
  Share2,
  Trash2,
  Sparkles,
  Archive,
  Calendar,
  User,
  HardDrive,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { getAuthHeaders } from '@/lib/api/tasks';
import { toast } from 'sonner';
import type { DummyDocument, DummyValidationStatus } from '@/lib/dummy-data/documents';

interface FilePreviewProps {
  document: DummyDocument | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShare?: () => void;
}

function getFileIcon(fileType: string) {
  if (fileType.includes('pdf'))
    return { icon: FileText, color: 'text-red-400', bg: 'bg-red-400/10' };
  if (fileType.includes('spreadsheet') || fileType.includes('csv'))
    return { icon: FileSpreadsheet, color: 'text-emerald-400', bg: 'bg-emerald-400/10' };
  if (fileType.includes('word') || fileType.includes('document'))
    return { icon: FileText, color: 'text-blue-400', bg: 'bg-blue-400/10' };
  if (fileType.includes('image') || fileType.includes('png') || fileType.includes('jpg'))
    return { icon: FileImage, color: 'text-purple-400', bg: 'bg-purple-400/10' };
  if (fileType.includes('zip') || fileType.includes('archive'))
    return { icon: Archive, color: 'text-amber-400', bg: 'bg-amber-400/10' };
  return { icon: File, color: 'text-muted-foreground', bg: 'bg-muted' };
}

function getValidationStyle(status: DummyValidationStatus) {
  switch (status) {
    case 'valid':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'pending':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    case 'invalid':
      return 'bg-red-500/10 text-red-400 border-red-500/20';
    case 'expired':
      return 'bg-muted text-muted-foreground border-border';
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function FilePreview({ document: doc, open, onOpenChange, onShare }: FilePreviewProps) {
  const handleDownload = useCallback(async () => {
    if (!doc) return;
    const storagePath = (doc as DummyDocument & { storage_path?: string }).storage_path;
    if (!storagePath) {
      toast.error('Download not available for this file');
      return;
    }
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/startup/data-room/download?path=${encodeURIComponent(storagePath)}`, { headers });
      const data = await res.json();
      if (data.url) {
        window.open(data.url, '_blank');
      } else {
        toast.error(data.error || 'Download failed');
      }
    } catch {
      toast.error('Download failed');
    }
  }, [doc]);

  if (!doc) return null;

  const { icon: Icon, color, bg } = getFileIcon(doc.file_type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl bg-card border-border p-0 overflow-hidden">
        {/* Preview area */}
        <div className="relative h-48 bg-muted flex items-center justify-center border-b border-border">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className={cn('w-20 h-20 rounded-2xl flex items-center justify-center', bg)}
          >
            <Icon className={cn('w-10 h-10', color)} />
          </motion.div>
          <div className="absolute bottom-3 right-3">
            <Badge
              variant="outline"
              className={cn('capitalize text-xs', getValidationStyle(doc.validation_status))}
            >
              <ShieldCheck className="w-3 h-3 mr-1" />
              {doc.validation_status}
            </Badge>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <DialogHeader>
            <DialogTitle className="text-lg font-display font-semibold text-foreground pr-6">
              {doc.name}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              File preview and metadata
            </DialogDescription>
          </DialogHeader>

          {/* Metadata grid */}
          <div className="grid grid-cols-2 gap-4">
            <MetaItem icon={User} label="Uploaded by" value={doc.uploaded_by} />
            <MetaItem icon={Calendar} label="Date" value={formatDate(doc.uploaded_at)} />
            <MetaItem icon={HardDrive} label="Size" value={formatFileSize(doc.file_size)} />
            <MetaItem icon={ShieldCheck} label="Status" value={doc.validation_status} className="capitalize" />
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button variant="default" size="sm" className="gap-2" onClick={handleDownload}>
              <Download className="w-4 h-4" /> Download
            </Button>
            <Button variant="secondary" size="sm" className="gap-2" onClick={onShare}>
              <Share2 className="w-4 h-4" /> Share
            </Button>
            <Button variant="secondary" size="sm" className="gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> AI Analyze
            </Button>
            <Button variant="secondary" size="sm" className="gap-2 text-red-400 hover:text-red-300">
              <Trash2 className="w-4 h-4" /> Delete
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MetaItem({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn('text-sm text-foreground', className)}>{value}</p>
      </div>
    </div>
  );
}
