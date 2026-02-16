'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import {
  Building2,
  Globe,
  DollarSign,
  Users,
  Briefcase,
  Target,
  Edit3,
  ExternalLink,
  ArrowRight,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { dummyInvestors } from '@/lib/dummy-data/investors';
import { Button } from '@/components/ui/button';

/* Use General Catalyst as the logged-in investor */
const investor = dummyInvestors[0];

function fmt(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

const typeLabels: Record<string, string> = {
  vc: 'Venture Capital',
  angel: 'Angel Investor',
  bank: 'Bank',
  grant: 'Grant Provider',
  family_office: 'Family Office',
  cvc: 'Corporate VC',
};

function InfoRow({ label, value, icon }: { label: string; value: React.ReactNode; icon: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="w-8 h-8 rounded-lg bg-obsidian-700/80 flex items-center justify-center flex-shrink-0 mt-0.5">
        {icon}
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="text-sm font-medium text-foreground mt-0.5">{value}</div>
      </div>
    </div>
  );
}

export default function CapitalProfilePage() {
  return (
    <div className="p-4 lg:p-8 space-y-6 pb-24 lg:pb-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <PageHeader
        title="Organization Profile"
        subtitle={investor.org.name}
        actions={
          <Button className="gap-1.5 bg-electric-blue hover:bg-electric-blue/90 text-white">
            <Edit3 className="w-4 h-4" /> Edit Profile
          </Button>
        }
      />

      {/* Profile card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-6"
      >
        <div className="flex flex-col sm:flex-row items-start gap-6">
          {/* Logo */}
          <div className="w-24 h-24 rounded-2xl overflow-hidden bg-obsidian-700 ring-2 ring-white/5 flex-shrink-0">
            <Image
              src={investor.org.logo_url}
              alt={investor.org.name}
              width={96}
              height={96}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Basic info */}
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-display font-bold text-foreground">{investor.org.name}</h2>
            <p className="text-sm text-muted-foreground mt-1">{investor.org.description}</p>

            <div className="flex flex-wrap items-center gap-3 mt-3">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-electric-blue/10 text-electric-blue border border-electric-blue/20">
                {typeLabels[investor.provider_type] || investor.provider_type}
              </span>
              <a
                href={investor.org.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-electric-blue transition-colors"
              >
                <Globe className="w-3.5 h-3.5" />
                {investor.org.website.replace('https://', '')}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Details grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Organization details */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-card p-6"
        >
          <h3 className="text-sm font-display font-semibold text-foreground mb-2">Organization Details</h3>
          <div className="divide-y divide-white/5">
            <InfoRow
              label="Organization Type"
              value={typeLabels[investor.provider_type] || investor.provider_type}
              icon={<Building2 className="w-4 h-4 text-electric-blue" />}
            />
            <InfoRow
              label="Assets Under Management"
              value={fmt(investor.aum_usd)}
              icon={<DollarSign className="w-4 h-4 text-electric-purple" />}
            />
            <InfoRow
              label="Total Investments"
              value={String(investor.investment_count)}
              icon={<Briefcase className="w-4 h-4 text-electric-cyan" />}
            />
            <InfoRow
              label="Portfolio Exits"
              value={String(investor.portfolio_exits)}
              icon={<Target className="w-4 h-4 text-score-excellent" />}
            />
            <InfoRow
              label="Active Funds"
              value={String(investor.funds.length)}
              icon={<Briefcase className="w-4 h-4 text-score-fair" />}
            />
          </div>
        </motion.div>

        {/* Thesis summary */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-display font-semibold text-foreground">Investment Thesis</h3>
            <Link href="/capital/thesis">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1 hover:text-electric-blue h-7">
                Details <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>
          <p className="text-sm text-foreground/80 leading-relaxed mb-4">{investor.thesis_summary}</p>

          <div className="space-y-3">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">Preferred Sectors</p>
              <div className="flex flex-wrap gap-1.5">
                {investor.preferred_sectors.map((sector) => (
                  <span key={sector} className="px-2 py-0.5 text-[10px] rounded-full bg-electric-purple/10 text-electric-purple border border-electric-purple/20 capitalize font-medium">
                    {sector.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">Check Size</p>
              <p className="text-sm font-mono font-semibold text-foreground">
                {fmt(investor.check_size_min)} – {fmt(investor.check_size_max)}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Team preview */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="glass-card p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-electric-blue" />
            <h3 className="text-sm font-display font-semibold text-foreground">Team Members</h3>
            <span className="px-2 py-0.5 rounded-full bg-obsidian-700 text-[10px] font-bold text-muted-foreground">
              {investor.team_members.length}
            </span>
          </div>
          <Link href="/capital/team">
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1 hover:text-electric-blue h-7">
              View All <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {investor.team_members.map((member, i) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.06 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-obsidian-800/30 border border-white/5"
            >
              <div className="w-10 h-10 rounded-full overflow-hidden bg-obsidian-700 flex-shrink-0">
                <Image src={member.photo_url} alt={member.full_name} width={40} height={40} className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{member.full_name}</p>
                <p className="text-xs text-muted-foreground truncate">{member.title}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
