'use client';

import { motion } from 'framer-motion';
import {
  FileText,
  FileSpreadsheet,
  FileImage,
  File,
  Download,
  Share2,
  Trash2,
  MoreVertical,
  Archive,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { DummyDocument, DummyDocumentCategory, DummyValidationStatus } from '@/lib/dummy-data/documents';

interface FileCardProps {
  document: DummyDocument;
  index?: number;
  onClick?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  onDelete?: () => void;
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

function getCategoryLabel(category: DummyDocumentCategory): string {
  const labels: Record<DummyDocumentCategory, string> = {
    pitch_deck: 'Pitch Deck',
    financial_model: 'Financials',
    cap_table: 'Cap Table',
    legal: 'Legal',
    data_room: 'Data Room',
    data_room_doc: 'Proof / Upload',
    other: 'Other',
  };
  return labels[category] ?? category;
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
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function FileCard({
  document: doc,
  index = 0,
  onClick,
  onDownload,
  onShare,
  onDelete,
}: FileCardProps) {
  const { icon: Icon, color, bg } = getFileIcon(doc.file_type);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ y: -2, boxShadow: '0 0 20px rgba(59,130,246,0.15)' }}
      onClick={onClick}
      className="glass-card p-4 cursor-pointer group hover:border-primary/30 transition-all duration-200"
    >
      {/* Top row: icon + actions */}
      <div className="flex items-start justify-between mb-3">
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', bg)}>
          <Icon className={cn('w-5 h-5', color)} />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            onClick={(e) => e.stopPropagation()}
            className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-muted transition-all"
          >
            <MoreVertical className="w-4 h-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-card border-border">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDownload?.();
              }}
              className="gap-2"
            >
              <Download className="w-4 h-4" /> Download
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onShare?.();
              }}
              className="gap-2"
            >
              <Share2 className="w-4 h-4" /> Share
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.();
              }}
              className="gap-2 text-red-400 focus:text-red-400"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* File name */}
      <h3 className="text-sm font-medium text-foreground truncate mb-2" title={doc.name}>
        {doc.name}
      </h3>

      {/* Badges row */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-muted text-muted-foreground">
          {getCategoryLabel(doc.category)}
        </Badge>
        <Badge
          variant="outline"
          className={cn('text-[10px] px-1.5 py-0 capitalize', getValidationStyle(doc.validation_status))}
        >
          {doc.validation_status}
        </Badge>
      </div>

      {/* Meta row */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{formatDate(doc.uploaded_at)}</span>
        <span>{formatFileSize(doc.file_size)}</span>
      </div>
    </motion.div>
  );
}
