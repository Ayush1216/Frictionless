'use client';

import { FileCard } from './FileCard';
import type { DummyDocument } from '@/lib/dummy-data/documents';

interface FileGridProps {
  documents: DummyDocument[];
  onFileClick?: (doc: DummyDocument) => void;
  onShare?: (doc: DummyDocument) => void;
}

export function FileGrid({ documents, onFileClick, onShare }: FileGridProps) {
  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-obsidian-800 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-muted-foreground text-sm">No documents found</p>
        <p className="text-muted-foreground/70 text-xs mt-1">Upload your first document to get started</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {documents.map((doc, i) => (
        <FileCard
          key={doc.id}
          document={doc}
          index={i}
          onClick={() => onFileClick?.(doc)}
          onShare={() => onShare?.(doc)}
        />
      ))}
    </div>
  );
}
