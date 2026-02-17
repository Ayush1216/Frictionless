/**
 * Founder / leadership profile types and slug utilities.
 * Matches data from startup_extraction_results.founder_linkedin.data
 */

export type EducationEntry = {
  degree?: string;
  field_of_study?: string;
  university?: string;
  start_year?: string;
  end_year?: string;
};

export type WorkExperienceEntry = {
  company?: string;
  position?: string;
  start_year?: string;
  end_year?: string;
  is_current?: string;
};

export type FounderProfile = {
  full_name?: string;
  first_name?: string;
  last_name?: string;
  title?: string;
  summary?: string;
  location?: string;
  linkedin_url?: string;
  profile_image_url?: string;
  profile_image_source?: string;
  profile_image_synced_at?: string;
  role_type?: string;
  education?: EducationEntry[];
  work_experience?: WorkExperienceEntry[];
};

/** Generate URL-safe slug from full name (e.g. "Jesse Devlyn Jr." → "jesse-devlyn-jr") */
export function slugFromName(fullName: string | undefined): string {
  if (!fullName || typeof fullName !== 'string') return 'unknown';
  return fullName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'unknown';
}

/** Find a person in founders + leadership list by slug */
export function findPersonBySlug(
  founders: FounderProfile[],
  leadership: FounderProfile[],
  slug: string
): FounderProfile | null {
  const all = [...founders, ...leadership];
  const normalized = slug.toLowerCase().trim();
  const found = all.find((p) => slugFromName(p.full_name) === normalized);
  return found ?? null;
}

/** Deduplicate by full_name or linkedin_url */
export function dedupeTeam(founders: FounderProfile[], leadership: FounderProfile[]): FounderProfile[] {
  const seen = new Set<string>();
  const result: FounderProfile[] = [];
  for (const p of [...founders, ...leadership]) {
    const key = (p.full_name || '').trim() || (p.linkedin_url || '').trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(p);
  }
  return result;
}

/** Current roles (is_current or end_year empty/Present) */
export function getCurrentRoles(work: WorkExperienceEntry[] | undefined): WorkExperienceEntry[] {
  if (!work?.length) return [];
  return work.filter(
    (e) =>
      String(e.is_current || '').toLowerCase() === 'present' ||
      String(e.end_year || '').toLowerCase() === 'present' ||
      !e.end_year
  );
}

/** Past roles */
export function getPastRoles(work: WorkExperienceEntry[] | undefined): WorkExperienceEntry[] {
  if (!work?.length) return [];
  return work.filter(
    (e) =>
      String(e.is_current || '').toLowerCase() !== 'present' &&
      String(e.end_year || '').toLowerCase() !== 'present' &&
      !!e.end_year
  );
}
