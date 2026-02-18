'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Award,
  Briefcase,
  Building2,
  GraduationCap,
  Linkedin,
  Loader2,
  MapPin,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  slugFromName,
  findPersonBySlug,
  getCurrentRoles,
  getPastRoles,
  type FounderProfile,
  type EducationEntry,
  type WorkExperienceEntry,
} from '@/lib/founder-utils';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/auth-store';
import type { ExtractionData } from '@/lib/founder-profile-image-sync';

type FounderInsights = {
  executiveSnapshot: string | null;
  careerArc: string | null;
  strategicFitChips: string[];
  whatTheyBuilt: {
    venturesCount?: number;
    sectors?: string[];
    yearsExperience?: number;
    notableCompanies?: string[];
  } | null;
};

function SkeletonLine({ className = '' }: { className?: string }) {
  return <div className={`h-4 rounded bg-muted/50 animate-pulse ${className}`} />;
}

function FounderProfileSkeleton() {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      <div className="flex items-center gap-4">
        <div className="w-24 h-24 rounded-full bg-muted/50 animate-pulse" />
        <div className="space-y-2 flex-1">
          <SkeletonLine className="w-48 h-7" />
          <SkeletonLine className="w-36 h-5" />
          <SkeletonLine className="w-40 h-4" />
        </div>
      </div>
      <div className="space-y-4">
        <SkeletonLine className="w-24 h-5" />
        <SkeletonLine className="w-full" />
        <SkeletonLine className="w-full" />
        <SkeletonLine className="w-3/4" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="h-48 rounded-2xl bg-muted/30 animate-pulse" />
        <div className="h-48 rounded-2xl bg-muted/30 animate-pulse" />
      </div>
    </div>
  );
}

