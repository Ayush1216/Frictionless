'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link2, Copy, Check, Globe, Eye, Download as DownloadIcon, Calendar, Loader2, RefreshCw } from 'lucide-react';
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
import { toast } from 'sonner';

interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName?: string;
  /** H1/H2: getToken for API auth */
  getToken?: () => Promise<string | null>;
  /** Share type: data_room or company_profile or readiness_report */
  shareType?: 'data_room' | 'company_profile' | 'readiness_report';
}

const EXPIRY_MAP: Record<string, number> = {
  '1d': 24,
  '7d': 168,
  '30d': 720,
  '90d': 2160,
  never: 0,
};

export function ShareModal({ open, onOpenChange, fileName, getToken, shareType = 'data_room' }: ShareModalProps) {
  const [sharingEnabled, setSharingEnabled] = useState(false);
  const [accessLevel, setAccessLevel] = useState('view');
  const [expiration, setExpiration] = useState('7d');
  const [copied, setCopied] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const attemptRef = useRef(0);

  useEffect(() => {
    if (!open) {
      setShareLink(null);
      setSharingEnabled(false);
      setCreating(false);
      setError(null);
    }
  }, [open]);

  const createShareLink = useCallback(async () => {
    if (!getToken || creating) return;

    setCreating(true);
    setError(null);
    attemptRef.current += 1;
    const currentAttempt = attemptRef.current;

    try {
      const token = await getToken();
      if (!token) {
        setError('Not authenticated. Please sign in and try again.');
        setCreating(false);
        return;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const res = await fetch('/api/share/create', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          share_type: shareType,
          expires_hours: EXPIRY_MAP[expiration] || 168,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (currentAttempt !== attemptRef.current) return;

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to create share link' }));
        setError(data.error || `Server error (${res.status})`);
        toast.error(data.error || 'Failed to create share link');
        return;
      }

      const data = await res.json();
      if (data.url) {
        setShareLink(data.url);
      } else {
        setError('No URL returned from server');
      }
    } catch (e) {
      if (currentAttempt !== attemptRef.current) return;
      const msg = e instanceof Error && e.name === 'AbortError'
        ? 'Request timed out. Please try again.'
        : 'Failed to create share link. Please try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      if (currentAttempt === attemptRef.current) {
        setCreating(false);
      }
    }
  }, [getToken, shareType, expiration, creating]);

  // Auto-create when sharing is enabled
  useEffect(() => {
    if (open && sharingEnabled && !shareLink && !creating && !error) {
      createShareLink();
    }
  }, [open, sharingEnabled, shareLink, creating, error, createShareLink]);

  const displayLink = shareLink || (creating ? '' : error || 'Enable sharing to generate link');

  const handleCopy = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display">Share Settings</DialogTitle>
          <DialogDescription>
            {fileName ? `Configure sharing for "${fileName}"` : 'Configure document sharing'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Enable sharing toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Globe className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Enable Sharing</p>
                <p className="text-xs text-muted-foreground">Generate a shareable link</p>
              </div>
            </div>
            <Switch checked={sharingEnabled} onCheckedChange={(val) => {
              setSharingEnabled(val);
              if (val) {
                setError(null);
                setShareLink(null);
              }
            }} />
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
                    value={creating ? 'Generating link...' : displayLink}
                    className={`bg-muted border-input text-xs font-mono ${error ? 'border-destructive/50 text-destructive' : ''}`}
                  />
                  {shareLink ? (
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
                  ) : (
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={() => { setError(null); createShareLink(); }}
                      disabled={creating}
                      className="shrink-0"
                    >
                      {creating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                </div>
                {error && (
                  <p className="text-[10px] text-destructive">{error}</p>
                )}
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
                  <SelectTrigger className="bg-muted border-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
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
                  <SelectTrigger className="bg-muted border-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
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
