'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';
import {
  ArrowLeft,
  MapPin,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  FileText,
  ClipboardCheck,
  StickyNote,
  Linkedin,
  Download,
  AlertTriangle,
  CheckCircle2,
  PlusCircle,
  XCircle,
  CalendarCheck,
  Send,
  Flame,
  Clock,
  UserCheck,
  Info,
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { BadgeScore } from '@/components/shared/BadgeScore';
import { StatusChip } from '@/components/shared/StatusChip';
import { dummyStartups } from '@/lib/dummy-data/startups';
import { dummyDocuments } from '@/lib/dummy-data/documents';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

/* ───── helpers ───── */
function fmt(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

function pct(value: number): string {
  return `${value.toFixed(1)}%`;
}

function getScoreColor(score: number) {
  if (score >= 86) return '#10B981';
  if (score >= 81) return '#EAB308';
  return '#EF4444';
}

function getScoreBarColor(score: number) {
  if (score >= 86) return 'bg-score-excellent';
  if (score >= 81) return 'bg-score-good';
  return 'bg-score-poor';
}

function getSeverityColor(sev: string) {
  if (sev === 'high') return 'text-score-poor bg-score-poor/10 border-score-poor/20';
  if (sev === 'medium') return 'text-score-fair bg-score-fair/10 border-score-fair/20';
  return 'text-score-good bg-score-good/10 border-score-good/20';
}

function formatBytes(bytes: number) {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  return `${(bytes / 1_000).toFixed(0)} KB`;
}

const categoryIcons: Record<string, string> = {
  'Storytelling & Pitch': '🎯',
  'Founder & Team': '👥',
  'Product & Technology': '⚙️',
  'Foundational Setup': '🏗️',
  'Metrics & Financials': '📊',
  'Go-To-Market Strategy': '🚀',
  'Traction & Validation': '📈',
};

/* ───── dummy monthly data for charts ───── */
function generateMonthlyData(baseMrr: number, baseCustomers: number) {
  const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'];
  return months.map((month, i) => ({
    month,
    mrr: Math.round(baseMrr * (0.55 + i * 0.065) + (Math.random() - 0.5) * baseMrr * 0.05),
    customers: Math.round(baseCustomers * (0.5 + i * 0.07) + (Math.random() - 0.5) * baseCustomers * 0.04),
  }));
}

/* ───── score gauge (large) ───── */
function ScoreGaugeLarge({ score, badge }: { score: number; badge: string }) {
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = getScoreColor(score);

  return (
    <div className="relative w-28 h-28">
      <svg className="w-28 h-28 -rotate-90" viewBox="0 0 112 112">
        <circle cx="56" cy="56" r={radius} fill="none" stroke="currentColor" strokeWidth="6" className="text-muted" />
        <motion.circle
          cx="56" cy="56" r={radius} fill="none" stroke={color} strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-mono font-bold" style={{ color }}>{score}</span>
        <span className="text-[10px] text-muted-foreground capitalize">{badge}</span>
      </div>
    </div>
  );
}

/* ───── metric card ───── */
function MetricCard({ label, value, icon, delay = 0 }: { label: string; value: string; icon: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="glass-card p-4"
    >
      <div className="flex items-center gap-2 mb-1">
        <div className="w-7 h-7 rounded-lg bg-muted/80 flex items-center justify-center">{icon}</div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-lg font-mono font-bold text-foreground">{value}</p>
    </motion.div>
  );
}

/* ───── page ───── */
export default function StartupDetailPage() {
  const { startupOrgId } = useParams<{ startupOrgId: string }>();
  const router = useRouter();
  const [notes, setNotes] = useState('');

  const startup = useMemo(
    () => dummyStartups.find((s) => s.org_id === startupOrgId),
    [startupOrgId]
  );

  const monthlyData = useMemo(
    () => startup ? generateMonthlyData(startup.latest_metrics.mrr, startup.latest_metrics.customer_count) : [],
    [startup]
  );

  if (!startup) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[50vh]">
        <p className="text-lg font-display font-semibold text-foreground mb-2">Startup not found</p>
        <Button variant="ghost" onClick={() => router.push('/capital/deal-flow')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Deal Flow
        </Button>
      </div>
    );
  }

  const m = startup.latest_metrics;
  const a = startup.assessment;

  return (
    <div className="p-4 lg:p-8 space-y-6 pb-24 lg:pb-8 max-w-[1400px] mx-auto">
      {/* Back button */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Button variant="ghost" size="sm" className="text-muted-foreground gap-1.5" onClick={() => router.push('/capital/deal-flow')}>
          <ArrowLeft className="w-4 h-4" /> Back to Deal Flow
        </Button>
      </motion.div>

      {/* ─── Profile Header ─── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass-card p-6"
      >
        <div className="flex flex-col lg:flex-row lg:items-center gap-6">
          {/* Logo + info */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-muted ring-1 ring-white/5 flex-shrink-0">
              <Image src={startup.org.logo_url} alt={startup.org.name} width={64} height={64} className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-display font-bold text-foreground truncate">{startup.org.name}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <StatusChip status={startup.stage} />
                <span className="px-2 py-0.5 text-[11px] rounded-full bg-accent/15 text-accent border border-accent/30 font-semibold">
                  {startup.sector.name}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  {startup.hq_location.city}, {startup.hq_location.state}
                </span>
              </div>
            </div>
          </div>

          {/* Score gauge */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <ScoreGaugeLarge score={a.overall_score} badge={a.badge} />
            <BadgeScore score={a.overall_score} delta={startup.score_delta} size="lg" />
          </div>
        </div>
      </motion.div>

      {/* ─── Tabs ─── */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-card/60 border border-white/5 p-1 flex-wrap h-auto">
          <TabsTrigger value="overview" className="text-xs gap-1.5"><Info className="w-3.5 h-3.5" /> Overview</TabsTrigger>
          <TabsTrigger value="metrics" className="text-xs gap-1.5"><BarChart3 className="w-3.5 h-3.5" /> Metrics</TabsTrigger>
          <TabsTrigger value="team" className="text-xs gap-1.5"><Users className="w-3.5 h-3.5" /> Team</TabsTrigger>
          <TabsTrigger value="dataroom" className="text-xs gap-1.5"><FileText className="w-3.5 h-3.5" /> Data Room</TabsTrigger>
          <TabsTrigger value="assessment" className="text-xs gap-1.5"><ClipboardCheck className="w-3.5 h-3.5" /> Assessment</TabsTrigger>
          <TabsTrigger value="notes" className="text-xs gap-1.5"><StickyNote className="w-3.5 h-3.5" /> Notes</TabsTrigger>
        </TabsList>

        {/* ────── OVERVIEW TAB ────── */}
        <TabsContent value="overview" className="space-y-6">
          {/* Summary */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 space-y-3">
            <h3 className="text-sm font-display font-semibold text-foreground">Summary</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{startup.short_summary}</p>
            <p className="text-sm text-foreground/80 leading-relaxed">{startup.pitch_summary}</p>
          </motion.div>

          {/* Key metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <MetricCard label="MRR" value={fmt(m.mrr)} icon={<DollarSign className="w-3.5 h-3.5 text-primary" />} delay={0.05} />
            <MetricCard label="ARR" value={fmt(m.arr)} icon={<TrendingUp className="w-3.5 h-3.5 text-score-excellent" />} delay={0.1} />
            <MetricCard label="Burn" value={fmt(m.burn_monthly)} icon={<Flame className="w-3.5 h-3.5 text-score-poor" />} delay={0.15} />
            <MetricCard label="Runway" value={`${m.runway_months}mo`} icon={<Clock className="w-3.5 h-3.5 text-score-fair" />} delay={0.2} />
            <MetricCard label="Customers" value={String(m.customer_count)} icon={<UserCheck className="w-3.5 h-3.5 text-accent" />} delay={0.25} />
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {startup.tags.map((tag) => (
              <span key={tag} className="px-3 py-1 text-xs rounded-full bg-muted/60 text-muted-foreground border border-border/30 font-medium">
                {tag}
              </span>
            ))}
          </div>

          {/* Founders */}
          <div className="space-y-3">
            <h3 className="text-sm font-display font-semibold text-foreground">Founders</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {startup.founders.map((f, i) => (
                <motion.div
                  key={f.full_name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-card p-4 flex items-start gap-3"
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-muted flex-shrink-0">
                    <Image src={f.photo_url} alt={f.full_name} width={40} height={40} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-foreground">{f.full_name}</p>
                    <p className="text-xs text-primary">{f.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{f.bio}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ────── METRICS TAB ────── */}
        <TabsContent value="metrics" className="space-y-6">
          {/* Financial metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard label="MRR" value={fmt(m.mrr)} icon={<DollarSign className="w-3.5 h-3.5 text-primary" />} />
            <MetricCard label="ARR" value={fmt(m.arr)} icon={<TrendingUp className="w-3.5 h-3.5 text-score-excellent" />} delay={0.05} />
            <MetricCard label="Revenue TTM" value={fmt(m.revenue_ttm)} icon={<BarChart3 className="w-3.5 h-3.5 text-accent" />} delay={0.1} />
            <MetricCard label="Gross Margin" value={pct(m.gross_margin_pct)} icon={<TrendingUp className="w-3.5 h-3.5 text-accent" />} delay={0.15} />
            <MetricCard label="Burn Rate" value={fmt(m.burn_monthly)} icon={<Flame className="w-3.5 h-3.5 text-score-poor" />} delay={0.2} />
            <MetricCard label="Runway" value={`${m.runway_months} months`} icon={<Clock className="w-3.5 h-3.5 text-score-fair" />} delay={0.25} />
            <MetricCard label="CAC" value={fmt(m.cac)} icon={<DollarSign className="w-3.5 h-3.5 text-score-fair" />} delay={0.3} />
            <MetricCard label="LTV" value={fmt(m.ltv)} icon={<DollarSign className="w-3.5 h-3.5 text-score-excellent" />} delay={0.35} />
            <MetricCard label="Churn Rate" value={pct(m.churn_rate_pct)} icon={<TrendingDown className="w-3.5 h-3.5 text-score-poor" />} delay={0.4} />
            <MetricCard label="NPS" value={String(m.nps_score)} icon={<Users className="w-3.5 h-3.5 text-primary" />} delay={0.45} />
            <MetricCard label="LTV/CAC" value={`${(m.ltv / m.cac).toFixed(1)}x`} icon={<BarChart3 className="w-3.5 h-3.5 text-score-excellent" />} delay={0.5} />
            <MetricCard label="Headcount" value={String(m.headcount)} icon={<Users className="w-3.5 h-3.5 text-accent" />} delay={0.55} />
          </div>

          {/* MRR Trend Chart */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
            <h3 className="text-sm font-display font-semibold text-foreground mb-4">MRR Trend</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="mrrGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                  <XAxis dataKey="month" tick={{ fill: 'var(--fi-text-muted)', fontSize: 12 }} axisLine={false} />
                  <YAxis tick={{ fill: 'var(--fi-text-muted)', fontSize: 12 }} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: 'var(--fi-text-muted)' }}
                    formatter={(value: number | undefined) => [`$${((value ?? 0) / 1000).toFixed(0)}K`, 'MRR']}
                  />
                  <Area type="monotone" dataKey="mrr" stroke="#3B82F6" strokeWidth={2} fill="url(#mrrGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Customer Growth Chart */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6">
            <h3 className="text-sm font-display font-semibold text-foreground mb-4">Customer Growth</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="custGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                  <XAxis dataKey="month" tick={{ fill: 'var(--fi-text-muted)', fontSize: 12 }} axisLine={false} />
                  <YAxis tick={{ fill: 'var(--fi-text-muted)', fontSize: 12 }} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: 'var(--fi-text-muted)' }}
                  />
                  <Area type="monotone" dataKey="customers" stroke="#8B5CF6" strokeWidth={2} fill="url(#custGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </TabsContent>

        {/* ────── TEAM TAB ────── */}
        <TabsContent value="team" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {startup.founders.map((f, i) => (
              <motion.div
                key={f.full_name}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-muted flex-shrink-0 ring-1 ring-white/5">
                    <Image src={f.photo_url} alt={f.full_name} width={56} height={56} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display font-semibold text-foreground">{f.full_name}</h3>
                      {f.is_primary && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/20 text-primary">PRIMARY</span>
                      )}
                    </div>
                    <p className="text-sm text-primary">{f.title}</p>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{f.bio}</p>
                    {f.linkedin_url && (
                      <a href={f.linkedin_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline mt-2">
                        <Linkedin className="w-3.5 h-3.5" /> LinkedIn
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* ────── DATA ROOM TAB ────── */}
        <TabsContent value="dataroom" className="space-y-4">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card overflow-hidden">
            <div className="p-4 border-b border-white/5">
              <h3 className="text-sm font-display font-semibold text-foreground">Shared Documents</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{dummyDocuments.length} files available</p>
            </div>
            <div className="divide-y divide-white/5">
              {dummyDocuments.map((doc, i) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center justify-between px-4 py-3 hover:bg-card/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-lg bg-muted/80 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-foreground truncate">{doc.name}</p>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span>{formatBytes(doc.file_size)}</span>
                        <span>·</span>
                        <span>{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                        <span>·</span>
                        <span>{doc.uploaded_by}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusChip status={doc.validation_status} />
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-primary">
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </TabsContent>

        {/* ────── ASSESSMENT TAB ────── */}
        <TabsContent value="assessment" className="space-y-6">
          {/* Overall */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 flex items-center gap-6">
            <ScoreGaugeLarge score={a.overall_score} badge={a.badge} />
            <div>
              <h3 className="font-display font-semibold text-foreground text-lg">Readiness Assessment</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Overall score based on 7 assessment categories. Badge: <span className="capitalize font-semibold text-foreground">{a.badge}</span>
              </p>
            </div>
          </motion.div>

          {/* Category bars */}
          <div className="space-y-3">
            {a.categories.map((cat, i) => (
              <motion.div
                key={cat.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="glass-card p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{categoryIcons[cat.name] || '📋'}</span>
                    <span className="text-sm font-medium text-foreground">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-bold" style={{ color: getScoreColor(cat.score) }}>{cat.score}</span>
                    {cat.delta !== 0 && (
                      <span className={`text-[10px] font-semibold flex items-center ${cat.delta > 0 ? 'text-score-excellent' : 'text-score-poor'}`}>
                        {cat.delta > 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                        {cat.delta > 0 ? '+' : ''}{cat.delta}
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${getScoreBarColor(cat.score)}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${cat.score}%` }}
                    transition={{ duration: 0.6, delay: i * 0.06 + 0.2 }}
                  />
                </div>
              </motion.div>
            ))}
          </div>

          {/* Missing data */}
          {a.missing_data.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-card p-6">
              <h3 className="text-sm font-display font-semibold text-foreground mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-score-fair" /> Missing Data Items
              </h3>
              <div className="space-y-2">
                {a.missing_data.map((item) => (
                  <div key={item.item} className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${getSeverityColor(item.severity)}`}>
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="text-sm flex-1">{item.item}</span>
                    <span className="text-[10px] uppercase font-bold">{item.severity}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {a.missing_data.length === 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-card p-6 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-score-excellent" />
              <p className="text-sm text-foreground">All assessment data items are complete.</p>
            </motion.div>
          )}
        </TabsContent>

        {/* ────── NOTES TAB ────── */}
        <TabsContent value="notes" className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 space-y-4">
            <h3 className="text-sm font-display font-semibold text-foreground">Internal Notes</h3>
            <Textarea
              placeholder="Add your evaluation notes about this startup…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={6}
              className="bg-card/50 border-border/30 resize-none"
            />
            <div className="flex flex-wrap gap-2">
              <Button className="gap-1.5 bg-primary hover:bg-primary/90 text-white">
                <PlusCircle className="w-4 h-4" /> Add to Pipeline
              </Button>
              <Button variant="outline" className="gap-1.5 border-border/50 text-muted-foreground hover:text-foreground">
                <XCircle className="w-4 h-4" /> Pass
              </Button>
              <Button variant="outline" className="gap-1.5 border-border/50 text-muted-foreground hover:text-accent">
                <CalendarCheck className="w-4 h-4" /> Schedule Intro
              </Button>
              <Button variant="outline" className="gap-1.5 border-border/50 text-muted-foreground hover:text-score-excellent">
                <Send className="w-4 h-4" /> Save Notes
              </Button>
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
