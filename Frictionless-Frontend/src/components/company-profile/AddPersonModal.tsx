'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LinkedInUrlInput } from '@/components/company-profile/LinkedInUrlInput';
import { Loader2, UserPlus } from 'lucide-react';
import { isValidPersonLinkedInUrl } from '@/lib/linkedin-url';

export type RoleType = 'Founder' | 'Leadership' | 'Other';

export type AddPersonModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (person: Record<string, unknown>, extractionData?: Record<string, unknown>, status?: string) => void;
  getToken: () => Promise<string | null>;
};

const ROLE_OPTIONS: { value: RoleType; label: string }[] = [
  { value: 'Founder', label: 'Founder' },
  { value: 'Leadership', label: 'Leadership' },
  { value: 'Other', label: 'Other' },
];

export function AddPersonModal({ open, onOpenChange, onSuccess, getToken }: AddPersonModalProps) {
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [roleType, setRoleType] = useState<RoleType>('Other');
  const [companyNameOverride, setCompanyNameOverride] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const url = linkedinUrl.trim();
    const { valid, message } = isValidPersonLinkedInUrl(url);
    if (!valid) {
      setError(message || 'Invalid LinkedIn URL');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        setError('Session expired. Please sign in again.');
        setLoading(false);
        return;
      }
      const res = await fetch('/api/team/add-from-linkedin', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          linkedin_url: url,
          role_type: roleType,
          company_name_override: companyNameOverride.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Failed to add team member');
        setLoading(false);
        return;
      }
      if (data.person) {
        onSuccess(data.person, data.extraction_data, data.status);
        onOpenChange(false);
        setLinkedinUrl('');
        setCompanyNameOverride('');
        setError(null);
      }
      setLoading(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setLoading(false);
    }
  };

  const canSubmit = linkedinUrl.trim().length > 0 && isValidPersonLinkedInUrl(linkedinUrl.trim()).valid && !loading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-obsidian-700 bg-obsidian-900">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <UserPlus className="w-5 h-5 text-electric-blue" />
            Add team member
          </DialogTitle>
          <DialogDescription>
            Paste a LinkedIn person profile URL to fetch and add them to Founders &amp; Team.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="linkedin-url" className="text-foreground">
              LinkedIn profile URL (required)
            </Label>
            <LinkedInUrlInput
              id="linkedin-url"
              value={linkedinUrl}
              onChange={setLinkedinUrl}
              placeholder="https://linkedin.com/in/username"
              className="bg-obsidian-800 border-obsidian-700"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role-type" className="text-foreground">
              Role type
            </Label>
            <select
              id="role-type"
              value={roleType}
              onChange={(e) => setRoleType(e.target.value as RoleType)}
              className="w-full rounded-lg border border-obsidian-700 bg-obsidian-800 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-electric-blue/50"
              disabled={loading}
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-override" className="text-foreground">
              Company name override (optional)
            </Label>
            <Input
              id="company-override"
              value={companyNameOverride}
              onChange={(e) => setCompanyNameOverride(e.target.value)}
              placeholder="Leave blank to use current company"
              className="bg-obsidian-800 border-obsidian-700"
              disabled={loading}
            />
          </div>
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400" role="alert">
              {error}
            </div>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="border-obsidian-600"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="bg-electric-blue hover:bg-electric-blue/90"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="ml-2">Fetching profile…</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span className="ml-2">Fetch &amp; Add</span>
              </>
            )}
          </Button>
          {error && (
            <Button type="button" variant="outline" onClick={handleSubmit} disabled={loading} className="border-red-500/50 text-red-400">
              Retry
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
