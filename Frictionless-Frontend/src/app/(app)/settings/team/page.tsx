'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, MoreVertical, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  status: 'active' | 'invited';
  joinedAt: string;
  avatar?: string;
}

const dummyMembers: TeamMember[] = [
  { id: 'tm-1', name: 'Alex Chen', email: 'alex@neuralpay.io', role: 'owner', status: 'active', joinedAt: '2024-01-15', avatar: undefined },
  { id: 'tm-2', name: 'Sarah Mitchell', email: 'sarah@neuralpay.io', role: 'admin', status: 'active', joinedAt: '2024-03-22', avatar: undefined },
  { id: 'tm-3', name: 'James Wilson', email: 'james@neuralpay.io', role: 'member', status: 'active', joinedAt: '2024-05-10', avatar: undefined },
  { id: 'tm-4', name: 'Emily Davis', email: 'emily@neuralpay.io', role: 'member', status: 'invited', joinedAt: '2025-02-01', avatar: undefined },
  { id: 'tm-5', name: 'Michael Brown', email: 'michael@neuralpay.io', role: 'member', status: 'active', joinedAt: '2024-08-05', avatar: undefined },
];

const roleBadgeColors: Record<string, string> = {
  owner: 'bg-electric-purple/20 text-electric-purple border-electric-purple/30',
  admin: 'bg-electric-blue/20 text-electric-blue border-electric-blue/30',
  member: 'bg-obsidian-600/50 text-obsidian-300 border-obsidian-500/50',
};

export default function SettingsTeamPage() {
  const [members, setMembers] = useState<TeamMember[]>(dummyMembers);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState<TeamMember | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');

  const handleInvite = () => {
    if (!inviteEmail.trim()) return;
    const newMember: TeamMember = {
      id: `tm-${Date.now()}`,
      name: inviteEmail.split('@')[0],
      email: inviteEmail,
      role: inviteRole,
      status: 'invited',
      joinedAt: new Date().toISOString().split('T')[0],
    };
    setMembers((prev) => [...prev, newMember]);
    setInviteOpen(false);
    setInviteEmail('');
    setInviteRole('member');
    toast.success(`Invitation sent to ${inviteEmail}`);
  };

  const handleRemove = (member: TeamMember) => {
    setMembers((prev) => prev.filter((m) => m.id !== member.id));
    setRemoveOpen(null);
    toast.success(`${member.name} has been removed from the team`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        subtitle="Manage your team members and invites"
        actions={
          <Button onClick={() => setInviteOpen(true)} className="gap-2 bg-electric-blue hover:bg-electric-blue/90">
            <UserPlus className="w-4 h-4" />
            Invite Member
          </Button>
        }
      />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-xl overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-obsidian-600/50">
                <th className="text-left py-4 px-4 text-xs font-semibold text-obsidian-400 uppercase tracking-wider">Member</th>
                <th className="text-left py-4 px-4 text-xs font-semibold text-obsidian-400 uppercase tracking-wider">Role</th>
                <th className="text-left py-4 px-4 text-xs font-semibold text-obsidian-400 uppercase tracking-wider">Status</th>
                <th className="text-left py-4 px-4 text-xs font-semibold text-obsidian-400 uppercase tracking-wider">Joined</th>
                <th className="w-12 py-4 px-4" />
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <motion.tr
                  key={member.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border-b border-obsidian-600/30 last:border-0 hover:bg-obsidian-800/30 transition-colors"
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={member.avatar} alt={member.name} />
                        <AvatarFallback className="bg-electric-blue/20 text-electric-blue text-xs font-bold">
                          {member.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <Badge
                      variant="outline"
                      className={cn('capitalize', roleBadgeColors[member.role])}
                    >
                      {member.role}
                    </Badge>
                  </td>
                  <td className="py-4 px-4">
                    <span
                      className={cn(
                        'text-sm',
                        member.status === 'active' ? 'text-score-excellent' : 'text-score-fair'
                      )}
                    >
                      {member.status === 'active' ? 'Active' : 'Invited'}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-sm text-muted-foreground">
                    {format(new Date(member.joinedAt), 'MMM d, yyyy')}
                  </td>
                  <td className="py-4 px-4">
                    {member.role !== 'owner' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-obsidian-900 border-obsidian-600">
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setRemoveOpen(member)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Invite modal */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="bg-obsidian-900 border-obsidian-600">
          <DialogHeader>
            <DialogTitle>Invite team member</DialogTitle>
            <DialogDescription>
              Send an invitation to collaborate on your organization. They will receive an email with a link to join.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="invite-email">Email address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="mt-2 bg-obsidian-800 border-obsidian-600"
              />
            </div>
            <div>
              <Label htmlFor="invite-role">Role</Label>
              <Select value={inviteRole} onValueChange={(v: 'admin' | 'member') => setInviteRole(v)}>
                <SelectTrigger id="invite-role" className="mt-2 bg-obsidian-800 border-obsidian-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)} className="border-obsidian-600">
              Cancel
            </Button>
            <Button onClick={handleInvite} className="bg-electric-blue hover:bg-electric-blue/90">
              Send invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove confirmation */}
      <Dialog open={!!removeOpen} onOpenChange={() => setRemoveOpen(null)}>
        <DialogContent className="bg-obsidian-900 border-obsidian-600">
          <DialogHeader>
            <DialogTitle>Remove team member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {removeOpen?.name} from the team? They will lose access to the organization.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveOpen(null)} className="border-obsidian-600">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => removeOpen && handleRemove(removeOpen)}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
