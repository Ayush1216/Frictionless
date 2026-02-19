'use client';

import Link from 'next/link';
import Image from 'next/image';
import { slugFromName } from '@/lib/founder-utils';
import type { FounderProfile } from '@/lib/founder-utils';
import type { ExtractionData } from '@/lib/founder-profile-image-sync';

export type TeamMemberCardProps = {
  full_name?: string;
  title?: string;
  location?: string;
  profile_image_url?: string;
  linkedin_url?: string;
  /** Optional index for key when mapping */
  index?: number;
  /** Full founder object (optional) */
  founder?: FounderProfile;
  extraction?: ExtractionData | null;
  getToken?: () => Promise<string | null>;
  onImageSynced?: () => void;
  /** B3: Confidence 0–1 from person enrichment; show badge when present */
  confidence_score?: number;
  /** B3: Evidence links from grounding; show on hover */
  evidence_links?: Array<{ title?: string; url?: string }>;
};

/** First initial, or two initials if we have first + last (e.g. "Jesse Devlyn" -> "JD") */
function initials(name: string | undefined): string {
  if (!name?.trim()) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2);
  }
  return (parts[0][0] ?? '?').toUpperCase();
}

export function TeamMemberCard({
  full_name,
  title,
  location,
  linkedin_url,
  index,
  founder: founderProp,
  extraction,
  getToken,
  onImageSynced,
  confidence_score,
  evidence_links,
}: TeamMemberCardProps) {
  const slug = slugFromName(full_name);
  const initial = initials(full_name);

  return (
    <li
      className="fi-card-interactive overflow-hidden transition-all group"
      style={{ padding: 0 }}
    >
      <Link href={`/startup/founders/${slug}`} className="block p-3">
        <div className="flex gap-3">
          <div
            className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
            style={{
              background: 'rgba(16,185,129,0.1)',
              border: '1px solid rgba(16,185,129,0.25)',
              color: 'var(--fi-primary)',
            }}
          >
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--fi-text-primary)' }}>
              {full_name || 'Unknown'}
            </p>
            <p className="text-xs truncate" style={{ color: 'var(--fi-text-muted)' }}>{title || 'Team'}</p>
            {location && (
              <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--fi-text-muted)' }}>{location}</p>
            )}
            {confidence_score != null && confidence_score > 0 && (
              <span className="inline-flex items-center gap-1 mt-1 text-[10px]" style={{ color: 'var(--fi-primary)' }} title="Profile verification confidence">
                {(confidence_score * 100).toFixed(0)}% verified
              </span>
            )}
          </div>
          <div className="flex flex-col items-center gap-1 shrink-0 self-center">
            <span
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium"
              style={{ background: 'var(--fi-bg-secondary)', color: 'var(--fi-text-muted)' }}
            >
              <Image src="/ai-logo.png" alt="" width={14} height={14} className="w-3.5 h-3.5 object-contain shrink-0" />
              View
            </span>
          </div>
        </div>
      </Link>
    </li>
  );
}
