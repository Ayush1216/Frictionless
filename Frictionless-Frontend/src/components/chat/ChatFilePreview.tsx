'use client';

import { motion } from 'framer-motion';
import { FileText, Image as ImageIcon, File, X, Loader2, CheckCircle2 } from 'lucide-react';
import type { ChatAttachment } from '@/types/database';

interface ChatFilePreviewProps {
  attachment: ChatAttachment;
  onRemove?: () => void;
  compact?: boolean;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return ImageIcon;
  if (mimeType === 'application/pdf') return FileText;
  return File;
}

function formatSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ChatFilePreview({ attachment, onRemove, compact }: ChatFilePreviewProps) {
  const Icon = getFileIcon(attachment.mime_type);
  const isUploading = attachment.status === 'uploading';
  const isProcessing = attachment.status === 'processing';
  const isReady = attachment.status === 'ready' || !attachment.status;

  if (compact) {
    return (
      <div
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px]"
        style={{
          background: 'var(--fi-bg-tertiary)',
          border: '1px solid var(--fi-border)',
          color: 'var(--fi-text-secondary)',
        }}
      >
        <Icon className="w-3 h-3" />
        <span className="truncate max-w-[120px]">{attachment.name}</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-3 px-3 py-2 rounded-lg"
      style={{
        background: 'var(--fi-bg-secondary)',
        border: '1px solid var(--fi-border)',
      }}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{
          background: isUploading
            ? 'rgba(234,179,8,0.1)'
            : isProcessing
            ? 'rgba(139,92,246,0.1)'
            : 'rgba(16,185,129,0.1)',
        }}
      >
        {isUploading ? (
          <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--fi-score-good)' }} />
        ) : isProcessing ? (
          <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'rgb(139,92,246)' }} />
        ) : (
          <Icon className="w-4 h-4" style={{ color: 'var(--fi-primary)' }} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate" style={{ color: 'var(--fi-text-primary)' }}>
          {attachment.name}
        </p>
        <p className="text-[10px]" style={{ color: 'var(--fi-text-muted)' }}>
          {isUploading
            ? 'Uploading...'
            : isProcessing
            ? 'Processing & analyzing...'
            : formatSize(attachment.file_size)}
        </p>
      </div>
      {isReady && (
        <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: 'var(--fi-primary)' }} />
      )}
      {onRemove && (
        <button
          onClick={onRemove}
          className="p-1 rounded-md shrink-0 transition-colors"
          style={{ color: 'var(--fi-text-muted)' }}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </motion.div>
  );
}
