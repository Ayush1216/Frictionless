'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, GraduationCap, Users, Search, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { dummyMentors } from '@/lib/dummy-data/mentors';
import { cn } from '@/lib/utils';

const ALL_EXPERTISE = Array.from(
  new Set(dummyMentors.flatMap((m) => m.expertise))
).sort();

export default function MentorsPage() {
  const [search, setSearch] = useState('');
  const [expertiseFilter, setExpertiseFilter] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = dummyMentors.filter((m) => {
    const matchesSearch =
      !search ||
      m.full_name.toLowerCase().includes(search.toLowerCase()) ||
      m.company.toLowerCase().includes(search.toLowerCase()) ||
      m.expertise.some((e) => e.toLowerCase().includes(search.toLowerCase()));
    const matchesExpertise =
      !expertiseFilter || m.expertise.includes(expertiseFilter);
    return matchesSearch && matchesExpertise;
  });

  return (
    <div className="p-4 lg:p-8 space-y-6 pb-24 lg:pb-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
            Mentors
          </h1>
          <p className="text-muted-foreground mt-1">
            {dummyMentors.length} mentor{dummyMentors.length !== 1 ? 's' : ''} in the network
          </p>
        </div>
        <Button className="gap-2 bg-electric-blue hover:bg-electric-blue/90 shrink-0">
          <Plus className="w-4 h-4" />
          Add Mentor
        </Button>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search mentors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-obsidian-800 border-obsidian-600"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {ALL_EXPERTISE.map((exp) => (
            <Badge
              key={exp}
              variant={expertiseFilter === exp ? 'default' : 'secondary'}
              className={cn(
                'cursor-pointer transition-colors',
                expertiseFilter === exp
                  ? 'bg-electric-blue text-white border-electric-blue'
                  : 'bg-obsidian-800 text-muted-foreground hover:text-foreground hover:bg-obsidian-700'
              )}
              onClick={() => setExpertiseFilter(expertiseFilter === exp ? null : exp)}
            >
              {exp}
            </Badge>
          ))}
        </div>
      </motion.div>

      {/* Mentor Grid */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {filtered.map((mentor, i) => (
          <motion.div
            key={mentor.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 + i * 0.03 }}
            className="glass-card overflow-hidden"
          >
            <div
              className="p-5 cursor-pointer"
              onClick={() => setExpandedId(expandedId === mentor.id ? null : mentor.id)}
            >
              <div className="flex items-start gap-4">
                <Avatar className="w-14 h-14 rounded-xl shrink-0">
                  <AvatarImage src={mentor.photo_url} alt={mentor.full_name} />
                  <AvatarFallback className="rounded-xl bg-electric-purple/20 text-electric-purple">
                    {mentor.full_name.split(' ').map((n) => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-display font-semibold text-foreground truncate">
                    {mentor.full_name}
                  </h2>
                  <p className="text-sm text-electric-purple truncate">
                    {mentor.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {mentor.company}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {mentor.expertise.slice(0, 3).map((e) => (
                      <Badge
                        key={e}
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 bg-electric-cyan/10 text-electric-cyan border-electric-cyan/20"
                      >
                        {e}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
                    <Users className="w-3.5 h-3.5" />
                    {mentor.assigned_startups_count} startup{mentor.assigned_startups_count !== 1 ? 's' : ''} assigned
                  </div>
                </div>
                <ChevronDown
                  className={cn(
                    'w-5 h-5 text-muted-foreground shrink-0 transition-transform',
                    expandedId === mentor.id && 'rotate-180'
                  )}
                />
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2 mt-3">
                {mentor.bio}
              </p>
            </div>

            <AnimatePresence>
              {expandedId === mentor.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden border-t border-obsidian-600/50"
                >
                  <div className="p-5 space-y-4">
                    <div>
                      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                        Full Bio
                      </h3>
                      <p className="text-sm text-foreground leading-relaxed">
                        {mentor.bio}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                        Expertise
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {mentor.expertise.map((e) => (
                          <Badge key={e} variant="secondary">
                            {e}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline" className="gap-2">
                        <GraduationCap className="w-4 h-4" />
                        View Assignments
                      </Button>
                      <Button size="sm" className="gap-2 bg-electric-blue hover:bg-electric-blue/90">
                        Edit
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </motion.div>

      {filtered.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card p-12 text-center"
        >
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No mentors match your filters.</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              setSearch('');
              setExpertiseFilter(null);
            }}
          >
            <X className="w-4 h-4 mr-2" />
            Clear filters
          </Button>
        </motion.div>
      )}
    </div>
  );
}
