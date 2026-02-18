'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, Search, HardDrive, FolderOpen, Loader2, ShieldCheck, AlertTriangle, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileGrid } from '@/components/data-room/FileGrid';
import { FilePreview } from '@/components/data-room/FilePreview';
import { UploadModal } from '@/components/data-room/UploadModal';
import { ShareModal } from '@/components/data-room/ShareModal';
import { getAuthHeaders } from '@/lib/api/tasks';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase/client';
import type { DummyDocument, DummyDocumentCategory } from '@/lib/dummy-data/documents';

type FilterTab = 'all' | DummyDocumentCategory;

const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pitch_deck', label: 'Pitch Deck' },
  { value: 'data_room_doc', label: 'Proof / Uploads' },
  { value: 'other', label: 'Other' },
];

function formatStorageUsed(docs: DummyDocument[]): string {
  const total = docs.reduce((sum, d) => sum + d.file_size, 0);
  if (total < 1024 * 1024) return `${(total / 1024).toFixed(1)} KB`;
  if (total < 1024 * 1024 * 1024) return `${(total / (1024 * 1024)).toFixed(1)} MB`;
  return `${(total / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function DataRoomPage() {
  const [documents, setDocuments] = useState<DummyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DummyDocument | null>(null);
  const [shareDoc, setShareDoc] = useState<DummyDocument | null>(null);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/startup/data-room', { headers });
      const data = await res.json().catch(() => ({ documents: [] }));
      setDocuments(data.documents ?? []);
    } catch {
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleUploadComplete = useCallback(
    async (files: File[]) => {
      const headers = await getAuthHeaders();
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        await fetch('/api/startup/data-room/upload', {
          method: 'POST',
          headers,
          body: formData,
        });
      }
      await loadDocuments();
      setUploadOpen(false);
    },
    [loadDocuments]
  );

  const filtered = useMemo(() => {
    let docs = documents;
    if (activeTab !== 'all') {
      docs = docs.filter((d) => d.category === activeTab);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      docs = docs.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          (d.uploaded_by && d.uploaded_by.toLowerCase().includes(q))
      );
    }
    return docs;
  }, [documents, activeTab, search]);

  const totalSize = formatStorageUsed(documents);
  const storagePercent = Math.min(
    (documents.reduce((s, d) => s + d.file_size, 0) / (1024 * 1024 * 100)) * 100,
    100
  );

  // Diligence completeness — check for required doc types
  const REQUIRED_DOCS = ['Pitch Deck', 'Cap Table', 'Financial Model', 'Incorporation Docs', 'Term Sheet'];
  const uploadedDocNames = documents.map((d) => d.name.toLowerCase());
  const completedDocs = REQUIRED_DOCS.filter((req) =>
    uploadedDocNames.some((name) => name.includes(req.toLowerCase().split(' ')[0]))
  );
  const diligencePercent = Math.round((completedDocs.length / REQUIRED_DOCS.length) * 100);
  const missingDocs = REQUIRED_DOCS.filter((req) =>
    !uploadedDocNames.some((name) => name.includes(req.toLowerCase().split(' ')[0]))
  );

  // Avoid flash of empty state: show loading until first fetch completes
  if (loading) {
    return (
      <div className="p-4 lg:p-8 flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading data room…</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="space-y-1">
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground flex items-center gap-3">
            <FolderOpen className="w-7 h-7 text-primary" />
            Data Room
          </h1>
          <p className="text-muted-foreground text-sm">
            {documents.length} documents &middot; {totalSize} used
          </p>
        </div>
        <Button
          onClick={() => setUploadOpen(true)}
          className="gap-2 bg-primary hover:bg-primary/90 self-start sm:self-auto"
        >
          <Upload className="w-4 h-4" /> Upload
        </Button>
      </motion.div>

      {/* Storage indicator */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="glass-card p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <HardDrive className="w-4 h-4" />
            <span>Storage</span>
          </div>
          <span className="text-sm font-mono text-foreground">{totalSize} / 100 MB</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
            initial={{ width: 0 }}
            animate={{ width: `${storagePercent}%` }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
          />
        </div>
      </motion.div>

      {/* Diligence Completeness */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08 }}
        className="glass-card p-5"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className={cn('w-5 h-5', diligencePercent >= 80 ? 'text-score-excellent' : diligencePercent >= 50 ? 'text-score-good' : 'text-score-fair')} />
            <h3 className="text-sm font-semibold text-foreground">Diligence Completeness</h3>
          </div>
          <span className={cn('text-lg font-mono font-bold', diligencePercent >= 80 ? 'text-score-excellent' : diligencePercent >= 50 ? 'text-score-good' : 'text-score-fair')}>
            {diligencePercent}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden mb-3">
          <motion.div
            className={cn('h-full rounded-full', diligencePercent >= 80 ? 'bg-score-excellent' : diligencePercent >= 50 ? 'bg-score-good' : 'bg-score-fair')}
            initial={{ width: 0 }}
            animate={{ width: `${diligencePercent}%` }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.4 }}
          />
        </div>
        {missingDocs.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-score-fair" />
              Missing documents for investor diligence:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {missingDocs.map((doc) => (
                <span key={doc} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-muted border border-border text-muted-foreground">
                  {doc}
                </span>
              ))}
            </div>
          </div>
        )}
        {missingDocs.length === 0 && (
          <p className="text-xs text-score-excellent flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            All required diligence documents uploaded
          </p>
        )}
      </motion.div>

      {/* Search + Filters */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="space-y-3"
      >
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-muted border-border"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* File Grid */}
      <FileGrid
        documents={filtered}
        onFileClick={setPreviewDoc}
        onShare={setShareDoc}
      />

      {/* Modals */}
      <UploadModal
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUploadComplete={handleUploadComplete}
      />
      <FilePreview
        document={previewDoc}
        open={!!previewDoc}
        onOpenChange={(open) => !open && setPreviewDoc(null)}
        onShare={() => {
          if (previewDoc) {
            setShareDoc(previewDoc);
          }
        }}
      />
      <ShareModal
        open={!!shareDoc}
        onOpenChange={(open) => !open && setShareDoc(null)}
        fileName={shareDoc?.name}
        shareType="data_room"
        getToken={async () => {
          if (!supabase) return null;
          const { data } = await supabase.auth.getSession();
          return data?.session?.access_token ?? null;
        }}
      />
    </div>
  );
}
