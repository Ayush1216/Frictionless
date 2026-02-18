'use client';

import { useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, GitCompareArrows, Star, X, CheckCircle2 } from 'lucide-react';
import { MatchCard } from '@/components/matches/MatchCard';
import { MatchFilters, type MatchFilterValues } from '@/components/matches/MatchFilters';
import { dummyMatches } from '@/lib/dummy-data/matches';
import { dummyInvestors } from '@/lib/dummy-data/investors';
import { getFallbackScore } from '@/lib/investor-score-fallback';
import { cn } from '@/lib/utils';

// Use NeuralPay's matches as the current startup
const STARTUP_ID = 'startup-neuralpay';

export default function MatchesPage() {
  const [shortlist, setShortlist] = useState<Set<string>>(new Set());
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [showShortlist, setShowShortlist] = useState(false);

  const toggleShortlist = useCallback((matchId: string) => {
    setShortlist((prev) => {
      const next = new Set(prev);
      if (next.has(matchId)) next.delete(matchId);
      else next.add(matchId);
      return next;
    });
  }, []);

  const toggleCompare = useCallback((matchId: string) => {
    setCompareIds((prev) => {
      if (prev.includes(matchId)) return prev.filter((id) => id !== matchId);
      if (prev.length >= 4) return prev;
      return [...prev, matchId];
    });
  }, []);

  const [filters, setFilters] = useState<MatchFilterValues>({
    scoreMin: 0,
    scoreMax: 100,
    stages: [],
    sectors: [],
    status: 'all',
    sortBy: 'score_desc',
  });

  // All matches for current startup
  const allMatches = useMemo(
    () => dummyMatches.filter((m) => m.startup_org_id === STARTUP_ID),
    []
  );

  // Build investor map
  const investorMap = useMemo(() => {
    const map = new Map<string, (typeof dummyInvestors)[number]>();
    dummyInvestors.forEach((inv) => map.set(inv.org_id, inv));
    return map;
  }, []);

  // Effective score: real score or I3 fallback 60–90
  const getEffectiveScore = (m: (typeof allMatches)[number]) => {
    if (m.overall_score != null && !Number.isNaN(m.overall_score)) return m.overall_score;
    const inv = investorMap.get(m.capital_provider_org_id);
    return getFallbackScore(m.capital_provider_org_id, inv?.org?.website);
  };

  // Apply filters
  const filteredMatches = useMemo(() => {
    let results = [...allMatches];

    // Score range (use effective score)
    results = results.filter((m) => {
      const score = getEffectiveScore(m);
      return score >= filters.scoreMin && score <= filters.scoreMax;
    });

    // Status
    if (filters.status !== 'all') {
      results = results.filter((m) => m.status === filters.status);
    }

    // Stage filter - check investor preferred stages
    if (filters.stages.length > 0) {
      results = results.filter((m) => {
        const inv = investorMap.get(m.capital_provider_org_id);
        if (!inv) return false;
        return filters.stages.some((s) => inv.preferred_stages.includes(s));
      });
    }

    // Sort
    results.sort((a, b) => {
      const scoreA = getEffectiveScore(a);
      const scoreB = getEffectiveScore(b);
      switch (filters.sortBy) {
        case 'score_desc':
          return scoreB - scoreA;
        case 'score_asc':
          return scoreA - scoreB;
        case 'date_desc':
          return new Date(b.match_date).getTime() - new Date(a.match_date).getTime();
        case 'date_asc':
          return new Date(a.match_date).getTime() - new Date(b.match_date).getTime();
        case 'name_asc': {
          const nameA = investorMap.get(a.capital_provider_org_id)?.org.name ?? '';
          const nameB = investorMap.get(b.capital_provider_org_id)?.org.name ?? '';
          return nameA.localeCompare(nameB);
        }
        default:
          return 0;
      }
    });

    return results;
  }, [allMatches, filters, investorMap]);

  // Separate new matches
  const newMatches = filteredMatches.filter((m) => m.status === 'new');
  const otherMatches = filteredMatches.filter((m) => m.status !== 'new');

  return (
    <div className="p-4 lg:p-8 space-y-6 pb-24 lg:pb-8">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-start justify-between"
      >
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
            Investor Matches
          </h1>
          <p className="text-muted-foreground mt-1">
            {allMatches.length} matches found based on your profile
          </p>
        </div>
        {newMatches.length > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary">
              {newMatches.length} new
            </span>
          </div>
        )}
      </motion.div>

      {/* Action bar: Shortlist + Compare */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setShowShortlist(!showShortlist)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors border',
            showShortlist ? 'bg-accent/10 text-accent border-accent/30' : 'bg-muted text-muted-foreground border-border hover:text-foreground'
          )}
        >
          <Star className="w-3.5 h-3.5" />
          Shortlist ({shortlist.size})
        </button>
        <button
          onClick={() => setShowCompare(!showCompare)}
          disabled={compareIds.length < 2}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors border',
            showCompare && compareIds.length >= 2 ? 'bg-primary/10 text-primary border-primary/30' : 'bg-muted text-muted-foreground border-border hover:text-foreground',
            compareIds.length < 2 && 'opacity-50 cursor-not-allowed'
          )}
        >
          <GitCompareArrows className="w-3.5 h-3.5" />
          Compare ({compareIds.length}/4)
        </button>
        {compareIds.length > 0 && (
          <button onClick={() => { setCompareIds([]); setShowCompare(false); }} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Clear compare
          </button>
        )}
      </div>

      {/* Compare view (side-by-side) */}
      <AnimatePresence>
        {showCompare && compareIds.length >= 2 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="glass-card p-5 mb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <GitCompareArrows className="w-4 h-4 text-primary" /> Comparing {compareIds.length} Investors
                </h3>
                <button onClick={() => setShowCompare(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
              </div>
              <div className={cn('grid gap-4', compareIds.length === 2 ? 'grid-cols-2' : compareIds.length === 3 ? 'grid-cols-3' : 'grid-cols-4')}>
                {compareIds.map((id) => {
                  const match = allMatches.find((m) => m.id === id);
                  const inv = match ? investorMap.get(match.capital_provider_org_id) : null;
                  if (!match || !inv) return null;
                  const score = getEffectiveScore(match);
                  return (
                    <div key={id} className="p-4 rounded-xl border border-border bg-muted/30 space-y-2">
                      <p className="text-sm font-semibold text-foreground truncate">{inv.org.name}</p>
                      <div className="text-2xl font-display font-bold text-foreground">{score}</div>
                      {match.breakdown?.map((b) => (
                        <div key={b.dimension} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground capitalize">{b.dimension.replace(/_/g, ' ')}</span>
                          <span className={cn('font-semibold', b.score >= 80 ? 'text-score-excellent' : b.score >= 60 ? 'text-score-good' : 'text-score-fair')}>{b.score}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shortlist view */}
      <AnimatePresence>
        {showShortlist && shortlist.size > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="glass-card p-5 mb-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                <Star className="w-4 h-4 text-accent" /> Shortlisted ({shortlist.size})
              </h3>
              <div className="flex flex-wrap gap-2">
                {Array.from(shortlist).map((id) => {
                  const match = allMatches.find((m) => m.id === id);
                  const inv = match ? investorMap.get(match.capital_provider_org_id) : null;
                  if (!inv) return null;
                  return (
                    <span key={id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-xs font-medium text-accent">
                      {inv.org.name}
                      <button onClick={() => toggleShortlist(id)}><X className="w-3 h-3" /></button>
                    </span>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <MatchFilters
        filters={filters}
        onChange={setFilters}
        totalCount={allMatches.length}
        filteredCount={filteredMatches.length}
      />

      {/* New matches section */}
      {newMatches.length > 0 && (
        <div>
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm font-display font-semibold text-primary mb-3 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            New Matches
          </motion.h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {newMatches.map((match, idx) => {
              const investor = investorMap.get(match.capital_provider_org_id);
              if (!investor) return null;
              return (
                <MatchCard
                  key={match.id}
                  match={match}
                  investor={investor}
                  index={idx}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* All other matches */}
      {otherMatches.length > 0 && (
        <div>
          {newMatches.length > 0 && (
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm font-display font-semibold text-muted-foreground mb-3"
            >
              All Matches
            </motion.h2>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {otherMatches.map((match, idx) => {
              const investor = investorMap.get(match.capital_provider_org_id);
              if (!investor) return null;
              return (
                <MatchCard
                  key={match.id}
                  match={match}
                  investor={investor}
                  index={idx + newMatches.length}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {filteredMatches.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-12 flex flex-col items-center text-center"
        >
          <p className="text-lg font-display font-semibold text-foreground mb-2">
            No matches found
          </p>
          <p className="text-sm text-muted-foreground">
            Try adjusting your filters to see more results.
          </p>
        </motion.div>
      )}
    </div>
  );
}
