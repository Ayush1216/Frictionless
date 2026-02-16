'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  Building2,
  LogOut,
  TrendingUp,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusChip } from '@/components/shared/StatusChip';
import { dummyInvestors } from '@/lib/dummy-data/investors';

const COLORS = ['#3B82F6', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#F97316'];

function fmt(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

function StatCard({ label, value, icon, color, delay }: { label: string; value: string; icon: React.ReactNode; color: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="glass-card p-4 flex items-center gap-3"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-xl font-mono font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </motion.div>
  );
}

export default function PortfolioPage() {
  // Gather all investments across all funds for richer demo
  const allInvestments = useMemo(() => {
    return dummyInvestors.flatMap((inv) =>
      inv.funds.flatMap((f) =>
        f.investments.map((i) => ({ ...i, fundName: f.name, investorName: inv.org.name }))
      )
    );
  }, []);

  const activeInvestments = allInvestments.filter((i) => i.status === 'active');
  const exitedInvestments = allInvestments.filter((i) => i.status === 'exited');
  const writtenOffInvestments = allInvestments.filter((i) => i.status === 'written_off');

  const totalInvested = allInvestments.reduce((sum, i) => sum + i.amount, 0);

  // Sector allocation for donut
  const sectorMap = new Map<string, number>();
  activeInvestments.forEach((inv) => {
    sectorMap.set(inv.sector, (sectorMap.get(inv.sector) || 0) + inv.amount);
  });
  const sectorData = Array.from(sectorMap.entries())
    .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))
    .sort((a, b) => b.value - a.value);

  // Stage breakdown for bar chart
  const stageMap = new Map<string, number>();
  activeInvestments.forEach((inv) => {
    const stageLabel = inv.stage.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    stageMap.set(stageLabel, (stageMap.get(stageLabel) || 0) + 1);
  });
  const stageData = Array.from(stageMap.entries()).map(([name, count]) => ({ name, count }));

  return (
    <div className="p-4 lg:p-8 space-y-6 pb-24 lg:pb-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <PageHeader
        title="Portfolio"
        subtitle={`${activeInvestments.length} active companies across all funds`}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Total Invested"
          value={fmt(totalInvested)}
          icon={<DollarSign className="w-5 h-5 text-electric-blue" />}
          color="bg-electric-blue/10"
          delay={0.1}
        />
        <StatCard
          label="Active Companies"
          value={String(activeInvestments.length)}
          icon={<Building2 className="w-5 h-5 text-electric-purple" />}
          color="bg-electric-purple/10"
          delay={0.15}
        />
        <StatCard
          label="Exits"
          value={String(exitedInvestments.length)}
          icon={<LogOut className="w-5 h-5 text-score-excellent" />}
          color="bg-score-excellent/10"
          delay={0.2}
        />
        <StatCard
          label="Write-Offs"
          value={String(writtenOffInvestments.length)}
          icon={<TrendingUp className="w-5 h-5 text-score-poor" />}
          color="bg-score-poor/10"
          delay={0.25}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sector allocation donut */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6"
        >
          <h3 className="text-sm font-display font-semibold text-foreground mb-4">Sector Allocation</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sectorData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {sectorData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
                  formatter={(value: number | undefined) => [fmt(value ?? 0), 'Invested']}
                />
                <Legend
                  verticalAlign="bottom"
                  formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Stage breakdown bar chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="glass-card p-6"
        >
          <h3 className="text-sm font-display font-semibold text-foreground mb-4">Stage Breakdown</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#9CA3AF' }}
                />
                <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Portfolio company cards */}
      <div>
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-sm font-display font-semibold text-foreground mb-3"
        >
          Active Portfolio Companies
        </motion.h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {activeInvestments.map((inv, i) => (
            <motion.div
              key={inv.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.4 + i * 0.04 }}
              className="glass-card p-5 hover:shadow-card-hover transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-display font-semibold text-foreground">{inv.startup_name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 capitalize">{inv.sector} · {inv.stage.replace(/_/g, ' ')}</p>
                </div>
                <StatusChip status={inv.status} />
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="p-2 rounded-lg bg-obsidian-800/50 text-center">
                  <p className="text-[10px] text-muted-foreground">Invested</p>
                  <p className="text-sm font-mono font-bold text-foreground">{fmt(inv.amount)}</p>
                </div>
                <div className="p-2 rounded-lg bg-obsidian-800/50 text-center">
                  <p className="text-[10px] text-muted-foreground">Date</p>
                  <p className="text-sm font-mono text-foreground">{new Date(inv.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                via <span className="text-foreground">{inv.fundName}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Exited */}
      {exitedInvestments.length > 0 && (
        <div>
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm font-display font-semibold text-muted-foreground mb-3"
          >
            Exited Investments
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {exitedInvestments.map((inv, i) => (
              <motion.div
                key={inv.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="glass-card p-5 opacity-75"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-display font-semibold text-foreground">{inv.startup_name}</h3>
                  <StatusChip status="exited" />
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="capitalize">{inv.sector}</span>
                  <span>·</span>
                  <span className="font-mono font-semibold text-foreground">{fmt(inv.amount)}</span>
                  <span>·</span>
                  <span>{new Date(inv.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
