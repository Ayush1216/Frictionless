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
}: TeamMemberCardProps) {
  const slug = slugFromName(full_name);
  const initial = initials(full_name);

  return (
    <li className="rounded-xl border border-obsidian-700/60 bg-obsidian-800/30 overflow-hidden hover:border-electric-blue/30 transition-all group">
      <Link href={`/startup/founders/${slug}`} className="block p-3">
        <div className="flex gap-3">
          <div className="shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-electric-blue/25 to-electric-blue/5 border border-electric-blue/30 flex items-center justify-center text-electric-blue font-bold text-sm group-hover:border-electric-blue/50">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate group-hover:text-electric-blue">
              {full_name || 'Unknown'}
            </p>
            <p className="text-xs text-muted-foreground truncate">{title || 'Team'}</p>
            {location && (
              <p className="text-[11px] text-obsidian-500 mt-0.5 truncate">{location}</p>
            )}
          </div>
          <div className="flex flex-col items-center gap-1 shrink-0 self-center">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-obsidian-700/80 text-muted-foreground group-hover:bg-electric-blue/20 group-hover:text-electric-blue">
              <Image src="/ai-logo.png" alt="" width={14} height={14} className="w-3.5 h-3.5 object-contain shrink-0" />
              View
            </span>
          </div>
        </div>
      </Link>
    </li>
  );
}
