'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileDropzone } from '@/components/shared/FileDropzone';
import { useMediaQuery } from '@/lib/hooks/useMediaQuery';

interface UploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORIES = [
  { value: 'pitch_deck', label: 'Pitch Deck' },
  { value: 'financial_model', label: 'Financial Model' },
  { value: 'cap_table', label: 'Cap Table' },
  { value: 'legal', label: 'Legal' },
  { value: 'other', label: 'Other' },
];

function UploadContent() {
  const [category, setCategory] = useState('');
  const [aiAnalyze, setAiAnalyze] = useState(true);

  return (
    <div className="space-y-5">
      {/* Category selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Document Type</label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="bg-obsidian-800 border-obsidian-600">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent className="bg-obsidian-800 border-obsidian-600">
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Dropzone */}
      <FileDropzone
        accept=".pdf,.xlsx,.xls,.csv,.docx,.doc,.png,.jpg,.jpeg,.zip"
        multiple
        maxSize={50 * 1024 * 1024}
      />

      {/* AI analysis option */}
      <label className="flex items-center gap-3 p-3 rounded-lg bg-obsidian-800/60 border border-obsidian-600/50 cursor-pointer">
        <input
          type="checkbox"
          checked={aiAnalyze}
          onChange={(e) => setAiAnalyze(e.target.checked)}
          className="rounded border-obsidian-600 bg-obsidian-700 text-electric-blue focus:ring-electric-blue w-4 h-4"
        />
        <div className="flex items-center gap-2 flex-1">
          <Sparkles className="w-4 h-4 text-electric-purple shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">AI Analysis</p>
            <p className="text-xs text-muted-foreground">
              Automatically analyze documents for key insights
            </p>
          </div>
        </div>
      </label>
    </div>
  );
}

export function UploadModal({ open, onOpenChange }: UploadModalProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg bg-obsidian-800 border-obsidian-600">
          <DialogHeader>
            <DialogTitle className="font-display">Upload Documents</DialogTitle>
            <DialogDescription>
              Add files to your data room. Supported formats: PDF, XLSX, CSV, DOCX, Images, ZIP.
            </DialogDescription>
          </DialogHeader>
          <UploadContent />
          <DialogFooter>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button className="bg-electric-blue hover:bg-electric-blue/90">
              Upload Files
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
          <UploadContent />
        </div>
        <SheetFooter className="flex-row gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="flex-1 bg-electric-blue hover:bg-electric-blue/90">
            Upload Files
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
