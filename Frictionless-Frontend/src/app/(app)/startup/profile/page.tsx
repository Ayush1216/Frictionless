'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Edit3,
  Globe,
  MapPin,
  Calendar,
  Users,
  Briefcase,
  DollarSign,
  TrendingUp,
  Target,
  Heart,
  Tag,
  Linkedin,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { dummyStartups } from '@/lib/dummy-data/startups';

const startup = dummyStartups[0]; // NeuralPay

type TabKey = 'overview' | 'founders' | 'metrics' | 'tags';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'founders', label: 'Founders' },
  { key: 'metrics', label: 'Metrics' },
  { key: 'tags', label: 'Tags' },
];

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

function formatStage(stage: string): string {
  return stage
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function MetricCard({
  icon: Icon,
  label,
  value,
  subtext,
  index,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subtext?: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
      className="glass-card p-4"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-lg font-mono font-bold text-foreground">{value}</p>
      {subtext && <p className="text-xs text-muted-foreground mt-0.5">{subtext}</p>}
    </motion.div>
  );
}

export default function StartupProfilePage() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [tags, setTags] = useState(startup.tags);
  const [newTag, setNewTag] = useState('');

  const handleAddTag = () => {
    const t = newTag.trim();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const m = startup.latest_metrics;

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass-card p-6"
      >
        <div className="flex flex-col sm:flex-row gap-5">
          {/* Logo */}
          <div className="w-20 h-20 rounded-2xl bg-muted border border-border overflow-hidden shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={startup.org.logo_url}
              alt={startup.org.name}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-display font-bold text-foreground">
                  {startup.org.name}
                </h1>
                <p className="text-muted-foreground text-sm mt-0.5">
                  {startup.org.description}
                </p>
              </div>
              <Button variant="secondary" size="sm" className="gap-2 shrink-0">
                <Edit3 className="w-4 h-4" /> Edit
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-3">
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                {startup.sector.name}
              </Badge>
              <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20">
                {formatStage(startup.stage)}
              </Badge>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" />
                {startup.hq_location.city}, {startup.hq_location.state}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Globe className="w-3 h-3" />
                <a href={startup.org.website} className="hover:text-primary transition-colors">
                  {startup.org.website.replace('https://', '')}
                </a>
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex gap-1 bg-card p-1 rounded-xl border border-border/50"
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === tab.key
                ? 'bg-muted text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </motion.div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.3 }}
            className="space-y-5"
          >
            <div className="glass-card p-5 space-y-4">
              <h2 className="text-lg font-display font-semibold text-foreground flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" /> About
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {startup.pitch_summary}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                <InfoItem icon={Briefcase} label="Business Model" value={startup.business_model} />
                <InfoItem icon={Calendar} label="Founded" value={String(startup.founded_year)} />
                <InfoItem icon={Users} label="Employees" value={String(startup.employee_count)} />
                <InfoItem icon={MapPin} label="Location" value={`${startup.hq_location.city}, ${startup.hq_location.state}`} />
              </div>
            </div>

            {/* Frictionless Score summary */}
            <div className="glass-card p-5">
              <h2 className="text-lg font-display font-semibold text-foreground mb-3">
                Frictionless Score
              </h2>
              <div className="flex items-center gap-4">
                <div className="text-4xl font-mono font-bold text-foreground">
                  {startup.current_Readiness_score}
                </div>
                <div>
                  <Badge className={cn(
                    'capitalize',
                    startup.assessment.badge === 'strong' && 'bg-score-excellent/10 text-score-excellent border-score-excellent/20',
                    startup.assessment.badge === 'exceptional' && 'bg-score-excellent/10 text-score-excellent border-score-excellent/20',
                    startup.assessment.badge === 'developing' && 'bg-score-fair/10 text-score-fair border-score-fair/20',
                    startup.assessment.badge === 'early' && 'bg-score-poor/10 text-score-poor border-score-poor/20',
                    startup.assessment.badge === 'promising' && 'bg-score-good/10 text-score-good border-score-good/20',
                  )}>
                    {startup.assessment.badge}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {startup.score_delta > 0 ? '+' : ''}{startup.score_delta} from last month
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'founders' && (
          <motion.div
            key="founders"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            {startup.founders.map((founder, i) => (
              <motion.div
                key={founder.full_name}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.1 }}
                className="glass-card p-5"
              >
                <div className="flex items-start gap-4">
                  <Avatar className="w-14 h-14 rounded-xl border border-border">
                    <AvatarImage src={founder.photo_url} alt={founder.full_name} />
                    <AvatarFallback className="rounded-xl bg-muted text-sm">
                      {founder.full_name.split(' ').map((n) => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display font-semibold text-foreground">
                        {founder.full_name}
                      </h3>
                      {founder.is_primary && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-electric-blue/10 text-electric-blue">
                          Primary
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-electric-purple">{founder.title}</p>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                      {founder.bio}
                    </p>
                    {founder.linkedin_url && (
                      <a
                        href={founder.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-2 text-xs text-electric-blue hover:underline"
                      >
                        <Linkedin className="w-3 h-3" /> LinkedIn
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {activeTab === 'metrics' && (
          <motion.div
            key="metrics"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-2 lg:grid-cols-3 gap-4"
          >
            <MetricCard icon={DollarSign} label="MRR" value={formatCurrency(m.mrr)} index={0} />
            <MetricCard icon={DollarSign} label="ARR" value={formatCurrency(m.arr)} index={1} />
            <MetricCard icon={TrendingUp} label="Revenue (TTM)" value={formatCurrency(m.revenue_ttm)} index={2} />
            <MetricCard icon={TrendingUp} label="Gross Margin" value={`${m.gross_margin_pct}%`} index={3} />
            <MetricCard icon={DollarSign} label="Monthly Burn" value={formatCurrency(m.burn_monthly)} index={4} />
            <MetricCard icon={Calendar} label="Runway" value={`${m.runway_months} mo`} index={5} />
            <MetricCard icon={Users} label="Headcount" value={String(m.headcount)} index={6} />
            <MetricCard icon={Users} label="Customers" value={String(m.customer_count)} index={7} />
            <MetricCard icon={Target} label="CAC" value={formatCurrency(m.cac)} index={8} />
            <MetricCard icon={Target} label="LTV" value={formatCurrency(m.ltv)} subtext={`LTV:CAC = ${(m.ltv / m.cac).toFixed(1)}x`} index={9} />
            <MetricCard icon={TrendingUp} label="Churn Rate" value={`${m.churn_rate_pct}%`} index={10} />
            <MetricCard icon={Heart} label="NPS Score" value={String(m.nps_score)} index={11} />
          </motion.div>
        )}

        {activeTab === 'tags' && (
          <motion.div
            key="tags"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.3 }}
            className="glass-card p-5 space-y-4"
          >
            <h2 className="text-lg font-display font-semibold text-foreground flex items-center gap-2">
              <Tag className="w-5 h-5 text-electric-blue" /> Tags
            </h2>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="gap-1.5 pl-3 pr-1.5 py-1 bg-obsidian-700 text-foreground border-obsidian-600 hover:border-red-400/50 group transition-colors"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="p-0.5 rounded-full hover:bg-red-500/20 text-muted-foreground group-hover:text-red-400 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <input
                type="text"
                placeholder="Add a tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                className="flex-1 px-3 py-2 rounded-lg bg-obsidian-800 border border-obsidian-600 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-electric-blue"
              />
              <Button size="sm" onClick={handleAddTag} className="bg-electric-blue hover:bg-electric-blue/90">
                Add
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-obsidian-700 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}
