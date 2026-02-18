'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, File, X, CheckCircle, FileText, FileSpreadsheet, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadedFile {
  file: File;
  progress: number;
  done: boolean;
}

interface TaskFileUploadProps {
  onFileSelect?: (file: File) => void;
  className?: string;
}

function getFileIcon(type: string) {
  if (type.includes('pdf') || type.includes('document')) return FileText;
  if (type.includes('sheet') || type.includes('csv') || type.includes('excel')) return FileSpreadsheet;
  if (type.includes('image')) return ImageIcon;
  return File;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function TaskFileUpload({ onFileSelect, className }: TaskFileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      setUploadedFile({ file, progress: 0, done: false });
      onFileSelect?.(file);

      // Simulate upload progress
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 25 + 10;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          setUploadedFile((prev) => (prev ? { ...prev, progress: 100, done: true } : null));
        } else {
          setUploadedFile((prev) => (prev ? { ...prev, progress } : null));
        }
      }, 300);
    },
    [onFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const removeFile = () => {
    setUploadedFile(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const FileIcon = uploadedFile ? getFileIcon(uploadedFile.file.type) : File;

  return (
    <div className={cn('space-y-3', className)}>
      <AnimatePresence mode="wait">
        {!uploadedFile ? (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={cn(
              'relative flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed cursor-pointer transition-all',
              isDragOver
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50 bg-muted'
            )}
          >
            <div className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center transition-colors',
              isDragOver ? 'bg-primary/20' : 'bg-muted/50'
            )}>
              <Upload className={cn('w-6 h-6', isDragOver ? 'text-primary' : 'text-muted-foreground')} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                {isDragOver ? 'Drop your file here' : 'Drag & drop a file'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                or click to browse &middot; Any file type
              </p>
            </div>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={handleChange}
            />
          </motion.div>
        ) : (
          <motion.div
            key="file-preview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-4 rounded-xl bg-muted/60 border border-border"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
                <FileIcon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground truncate">
                    {uploadedFile.file.name}
                  </p>
                  <button
                    onClick={removeFile}
                    className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 ml-2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatFileSize(uploadedFile.file.size)}
                </p>
                {/* Progress bar */}
                <div className="mt-2 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                  <motion.div
                    className={cn(
                      'h-full rounded-full',
                      uploadedFile.done ? 'bg-score-excellent' : 'bg-primary'
                    )}
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadedFile.progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                {uploadedFile.done && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-1 mt-2 text-xs text-score-excellent"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Upload complete
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
