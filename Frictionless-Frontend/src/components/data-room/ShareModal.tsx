'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link2, Copy, Check, Globe, Eye, Download as DownloadIcon, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName?: string;
}

export function ShareModal({ open, onOpenChange, fileName }: ShareModalProps) {
  const [sharingEnabled, setSharingEnabled] = useState(false);
  const [accessLevel, setAccessLevel] = useState('view');
  const [expiration, setExpiration] = useState('7d');
  const [copied, setCopied] = useState(false);

  const shareLink = 'https://app.frictionless.ai/share/abc123xyz';

  const handleCopy = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-obsidian-800 border-obsidian-600">
        <DialogHeader>
          <DialogTitle className="font-display">Share Settings</DialogTitle>
          <DialogDescription>
            {fileName ? `Configure sharing for "${fileName}"` : 'Configure document sharing'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Enable sharing toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-obsidian-900/50 border border-obsidian-600/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-electric-blue/10 flex items-center justify-center">
                <Globe className="w-4 h-4 text-electric-blue" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Enable Sharing</p>
                <p className="text-xs text-muted-foreground">Generate a shareable link</p>
              </div>
            </div>
            <Switch checked={sharingEnabled} onCheckedChange={setSharingEnabled} />
          </div>

          {sharingEnabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              {/* Share link */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Link2 className="w-4 h-4" /> Share Link
                </label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={shareLink}
                    className="bg-obsidian-900 border-obsidian-600 text-xs font-mono"
                  />
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={handleCopy}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-score-excellent" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Access control */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  {accessLevel === 'view' ? (
                    <Eye className="w-4 h-4" />
                  ) : (
                    <DownloadIcon className="w-4 h-4" />
                  )}{' '}
                  Access Level
                </label>
                <Select value={accessLevel} onValueChange={setAccessLevel}>
                  <SelectTrigger className="bg-obsidian-900 border-obsidian-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-obsidian-800 border-obsidian-600">
                    <SelectItem value="view">View Only</SelectItem>
                    <SelectItem value="download">Download Allowed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Expiration */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Expires After
                </label>
                <Select value={expiration} onValueChange={setExpiration}>
                  <SelectTrigger className="bg-obsidian-900 border-obsidian-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-obsidian-800 border-obsidian-600">
                    <SelectItem value="1d">1 Day</SelectItem>
                    <SelectItem value="7d">7 Days</SelectItem>
                    <SelectItem value="30d">30 Days</SelectItem>
                    <SelectItem value="90d">90 Days</SelectItem>
                    <SelectItem value="never">Never</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
