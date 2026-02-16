'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Calendar, Users, GraduationCap, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { dummyPrograms } from '@/lib/dummy-data/programs';
import { cn } from '@/lib/utils';

const STATUS_LABELS: Record<string, string> = {
  upcoming: 'Upcoming',
  active: 'Active',
  completed: 'Completed',
};

const STATUS_COLORS: Record<string, string> = {
  upcoming: 'bg-electric-cyan/10 text-electric-cyan border-electric-cyan/20',
  active: 'bg-score-excellent/10 text-score-excellent border-score-excellent/20',
  completed: 'bg-obsidian-600/50 text-muted-foreground border-obsidian-600',
};

function formatDateRange(start: string, end: string) {
  const s = new Date(start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const e = new Date(end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${s} – ${e}`;
}

export default function ProgramsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'active' | 'upcoming' | 'completed'>('active');

  const filtered = dummyPrograms.filter((p) => p.status === activeTab);
  const counts = {
    active: dummyPrograms.filter((p) => p.status === 'active').length,
    upcoming: dummyPrograms.filter((p) => p.status === 'upcoming').length,
    completed: dummyPrograms.filter((p) => p.status === 'completed').length,
  };

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
            Programs
          </h1>
          <p className="text-muted-foreground mt-1">
            {dummyPrograms.length} program{dummyPrograms.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <Button className="gap-2 bg-electric-blue hover:bg-electric-blue/90 shrink-0">
          <Plus className="w-4 h-4" />
          Create Program
        </Button>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
      >
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="grid w-full max-w-md grid-cols-3 bg-obsidian-800 p-1 rounded-xl border border-obsidian-600/50">
            <TabsTrigger value="active" className="gap-2 data-[state=active]:bg-obsidian-700">
              Active ({counts.active})
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="gap-2 data-[state=active]:bg-obsidian-700">
              Upcoming ({counts.upcoming})
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-2 data-[state=active]:bg-obsidian-700">
              Completed ({counts.completed})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            <AnimatePresence mode="wait">
              {filtered.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="glass-card p-12 text-center"
                >
                  <p className="text-muted-foreground">No {activeTab} programs.</p>
                  <Button variant="outline" className="mt-4 gap-2">
                    <Plus className="w-4 h-4" />
                    Create Program
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                  {filtered.map((program, i) => (
                    <motion.div
                      key={program.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.05 }}
                      onClick={() => router.push(`/accelerator/programs/${program.id}`)}
                      className={cn(
                        'glass-card p-5 cursor-pointer transition-all',
                        'hover:border-electric-blue/30 hover:shadow-glow',
                        'active:scale-[0.98]'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <h2 className="text-lg font-display font-semibold text-foreground line-clamp-2">
                          {program.name}
                        </h2>
                        <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                      </div>
                      <Badge
                        variant="secondary"
                        className={cn('mb-3', STATUS_COLORS[program.status])}
                      >
                        {STATUS_LABELS[program.status]}
                      </Badge>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDateRange(program.start_date, program.end_date)}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {program.startup_count} startup{program.startup_count !== 1 ? 's' : ''}
                        </span>
                        <span className="flex items-center gap-1">
                          <GraduationCap className="w-3.5 h-3.5" />
                          {program.mentor_count} mentor{program.mentor_count !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {program.description}
                      </p>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
