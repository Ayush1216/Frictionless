'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Calendar,
  Users,
  GraduationCap,
  Gauge,
  TrendingUp,
  ChevronRight,
  UserPlus,
  FileOutput,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { dummyPrograms } from '@/lib/dummy-data/programs';
import { dummyStartups } from '@/lib/dummy-data/startups';
import { dummyProgramStartups } from '@/lib/dummy-data/program-startups';
import { dummyMentors } from '@/lib/dummy-data/mentors';
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

export default function ProgramDetailPage() {
  const params = useParams();
  const router = useRouter();
  const programId = params.programId as string;

  const program = useMemo(
    () => dummyPrograms.find((p) => p.id === programId),
    [programId]
  );

  const programStartups = useMemo(
    () => dummyProgramStartups.filter((ps) => ps.program_id === programId),
    [programId]
  );

  const startupsWithDetails = useMemo(() => {
    return programStartups
      .map((ps) => {
        const startup = dummyStartups.find((s) => s.org_id === ps.startup_org_id);
        const mentor = ps.mentor_id ? dummyMentors.find((m) => m.id === ps.mentor_id) : null;
        const stage = program?.stages.find((s) => s.id === ps.stage_id);
        return { ps, startup, mentor, stage };
      })
      .filter((x) => x.startup);
  }, [programStartups, program?.stages]);

  const stageCounts = useMemo(() => {
    if (!program) return [];
    return program.stages.map((stage) => ({
      ...stage,
      count: programStartups.filter((ps) => ps.stage_id === stage.id).length,
    }));
  }, [program, programStartups]);

  const avgScore = useMemo(() => {
    if (startupsWithDetails.length === 0) return 0;
    const total = startupsWithDetails.reduce((acc, { startup }) => acc + (startup?.assessment.overall_score ?? 0), 0);
    return Math.round(total / startupsWithDetails.length);
  }, [startupsWithDetails]);

  const completionRate = useMemo(() => {
    if (!program || program.stages.length === 0) return 0;
    const lastStageId = program.stages[program.stages.length - 1]?.id;
    const completed = programStartups.filter((ps) => ps.stage_id === lastStageId).length;
    return Math.round((completed / programStartups.length) * 100);
  }, [program, programStartups]);

  const programMentors = useMemo(() => {
    const mentorIds = new Set(programStartups.map((ps) => ps.mentor_id).filter(Boolean) as string[]);
    return dummyMentors.filter((m) => mentorIds.has(m.id));
  }, [programStartups]);

  if (!program) {
    return (
      <div className="p-6 lg:p-8 flex flex-col items-center justify-center min-h-[50vh]">
        <p className="text-lg font-display font-semibold text-foreground mb-2">
          Program not found
        </p>
        <Button variant="outline" onClick={() => router.push('/accelerator/programs')} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Programs
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 pb-24 lg:pb-8 max-w-[1400px] mx-auto">
      {/* Back */}
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/accelerator/programs')}
          className="text-muted-foreground hover:text-foreground gap-1.5 -ml-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Programs
        </Button>
      </motion.div>

      {/* Program Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass-card p-6"
      >
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
                {program.name}
              </h1>
              <Badge variant="secondary" className={cn(STATUS_COLORS[program.status])}>
                {STATUS_LABELS[program.status]}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <Calendar className="w-4 h-4" />
              {formatDateRange(program.start_date, program.end_date)}
            </div>
            <p className="text-muted-foreground">{program.description}</p>
          </div>
        </div>
      </motion.div>

      {/* Stats Row */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      >
        {[
          { Icon: Users, label: 'Startups', value: program.startup_count, color: 'text-electric-blue', bg: 'bg-electric-blue/10' },
          { Icon: GraduationCap, label: 'Mentors', value: program.mentor_count, color: 'text-electric-purple', bg: 'bg-electric-purple/10' },
          { Icon: Gauge, label: 'Avg Score', value: avgScore, color: 'text-electric-cyan', bg: 'bg-electric-cyan/10' },
          { Icon: TrendingUp, label: 'Completion', value: `${completionRate}%`, color: 'text-score-excellent', bg: 'bg-score-excellent/10' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 + i * 0.05 }}
            className="glass-card p-4 flex items-center gap-3"
          >
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', stat.bg)}>
              <stat.Icon className={cn('w-5 h-5', stat.color)} />
            </div>
            <div>
              <p className="text-xl font-mono font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Stage Pipeline */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="glass-card p-5"
      >
        <h2 className="text-lg font-display font-semibold text-foreground mb-4">
          Stage Pipeline
        </h2>
        <div className="flex overflow-x-auto pb-2 gap-2 no-scrollbar">
          {stageCounts.map((s, i) => (
            <div
              key={s.id}
              className="flex shrink-0 items-center gap-2"
            >
              <div
                className={cn(
                  'min-w-[140px] px-4 py-3 rounded-xl border text-center',
                  'bg-obsidian-800/80 border-obsidian-600/50'
                )}
              >
                <p className="text-xs text-muted-foreground truncate">{s.name}</p>
                <p className="text-lg font-mono font-bold text-foreground mt-0.5">{s.count}</p>
              </div>
              {i < stageCounts.length - 1 && (
                <ArrowRight className="w-4 h-4 text-obsidian-500 shrink-0" />
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Batch Actions */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="flex flex-wrap gap-2"
      >
        <Button variant="outline" size="sm" className="gap-2">
          <ArrowRight className="w-4 h-4" />
          Move to Next Stage
        </Button>
        <Button variant="outline" size="sm" className="gap-2">
          <UserPlus className="w-4 h-4" />
          Assign Mentor
        </Button>
        <Button variant="outline" size="sm" className="gap-2">
          <FileOutput className="w-4 h-4" />
          Export Report
        </Button>
      </motion.div>

      {/* Startups Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="glass-card overflow-hidden"
      >
        <div className="p-4 border-b border-obsidian-600/50">
          <h2 className="text-lg font-display font-semibold text-foreground">
            Startups in Program
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-obsidian-600/50">
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Startup</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Stage</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Score</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Mentor</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Notes</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {startupsWithDetails.map(({ ps, startup, mentor, stage }) => (
                <tr
                  key={ps.id}
                  onClick={() => router.push(`/accelerator/programs/${programId}/startups/${ps.id}`)}
                  className="border-b border-obsidian-600/30 hover:bg-obsidian-800/50 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-obsidian-700 overflow-hidden shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={startup!.org.logo_url} alt="" className="w-full h-full object-cover" />
                      </div>
                      <span className="font-medium text-foreground">{startup!.org.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{stage?.name ?? '-'}</td>
                  <td className="py-3 px-4">
                    <span className="font-mono font-medium text-foreground">
                      {startup!.assessment.overall_score}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">
                    {mentor?.full_name ?? '—'}
                  </td>
                  <td className="py-3 px-4 text-sm text-muted-foreground max-w-[200px] truncate">
                    {ps.notes || '—'}
                  </td>
                  <td className="py-3 px-4">
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Mentors Section */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="glass-card p-5"
      >
        <h2 className="text-lg font-display font-semibold text-foreground mb-4">
          Mentors
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {programMentors.length > 0 ? (
            programMentors.map((mentor) => (
              <div
                key={mentor.id}
                className="flex items-center gap-4 p-4 rounded-xl bg-obsidian-800/50 border border-obsidian-600/30"
              >
                <Avatar className="w-12 h-12 rounded-xl">
                  <AvatarImage src={mentor.photo_url} alt={mentor.full_name} />
                  <AvatarFallback className="rounded-xl bg-electric-blue/20 text-electric-blue">
                    {mentor.full_name.split(' ').map((n) => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{mentor.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {mentor.title} @ {mentor.company}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {mentor.expertise.slice(0, 2).map((e) => (
                      <Badge key={e} variant="secondary" className="text-[10px] px-1.5 py-0">
                        {e}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground col-span-full">
              No mentors assigned yet. Use &quot;Assign Mentor&quot; to add mentors to startups.
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
