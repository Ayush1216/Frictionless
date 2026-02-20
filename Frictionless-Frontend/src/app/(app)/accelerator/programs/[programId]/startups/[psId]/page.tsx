'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Gauge,
  Users,
  FileText,
  UserPlus,
  Video,
  ChevronDown,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { dummyPrograms } from '@/lib/dummy-data/programs';
import { dummyStartups } from '@/lib/dummy-data/startups';
import { dummyProgramStartups } from '@/lib/dummy-data/program-startups';
import { dummyMentors } from '@/lib/dummy-data/mentors';
import { cn } from '@/lib/utils';

function formatStage(stage: string) {
  return stage.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export default function ProgramStartupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const programId = params.programId as string;
  const psId = params.psId as string;

  const assignment = useMemo(
    () => dummyProgramStartups.find((ps) => ps.id === psId),
    [psId]
  );

  const program = useMemo(
    () => dummyPrograms.find((p) => p.id === programId),
    [programId]
  );

  const startup = useMemo(
    () => (assignment ? dummyStartups.find((s) => s.org_id === assignment.startup_org_id) : undefined),
    [assignment]
  );

  const mentor = useMemo(
    () => (assignment?.mentor_id ? dummyMentors.find((m) => m.id === assignment.mentor_id) : undefined),
    [assignment]
  );

  const currentStage = useMemo(
    () => (assignment && program ? program.stages.find((s) => s.id === assignment.stage_id) : undefined),
    [assignment, program]
  );

  const scoreChartData = useMemo(() => {
    if (!assignment?.score_history.length) return [];
    return assignment.score_history.map((h) => ({
      date: new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score: h.score,
    }));
  }, [assignment]);

  if (!assignment || !program || !startup) {
    return (
      <div className="p-6 lg:p-8 flex flex-col items-center justify-center min-h-[50vh]">
        <p className="text-lg font-display font-semibold text-foreground mb-2">
          Startup not found
        </p>
        <Button
          variant="outline"
          onClick={() => router.push(`/accelerator/programs/${programId}`)}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Program
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 pb-24 lg:pb-8 max-w-[1200px] mx-auto">
      {/* Back */}
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/accelerator/programs/${programId}`)}
          className="text-muted-foreground hover:text-foreground gap-1.5 -ml-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {program.name}
        </Button>
      </motion.div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass-card p-6"
      >
        <div className="flex flex-col sm:flex-row gap-5">
          <div className="w-20 h-20 rounded-2xl bg-obsidian-700 border border-obsidian-600 overflow-hidden shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={startup.org.logo_url} alt={startup.org.name} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-display font-bold text-foreground">{startup.org.name}</h1>
            <p className="text-muted-foreground text-sm mt-0.5">{startup.org.description}</p>
            <div className="flex flex-wrap gap-3 mt-3">
              <Badge variant="secondary" className="bg-electric-blue/10 text-electric-blue border-electric-blue/20">
                {startup.sector.name}
              </Badge>
              <Badge variant="secondary" className="bg-electric-purple/10 text-electric-purple border-electric-purple/20">
                {formatStage(startup.stage)}
              </Badge>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" />
                {startup.hq_location.city}, {startup.hq_location.state}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stage Selector */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="glass-card p-5"
      >
        <h2 className="text-sm font-display font-semibold text-foreground mb-3">
          Current Stage
        </h2>
        <Select defaultValue={assignment.stage_id}>
          <SelectTrigger className="w-full max-w-xs bg-obsidian-800 border-obsidian-600">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {program.stages.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {currentStage && (
          <p className="text-xs text-muted-foreground mt-2">{currentStage.description}</p>
        )}
      </motion.div>

      {/* Frictionless Assessment */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="glass-card p-5"
      >
        <h2 className="text-lg font-display font-semibold text-foreground mb-4 flex items-center gap-2">
          <Gauge className="w-5 h-5 text-electric-blue" />
          Frictionless Assessment
        </h2>
        <div className="flex items-center gap-6 mb-4">
          <div className="text-4xl font-mono font-bold text-foreground">
            {startup.assessment.overall_score}
          </div>
          <Badge
            className={cn(
              'capitalize',
              startup.assessment.badge === 'strong' && 'bg-score-excellent/10 text-score-excellent border-score-excellent/20',
              startup.assessment.badge === 'exceptional' && 'bg-score-excellent/10 text-score-excellent border-score-excellent/20',
              startup.assessment.badge === 'developing' && 'bg-score-fair/10 text-score-fair border-score-fair/20',
              startup.assessment.badge === 'early' && 'bg-score-poor/10 text-score-poor border-score-poor/20',
              startup.assessment.badge === 'promising' && 'bg-score-good/10 text-score-good border-score-good/20'
            )}
          >
            {startup.assessment.badge}
          </Badge>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {startup.assessment.categories.map((cat) => (
            <div
              key={cat.name}
              className="p-3 rounded-xl bg-obsidian-800/50 border border-obsidian-600/30"
            >
              <p className="text-xs text-muted-foreground truncate">{cat.name}</p>
              <p className="text-lg font-mono font-bold text-foreground">{cat.score}</p>
            </div>
          ))}
        </div>
        {startup.assessment.missing_data.length > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-score-fair/10 border border-score-fair/20">
            <p className="text-xs font-medium text-score-fair mb-2">Missing Data</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              {startup.assessment.missing_data.map((m) => (
                <li key={m.item}>• {m.item}</li>
              ))}
            </ul>
          </div>
        )}
      </motion.div>

      {/* Score History */}
      {scoreChartData.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="glass-card p-5"
        >
          <h2 className="text-lg font-display font-semibold text-foreground mb-4">
            Score History in Program
          </h2>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={scoreChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 26%)" />
                <XAxis dataKey="date" stroke="hsl(215 14% 65%)" fontSize={12} />
                <YAxis domain={[0, 100]} stroke="hsl(215 14% 65%)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(220 30% 8%)',
                    border: '1px solid hsl(220 13% 26%)',
                    borderRadius: '8px',
                  }}
                  formatter={(value) => [value ?? 0, 'Score']}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* Notes */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="glass-card p-5"
      >
        <h2 className="text-lg font-display font-semibold text-foreground mb-3 flex items-center gap-2">
          <FileText className="w-5 h-5 text-electric-purple" />
          Program Notes
        </h2>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
          {assignment.notes || 'No notes yet.'}
        </p>
      </motion.div>

      {/* Mentor Assignment */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="glass-card p-5"
      >
        <h2 className="text-lg font-display font-semibold text-foreground mb-4 flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-electric-cyan" />
          Mentor
        </h2>
        {mentor ? (
          <div className="flex items-center gap-4 p-4 rounded-xl bg-obsidian-800/50 border border-obsidian-600/30">
            <Avatar className="w-14 h-14 rounded-xl">
              <AvatarImage src={mentor.photo_url} alt={mentor.full_name} />
              <AvatarFallback className="rounded-xl bg-electric-cyan/20 text-electric-cyan">
                {mentor.full_name.split(' ').map((n) => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-foreground">{mentor.full_name}</p>
              <p className="text-sm text-muted-foreground">
                {mentor.title} @ {mentor.company}
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                {mentor.expertise.map((e) => (
                  <Badge key={e} variant="secondary" className="text-xs">
                    {e}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-dashed border-obsidian-600 text-center">
            <p className="text-sm text-muted-foreground mb-3">No mentor assigned</p>
            <Button variant="outline" size="sm" className="gap-2">
              <UserPlus className="w-4 h-4" />
              Assign Mentor
            </Button>
          </div>
        )}
      </motion.div>

      {/* Founders */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="glass-card p-5"
      >
        <h2 className="text-lg font-display font-semibold text-foreground mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-electric-purple" />
          Founders
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {startup.founders.map((f) => (
            <div
              key={f.full_name}
              className="flex items-center gap-4 p-4 rounded-xl bg-obsidian-800/50 border border-obsidian-600/30"
            >
              <Avatar className="w-12 h-12 rounded-xl">
                <AvatarImage src={f.photo_url} alt={f.full_name} />
                <AvatarFallback className="rounded-xl bg-electric-purple/20 text-electric-purple">
                  {f.full_name.split(' ').map((n) => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-foreground">{f.full_name}</p>
                <p className="text-sm text-muted-foreground">{f.title}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Interview Scheduling (placeholder) */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.35 }}
        className="glass-card p-5"
      >
        <h2 className="text-lg font-display font-semibold text-foreground mb-4 flex items-center gap-2">
          <Video className="w-5 h-5 text-electric-blue" />
          Interview Scheduling
        </h2>
        <div className="p-6 rounded-xl border border-dashed border-obsidian-600 bg-obsidian-800/30 text-center">
          <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-3">
            Schedule founder interviews and mentor sessions
          </p>
          <Button variant="outline" size="sm" className="gap-2">
            <ChevronDown className="w-4 h-4" />
            Schedule Interview
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
