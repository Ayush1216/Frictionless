'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { MatchCard } from '@/components/matches/MatchCard';
import { MatchFilters, type MatchFilterValues } from '@/components/matches/MatchFilters';
import { dummyMatches } from '@/lib/dummy-data/matches';
import { dummyInvestors } from '@/lib/dummy-data/investors';

// Use NeuralPay's matches as the current startup
const STARTUP_ID = 'startup-neuralpay';

export default function MatchesPage() {
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

  // Apply filters
  const filteredMatches = useMemo(() => {
    let results = [...allMatches];

    // Score range
    results = results.filter(
      (m) => m.overall_score >= filters.scoreMin && m.overall_score <= filters.scoreMax
    );

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
      switch (filters.sortBy) {
        case 'score_desc':
          return b.overall_score - a.overall_score;
        case 'score_asc':
          return a.overall_score - b.overall_score;
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
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-electric-blue/10 border border-electric-blue/20">
            <Sparkles className="w-3.5 h-3.5 text-electric-blue" />
            <span className="text-xs font-semibold text-electric-blue">
              {newMatches.length} new
            </span>
          </div>
        )}
      </motion.div>

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
            className="text-sm font-display font-semibold text-electric-blue mb-3 flex items-center gap-2"
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
