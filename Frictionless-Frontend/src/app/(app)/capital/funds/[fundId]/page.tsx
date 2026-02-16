'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  DollarSign,
  BarChart3,
  Briefcase,
  Percent,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusChip } from '@/components/shared/StatusChip';
import { dummyInvestors } from '@/lib/dummy-data/investors';
import { Button } from '@/components/ui/button';

/* ─── helpers ─── */
function fmt(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

const COLORS = ['#3B82F6', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#F97316'];

const statusColors: Record<string, string> = {
  active: 'text-score-excellent',
  exited: 'text-electric-blue',
  written_off: 'text-score-poor',
};

/* ─── generate deployment timeline ─── */
function generateDeploymentTimeline(fund: { target_size: number; capital_deployed: number; vintage_year: number }) {
  const years = [];
  const startYear = fund.vintage_year;
  const endYear = 2025;
  let running = 0;
  const perYear = fund.capital_deployed / (endYear - startYear + 1);
  for (let y = startYear; y <= endYear; y++) {
    running += perYear * (0.7 + Math.random() * 0.6);
    running = Math.min(running, fund.capital_deployed);
    years.push({ year: String(y), deployed: Math.round(running), target: fund.target_size });
  }
  return years;
}

/* ─── MetricCard ─── */
function MetricCard({ label, value, icon, delay = 0 }: { label: string; value: string; icon: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="glass-card p-4"
    >
      <div className="flex items-center gap-2 mb-1">
        <div className="w-7 h-7 rounded-lg bg-obsidian-700/80 flex items-center justify-center">{icon}</div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-lg font-mono font-bold text-foreground">{value}</p>
    </motion.div>
  );
}

export default function FundDetailPage() {
  const { fundId } = useParams<{ fundId: string }>();
  const router = useRouter();

  // Find fund across all investors
  const { fund, investor } = useMemo(() => {
    for (const inv of dummyInvestors) {
      const f = inv.funds.find((f) => f.id === fundId);
      if (f) return { fund: f, investor: inv };
    }
    return { fund: null, investor: null };
  }, [fundId]);

  if (!fund || !investor) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[50vh]">
        <p className="text-lg font-display font-semibold text-foreground mb-2">Fund not found</p>
        <Button variant="ghost" onClick={() => router.push('/capital/funds')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Funds
        </Button>
      </div>
    );
  }

  const deployedPct = 100 - fund.capital_remaining_pct;
  const remaining = fund.target_size * fund.capital_remaining_pct / 100;
  const dummyIRR = (15 + Math.random() * 20).toFixed(1);
  const deploymentData = generateDeploymentTimeline(fund);

  // Sector allocation
  const sectorMap = new Map<string, number>();
  fund.investments.forEach((inv) => {
    sectorMap.set(inv.sector, (sectorMap.get(inv.sector) || 0) + inv.amount);
  });
  const sectorData = Array.from(sectorMap.entries()).map(([name, value]) => ({ name, value }));

  return (
    <div className="p-4 lg:p-8 space-y-6 pb-24 lg:pb-8 max-w-[1400px] mx-auto">
      {/* Back */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Button variant="ghost" size="sm" className="text-muted-foreground gap-1.5" onClick={() => router.push('/capital/funds')}>
          <ArrowLeft className="w-4 h-4" /> Back to Funds
        </Button>
      </motion.div>

      {/* Header */}
      <PageHeader
        title={fund.name}
        subtitle={`Vintage ${fund.vintage_year} · ${investor.org.name}`}
        actions={<StatusChip status={fund.status} />}
      />

      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <MetricCard label="Target Size" value={fmt(fund.target_size)} icon={<Briefcase className="w-3.5 h-3.5 text-electric-blue" />} delay={0.05} />
        <MetricCard label="Deployed" value={fmt(fund.capital_deployed)} icon={<DollarSign className="w-3.5 h-3.5 text-electric-purple" />} delay={0.1} />
        <MetricCard label="Remaining" value={fmt(remaining)} icon={<DollarSign className="w-3.5 h-3.5 text-score-fair" />} delay={0.15} />
        <MetricCard label="IRR" value={`${dummyIRR}%`} icon={<Percent className="w-3.5 h-3.5 text-score-excellent" />} delay={0.2} />
        <MetricCard label="Investments" value={String(fund.investments.length)} icon={<BarChart3 className="w-3.5 h-3.5 text-electric-cyan" />} delay={0.25} />
      </div>

      {/* Capital deployment progress */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-6"
      >
        <h3 className="text-sm font-display font-semibold text-foreground mb-3">Capital Deployment</h3>
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-muted-foreground">Deployed: {fmt(fund.capital_deployed)}</span>
          <span className="font-mono font-semibold text-foreground">{deployedPct}%</span>
        </div>
        <div className="w-full h-4 bg-obsidian-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-electric-blue via-electric-purple to-electric-cyan"
            initial={{ width: 0 }}
            animate={{ width: `${deployedPct}%` }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1.5">
          <span>$0</span>
          <span>{fmt(fund.target_size)}</span>
        </div>
      </motion.div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Deployment over time */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6"
        >
          <h3 className="text-sm font-display font-semibold text-foreground mb-4">Deployment Over Time</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={deploymentData}>
                <defs>
                  <linearGradient id="deployGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                <XAxis dataKey="year" tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={false} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={false} tickFormatter={(v) => fmt(v)} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#9CA3AF' }}
                  formatter={(value: number | undefined) => [fmt(value ?? 0), 'Deployed']}
                />
                <Area type="monotone" dataKey="deployed" stroke="#3B82F6" strokeWidth={2} fill="url(#deployGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Sector allocation donut */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="glass-card p-6"
        >
          <h3 className="text-sm font-display font-semibold text-foreground mb-4">Sector Allocation</h3>
          <div className="h-64 flex items-center justify-center">
            {sectorData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sectorData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {sectorData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
                    formatter={(value: number | undefined) => [fmt(value ?? 0), 'Amount']}
                  />
                  <Legend
                    verticalAlign="bottom"
                    formatter={(value) => <span className="text-xs text-muted-foreground capitalize">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">No sector data</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Investment table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card overflow-hidden"
      >
        <div className="p-4 border-b border-white/5">
          <h3 className="text-sm font-display font-semibold text-foreground">Portfolio Investments</h3>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Startup</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Sector</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Stage</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground">Amount</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Date</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {fund.investments.map((inv, i) => (
                <motion.tr
                  key={inv.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 + i * 0.05 }}
                  className="hover:bg-obsidian-800/30 transition-colors"
                >
                  <td className="py-3 px-4 font-medium text-foreground">{inv.startup_name}</td>
                  <td className="py-3 px-4 text-muted-foreground capitalize">{inv.sector}</td>
                  <td className="py-3 px-4">
                    <StatusChip status={inv.stage} />
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-foreground">{fmt(inv.amount)}</td>
                  <td className="py-3 px-4 text-muted-foreground">{new Date(inv.date).toLocaleDateString()}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs font-semibold capitalize ${statusColors[inv.status] || 'text-muted-foreground'}`}>
                      {inv.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-white/5">
          {fund.investments.map((inv, i) => (
            <motion.div
              key={inv.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              className="p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">{inv.startup_name}</span>
                <span className={`text-xs font-semibold capitalize ${statusColors[inv.status] || 'text-muted-foreground'}`}>
                  {inv.status.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="capitalize">{inv.sector}</span>
                <span>·</span>
                <StatusChip status={inv.stage} />
                <span>·</span>
                <span className="font-mono font-semibold text-foreground">{fmt(inv.amount)}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
