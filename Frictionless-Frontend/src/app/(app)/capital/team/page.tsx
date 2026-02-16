'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import {
  Users,
  Mail,
  UserPlus,
  Filter,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { dummyInvestors } from '@/lib/dummy-data/investors';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/* Use General Catalyst as the logged-in investor */
const investor = dummyInvestors[0];

/* Enrich team with extra data for demo */
const enrichedTeam = investor.team_members.map((m) => ({
  ...m,
  email: m.email || `${m.full_name.split(' ')[0].toLowerCase()}@${investor.org.slug}.com`,
  bio: m.bio || 'Experienced investment professional with deep domain expertise in technology and venture capital.',
}));

/* Add more members from other investors for demo richness */
const allTeamMembers = [
  ...enrichedTeam,
  {
    id: 'gc-4',
    full_name: 'Maya Roberts',
    title: 'Associate',
    photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=MayaRoberts',
    role: 'associate',
    email: 'maya@generalcatalyst.com',
    bio: 'Early-stage tech investor. Previously at Goldman Sachs TMT.',
  },
  {
    id: 'gc-5',
    full_name: 'Ryan Foster',
    title: 'Analyst',
    photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=RyanFoster',
    role: 'analyst',
    email: 'ryan@generalcatalyst.com',
    bio: 'Market research and due diligence. Harvard MBA 2024.',
  },
  {
    id: 'gc-6',
    full_name: 'Diana Chen',
    title: 'Venture Partner',
    photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DianaChen',
    role: 'venture_partner',
    email: 'diana@generalcatalyst.com',
    bio: 'Serial entrepreneur. 3x founder. Advises on B2B SaaS deals.',
  },
];

const ROLES = ['all', 'partner', 'principal', 'associate', 'analyst', 'venture_partner'];
const ROLE_LABELS: Record<string, string> = {
  all: 'All Roles',
  partner: 'Partner',
  principal: 'Principal',
  associate: 'Associate',
  analyst: 'Analyst',
  venture_partner: 'Venture Partner',
};

const roleBadgeColors: Record<string, string> = {
  partner: 'bg-electric-blue/15 text-electric-blue border-electric-blue/30',
  principal: 'bg-electric-purple/15 text-electric-purple border-electric-purple/30',
  associate: 'bg-electric-cyan/15 text-electric-cyan border-electric-cyan/30',
  analyst: 'bg-score-fair/15 text-score-fair border-score-fair/30',
  venture_partner: 'bg-score-excellent/15 text-score-excellent border-score-excellent/30',
};

function TeamMemberCard({ member, index }: { member: (typeof allTeamMembers)[number]; index: number }) {
  const badgeColor = roleBadgeColors[member.role] || 'bg-obsidian-600/50 text-obsidian-300 border-obsidian-500/30';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
      className="glass-card p-6 hover:shadow-card-hover transition-all duration-300"
    >
      <div className="flex flex-col items-center text-center">
        {/* Photo */}
        <div className="w-20 h-20 rounded-2xl overflow-hidden bg-obsidian-700 ring-2 ring-white/5 mb-4">
          <Image
            src={member.photo_url}
            alt={member.full_name}
            width={80}
            height={80}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Name */}
        <h3 className="font-display font-semibold text-foreground text-base">{member.full_name}</h3>
        <p className="text-sm text-electric-blue mt-0.5">{member.title}</p>

        {/* Role badge */}
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border mt-2 ${badgeColor}`}>
          {ROLE_LABELS[member.role] || member.role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
        </span>

        {/* Bio */}
        <p className="text-xs text-muted-foreground mt-3 leading-relaxed line-clamp-3">{member.bio}</p>

        {/* Email */}
        <a
          href={`mailto:${member.email}`}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-electric-blue mt-3 transition-colors"
        >
          <Mail className="w-3.5 h-3.5" />
          {member.email}
        </a>
      </div>
    </motion.div>
  );
}

export default function TeamPage() {
  const [roleFilter, setRoleFilter] = useState('all');

  const filtered = useMemo(() => {
    if (roleFilter === 'all') return allTeamMembers;
    return allTeamMembers.filter((m) => m.role === roleFilter);
  }, [roleFilter]);

  return (
    <div className="p-4 lg:p-8 space-y-6 pb-24 lg:pb-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <PageHeader
        title="Team"
        subtitle={`${allTeamMembers.length} team members`}
        actions={
          <Button className="gap-1.5 bg-electric-blue hover:bg-electric-blue/90 text-white">
            <UserPlus className="w-4 h-4" /> Invite Member
          </Button>
        }
      />

      {/* Role filter */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-3"
      >
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[200px] bg-obsidian-800/50 border-obsidian-600/30">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((role) => (
              <SelectItem key={role} value={role}>{ROLE_LABELS[role]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {roleFilter !== 'all' && (
          <p className="text-xs text-muted-foreground">
            {filtered.length} member{filtered.length !== 1 ? 's' : ''}
          </p>
        )}
      </motion.div>

      {/* Team grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((member, i) => (
          <TeamMemberCard key={member.id} member={member} index={i} />
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-12 flex flex-col items-center text-center"
        >
          <Users className="w-8 h-8 text-obsidian-500 mb-3" />
          <p className="text-lg font-display font-semibold text-foreground mb-2">No team members found</p>
          <p className="text-sm text-muted-foreground">No members match the selected role filter.</p>
        </motion.div>
      )}
    </div>
  );
}
