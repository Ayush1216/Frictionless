'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, File, X, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface FileDropzoneProps {
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in bytes
  onUpload?: (files: File[]) => void;
  className?: string;
}

interface UploadedFile {
  file: File;
  progress: number;
  complete: boolean;
}

export function FileDropzone({
  accept,
  multiple = false,
  maxSize = 50 * 1024 * 1024, // 50MB default
  onUpload,
  className,
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const simulateUpload = useCallback(
    (files: File[]) => {
      const newFiles: UploadedFile[] = files.map((f) => ({
        file: f,
        progress: 0,
        complete: false,
      }));
      setUploadedFiles((prev) => [...prev, ...newFiles]);

      // Simulate progress for each file
      newFiles.forEach((uf, idx) => {
        const interval = setInterval(() => {
          setUploadedFiles((prev) =>
            prev.map((f) => {
              if (f.file === uf.file && !f.complete) {
                const next = Math.min(f.progress + Math.random() * 30, 100);
                return {
                  ...f,
                  progress: next,
                  complete: next >= 100,
                };
              }
              return f;
            })
          );
        }, 300 + idx * 100);

        setTimeout(
          () => {
            clearInterval(interval);
            setUploadedFiles((prev) =>
              prev.map((f) =>
                f.file === uf.file ? { ...f, progress: 100, complete: true } : f
              )
            );
          },
          2000 + idx * 500
        );
      });

      onUpload?.(files);
    },
    [onUpload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFiles = Array.from(e.dataTransfer.files).filter(
        (f) => f.size <= maxSize
      );
      if (droppedFiles.length) simulateUpload(droppedFiles);
    },
    [maxSize, simulateUpload]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(e.target.files ?? []).filter(
        (f) => f.size <= maxSize
      );
      if (selected.length) simulateUpload(selected);
      e.target.value = '';
    },
    [maxSize, simulateUpload]
  );

  const removeFile = (idx: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Drop zone */}
      <motion.div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className="relative flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed cursor-pointer transition-colors"
        style={{
          borderColor: isDragging ? 'var(--fi-primary)' : 'var(--fi-border)',
          background: isDragging ? 'rgba(16,185,129,0.08)' : 'var(--fi-bg-card)',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
          className="hidden"
        />
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center transition-colors"
          style={{ background: isDragging ? 'rgba(16,185,129,0.15)' : 'var(--fi-bg-tertiary)' }}
        >
          <Upload
            className="w-6 h-6 transition-colors"
            style={{ color: isDragging ? 'var(--fi-primary)' : 'var(--fi-text-muted)' }}
          />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium" style={{ color: 'var(--fi-text-primary)' }}>
            {isDragging ? 'Drop files here' : 'Drag & drop files here'}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--fi-text-muted)' }}>
            or click to browse &middot; Max {formatSize(maxSize)}
          </p>
        </div>
      </motion.div>

      {/* Uploaded files list */}
      <AnimatePresence>
        {uploadedFiles.map((uf, idx) => (
          <motion.div
            key={`${uf.file.name}-${idx}`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-3 p-3 rounded-lg"
            style={{ background: 'var(--fi-bg-secondary)', border: '1px solid var(--fi-border)' }}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--fi-bg-tertiary)' }}>
              {uf.complete ? (
                <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--fi-score-excellent)' }} />
              ) : (
                <File className="w-4 h-4" style={{ color: 'var(--fi-text-muted)' }} />
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-sm text-foreground truncate">{uf.file.name}</p>
              {!uf.complete && (
                <Progress value={uf.progress} className="h-1" />
              )}
              {uf.complete && (
                <p className="text-xs text-muted-foreground">
                  {formatSize(uf.file.size)} &middot; Uploaded
                </p>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeFile(idx);
              }}
              className="shrink-0 p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
