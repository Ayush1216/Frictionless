'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Upload, Search, HardDrive, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileGrid } from '@/components/data-room/FileGrid';
import { FilePreview } from '@/components/data-room/FilePreview';
import { UploadModal } from '@/components/data-room/UploadModal';
import { ShareModal } from '@/components/data-room/ShareModal';
import { dummyDocuments, type DummyDocument, type DummyDocumentCategory } from '@/lib/dummy-data/documents';

type FilterTab = 'all' | DummyDocumentCategory;

const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pitch_deck', label: 'Pitch Decks' },
  { value: 'financial_model', label: 'Financials' },
  { value: 'legal', label: 'Legal' },
  { value: 'cap_table', label: 'Cap Tables' },
  { value: 'data_room', label: 'Data Room' },
  { value: 'other', label: 'Other' },
];

function formatStorageUsed(docs: DummyDocument[]): string {
  const total = docs.reduce((sum, d) => sum + d.file_size, 0);
  if (total < 1024 * 1024) return `${(total / 1024).toFixed(1)} KB`;
  if (total < 1024 * 1024 * 1024) return `${(total / (1024 * 1024)).toFixed(1)} MB`;
  return `${(total / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function DataRoomPage() {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DummyDocument | null>(null);
  const [shareDoc, setShareDoc] = useState<DummyDocument | null>(null);

  const filtered = useMemo(() => {
    let docs = dummyDocuments;
    if (activeTab !== 'all') {
      docs = docs.filter((d) => d.category === activeTab);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      docs = docs.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.uploaded_by.toLowerCase().includes(q)
      );
    }
    return docs;
  }, [activeTab, search]);

  const totalSize = formatStorageUsed(dummyDocuments);
  const storagePercent = Math.min(
    (dummyDocuments.reduce((s, d) => s + d.file_size, 0) / (1024 * 1024 * 100)) * 100,
    100
  );

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
            <FolderOpen className="w-7 h-7 text-electric-blue" />
            Data Room
          </h1>
          <p className="text-muted-foreground text-sm">
            {dummyDocuments.length} documents &middot; {totalSize} used
          </p>
        </div>
        <Button
          onClick={() => setUploadOpen(true)}
          className="gap-2 bg-electric-blue hover:bg-electric-blue/90 self-start sm:self-auto"
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
        <div className="h-2 rounded-full bg-obsidian-700/50 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-electric-blue to-electric-purple"
            initial={{ width: 0 }}
            animate={{ width: `${storagePercent}%` }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
          />
        </div>
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
            className="pl-9 bg-obsidian-800 border-obsidian-600"
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
                  ? 'bg-electric-blue text-white'
                  : 'bg-obsidian-800 text-muted-foreground hover:text-foreground hover:bg-obsidian-700'
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
      <UploadModal open={uploadOpen} onOpenChange={setUploadOpen} />
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
      />
    </div>
  );
}