export default function FounderProfilePage() {
  const params = useParams();
  const slug = typeof params?.slug === 'string' ? params.slug : '';
  const user = useAuthStore((s) => s.user);
  const [person, setPerson] = useState<FounderProfile | null>(null);
  const [extraction, setExtraction] = useState<ExtractionData | null>(null);
  const [companyName, setCompanyName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [insights, setInsights] = useState<FounderInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  const getToken = useCallback(async () => {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token ?? null;
  }, []);

  useEffect(() => {
    if (!user || user.org_type !== 'startup' || !slug) {
      if (!slug) setNotFound(true);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      const token = await getToken();
      if (!token || cancelled) return;
      const res = await fetch('/api/company-profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (cancelled) return;

      const founders = data.extraction?.founder_linkedin?.data?.founders ?? [];
      const leadership = data.extraction?.founder_linkedin?.data?.leadership_team ?? [];
      const found = findPersonBySlug(founders, leadership, slug);

      if (cancelled) return;
      if (!found) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setPerson(found);
      if (data.extraction && typeof data.extraction === 'object') {
        setExtraction(data.extraction as ExtractionData);
      }
      const name = data.extraction?.meta?.company_name
        || data.extraction?.startup_kv?.initial_details?.name
        || data.extraction?.charts?.startup_name
        || '';
      setCompanyName(name);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user, slug, getToken]);

  useEffect(() => {
    if (!person || insightsLoading) return;
    setInsightsLoading(true);
    getToken().then((token) => {
      if (!token) return;
      fetch('/api/founder-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ person }),
      })
        .then((r) => r.json())
        .then((d) => setInsights(d))
        .catch(() => setInsights(null))
        .finally(() => setInsightsLoading(false));
    });
  }, [person, getToken]);

  useEffect(() => {
    if (person?.full_name) {
      document.title = `${person.full_name} | Founder Profile`;
    }
  }, [person?.full_name]);

  if (!user || user.org_type !== 'startup') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-muted-foreground">Founder profiles are available for startups.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center py-12">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground">Loading profile…</p>
        <div className="mt-8 w-full max-w-4xl">
          <FounderProfileSkeleton />
        </div>
      </div>
    );
  }

  if (notFound || !person) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4">
        <h1 className="text-xl font-semibold text-foreground">Profile not found</h1>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          This founder or team member may have been removed or the link is invalid.
        </p>
        <Link href="/startup/company-profile">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Company Profile
          </Button>
        </Link>
      </div>
    );
  }

  const currentRoles = getCurrentRoles(person.work_experience);
  const pastRoles = getPastRoles(person.work_experience);
  const education = person.education ?? [];
  const work = person.work_experience ?? [];
  const displayName = person.full_name || [person.first_name, person.last_name].filter(Boolean).join(' ') || 'Team member';
  const initial = (person.full_name || '?').trim()[0]?.toUpperCase() || '?';
  const initialsTwo = (() => {
    const name = (person.full_name || '').trim();
    if (!name) return initial;
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2);
    return initial;
  })();
  const hasStructuredData = person.summary || work.length > 0 || education.length > 0;

  return (
    <div className="w-full min-w-0 px-4 sm:px-6 lg:px-8 xl:px-10 max-w-[1200px] mx-auto pb-16">
      <Link
        href="/startup/company-profile"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Company Profile
      </Link>

      {/* Hero */}
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-primary/15 via-muted/80 to-background border border-primary/20 p-8 sm:p-10 md:p-12"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.15),transparent)]" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-8">
          <div className="shrink-0 w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 border-2 border-primary/40 flex items-center justify-center text-primary font-bold text-4xl sm:text-5xl shadow-lg">
            {initialsTwo}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-foreground tracking-tight">
              {displayName}
            </h1>
            <p className="text-lg text-primary font-medium mt-1">
              {person.title || 'Leadership'}
              {companyName ? ` · ${companyName}` : ''}
            </p>
            {person.location && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                <MapPin className="w-4 h-4 shrink-0" />
                {person.location}
              </p>
            )}
            {person.linkedin_url && (
              <a
                href={person.linkedin_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/80 hover:bg-primary/20 border border-border hover:border-primary/40 text-sm font-medium text-foreground transition-colors mt-4"
              >
                <Linkedin className="w-5 h-5 text-[#0A66C2]" />
                View LinkedIn profile
              </a>
            )}
          </div>
        </div>
      </motion.header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-10">
        <div className="lg:col-span-2 space-y-10">
          {/* About */}
          {(person.summary || insights?.executiveSnapshot) && (
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card rounded-2xl p-6 sm:p-8"
            >
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-primary" />
                About
              </h2>
              {person.summary && (
                <p className="text-sm sm:text-base text-foreground/90 leading-relaxed whitespace-pre-wrap">
                  {person.summary}
                </p>
              )}
              {insights?.executiveSnapshot && (
                <div className="mt-6 pt-6 border-t border-border/60">
                  <p className="text-xs font-semibold text-primary/90 uppercase tracking-wider mb-2">
                    Executive snapshot
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed italic">
                    &quot;{insights.executiveSnapshot}&quot;
                  </p>
                </div>
              )}
            </motion.section>
          )}

          {/* Career Journey / Timeline */}
          {work.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card rounded-2xl p-6 sm:p-8"
            >
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-6">
                <Briefcase className="w-5 h-5 text-amber-500" />
                Career journey
              </h2>
              <div className="relative">
                <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-primary/40 via-border to-transparent" />
                <ul className="space-y-0 list-none p-0 m-0">
                  {work.map((entry: WorkExperienceEntry, i: number) => (
                    <li key={i} className="relative flex gap-6 pb-8 last:pb-0">
                      <div className="relative z-10 shrink-0 w-6 h-6 rounded-full bg-muted border-2 border-primary/50 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      </div>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <p className="text-sm font-semibold text-foreground">
                          {entry.position || 'Role'}
                        </p>
                        <p className="text-sm text-primary/90 font-medium">
                          {entry.company || 'Company'}
                        </p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                          {entry.start_year && <span>{entry.start_year}</span>}
                          {entry.end_year && <span>– {entry.end_year}</span>}
                          {(entry.is_current || entry.end_year?.toLowerCase() === 'present') && (
                            <span className="text-emerald-500 font-medium">Current</span>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              {insights?.careerArc && (
                <div className="mt-8 pt-6 border-t border-border/60">
                  <p className="text-xs font-semibold text-amber-500/90 uppercase tracking-wider mb-2">
                    Career arc
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {insights.careerArc}
                  </p>
                </div>
              )}
            </motion.section>
          )}

          {/* Education */}
          {education.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="glass-card rounded-2xl p-6 sm:p-8"
            >
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-6">
                <GraduationCap className="w-5 h-5 text-indigo-400" />
                Education
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {education.map((edu: EducationEntry, i: number) => (
                  <div
                    key={i}
                    className="p-4 rounded-xl bg-muted/40 border border-border/50 hover:border-border transition-colors"
                  >
                    <p className="text-sm font-semibold text-foreground">
                      {edu.degree || 'Degree'}
                      {edu.field_of_study ? `, ${edu.field_of_study}` : ''}
                    </p>
                    <p className="text-sm text-primary/90 mt-1">{edu.university || '—'}</p>
                    <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                      {edu.start_year && <span>{edu.start_year}</span>}
                      {edu.end_year && <span>– {edu.end_year}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>
          )}
        </div>

        <div className="space-y-8">
          {/* Current & Past roles cards */}
          {(currentRoles.length > 0 || pastRoles.length > 0) && (
            <motion.section
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="space-y-6"
            >
              {currentRoles.length > 0 && (
                <div className="glass-card rounded-2xl p-6">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    Current roles
                  </h3>
                  <ul className="space-y-3 list-none p-0 m-0">
                    {currentRoles.map((e: WorkExperienceEntry, i: number) => (
                      <li key={i} className="flex flex-col gap-0.5 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <span className="text-sm font-medium text-foreground">{e.position || '—'}</span>
                        <span className="text-xs text-muted-foreground">{e.company || '—'}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {pastRoles.length > 0 && (
                <div className="glass-card rounded-2xl p-6">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    Past roles
                  </h3>
                  <ul className="space-y-3 list-none p-0 m-0">
                    {pastRoles.slice(0, 6).map((e: WorkExperienceEntry, i: number) => (
                      <li key={i} className="flex flex-col gap-0.5 p-3 rounded-lg bg-muted/40 border border-border/50">
                        <span className="text-sm font-medium text-foreground">{e.position || '—'}</span>
                        <span className="text-xs text-muted-foreground">{e.company || '—'}</span>
                        {(e.start_year || e.end_year) && (
                          <span className="text-[10px] text-muted-foreground">
                            {[e.start_year, e.end_year].filter(Boolean).join(' – ')}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.section>
          )}

          {/* What they've built / stats */}
          {(insights?.whatTheyBuilt || insights?.strategicFitChips?.length) && (
            <motion.section
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card rounded-2xl p-6 space-y-6"
            >
              {insights?.whatTheyBuilt && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                    <Award className="w-4 h-4 text-primary" />
                    At a glance
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {typeof insights.whatTheyBuilt.venturesCount === 'number' && (
                      <div className="p-3 rounded-xl bg-muted/50 border border-border/50">
                        <p className="text-2xl font-bold text-primary">{insights.whatTheyBuilt.venturesCount}</p>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Ventures</p>
                      </div>
                    )}
                    {typeof insights.whatTheyBuilt.yearsExperience === 'number' && (
                      <div className="p-3 rounded-xl bg-muted/50 border border-border/50">
                        <p className="text-2xl font-bold text-primary">{insights.whatTheyBuilt.yearsExperience}</p>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Years exp.</p>
                      </div>
                    )}
                  </div>
                  {insights.whatTheyBuilt.notableCompanies?.length ? (
                    <p className="text-xs text-muted-foreground mt-3">
                      Notable: {insights.whatTheyBuilt.notableCompanies.slice(0, 4).join(', ')}
                    </p>
                  ) : null}
                </div>
              )}
              {insights?.strategicFitChips?.length ? (
                <div>
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                    <Target className="w-4 h-4 text-amber-500" />
                    Strategic fit
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {insights.strategicFitChips.map((chip: string, i: number) => (
                      <span
                        key={i}
                        className="px-3 py-1 rounded-full text-xs font-medium bg-amber-500/15 text-amber-200 border border-amber-500/30"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </motion.section>
          )}

          {insightsLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating insights…
            </div>
          )}

          {!hasStructuredData && !insightsLoading && (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-center">
              <p className="text-xs text-muted-foreground">
                More profile details will appear here as they’re available from LinkedIn or your company data.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
