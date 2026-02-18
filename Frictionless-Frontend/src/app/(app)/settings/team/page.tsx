'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, MoreVertical, Trash2, Loader2 } from 'lucide-react';
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
import { supabase } from '@/lib/supabase/client';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer' | 'member';
  status: 'active' | 'invited';
  joinedAt: string;
  avatar?: string;
}

const ROLE_DESCRIPTIONS: Record<string, string> = {
  owner: 'Full access, billing, team management',
  admin: 'Manage team, edit all data, run assessments',
  editor: 'Edit company profile, tasks, data room',
  viewer: 'Read-only access to all sections',
};

const roleBadgeColors: Record<string, string> = {
  owner: 'bg-primary/15 text-primary border-primary/30',
  admin: 'bg-accent/15 text-accent border-accent/30',
  editor: 'bg-chart-5/15 text-chart-5 border-chart-5/30',
  viewer: 'bg-muted text-muted-foreground border-border',
};

export default function SettingsTeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState<TeamMember | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'editor' | 'viewer'>('viewer');
  const [inviting, setInviting] = useState(false);

  const getToken = useCallback(async () => {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token ?? null;
  }, []);

  // Fetch real team members on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token || cancelled) {
          setLoadingMembers(false);
          return;
        }
        const res = await fetch('/api/team/members', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({ members: [] }));
        if (!cancelled && data.members) {
          setMembers(
            data.members.map((m: TeamMember) => ({
              ...m,
              role: m.role === 'member' ? 'editor' : m.role,
            }))
          );
        }
      } catch {
        // Silent fail — show empty state
      } finally {
        if (!cancelled) setLoadingMembers(false);
      }
    })();
    return () => { cancelled = true; };
  }, [getToken]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const token = await getToken();
      if (!token) {
        toast.error('Session expired. Please sign in again.');
        return;
      }
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || 'Failed to send invite');
        return;
      }
      const newMember: TeamMember = {
        id: data.invite?.id || `tm-${Date.now()}`,
        name: inviteEmail.split('@')[0],
        email: inviteEmail.trim(),
        role: inviteRole,
        status: 'invited',
        joinedAt: new Date().toISOString().split('T')[0],
      };
      setMembers((prev) => [...prev, newMember]);
      setInviteOpen(false);
      setInviteEmail('');
      setInviteRole('viewer');
      toast.success(`Invitation sent to ${inviteEmail}`);
    } finally {
      setInviting(false);
    }
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
          <Button onClick={() => setInviteOpen(true)} className="gap-2 bg-primary hover:bg-primary/90">
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
              <tr className="border-b border-border">
                <th className="text-left py-4 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Member</th>
                <th className="text-left py-4 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</th>
                <th className="text-left py-4 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left py-4 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Joined</th>
                <th className="w-12 py-4 px-4" />
              </tr>
            </thead>
            <tbody>
              {loadingMembers && (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Loading team members...</p>
                  </td>
                </tr>
              )}
              {!loadingMembers && members.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <p className="text-sm text-muted-foreground">No team members yet. Invite someone to get started.</p>
                  </td>
                </tr>
              )}
              {members.map((member) => (
                <motion.tr
                  key={member.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border-b border-border/50 last:border-0 hover:bg-muted/50 transition-colors"
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={member.avatar} alt={member.name} />
                        <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">
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
                        <DropdownMenuContent align="end" className="bg-card border-border">
                          {(['admin', 'editor', 'viewer'] as const)
                            .filter((r) => r !== member.role)
                            .map((r) => (
                              <DropdownMenuItem
                                key={r}
                                onClick={() => {
                                  setMembers((prev) => prev.map((m) => m.id === member.id ? { ...m, role: r } : m));
                                  toast.success(`${member.name} is now ${r}`);
                                }}
                              >
                                Change to {r}
                              </DropdownMenuItem>
                            ))}
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
        <DialogContent className="bg-card border-border">
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
                className="mt-2 bg-muted border-border"
              />
            </div>
            <div>
              <Label htmlFor="invite-role">Role</Label>
              <Select value={inviteRole} onValueChange={(v: 'admin' | 'editor' | 'viewer') => setInviteRole(v)}>
                <SelectTrigger id="invite-role" className="mt-2 bg-muted border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div>
                      <span className="font-medium">Admin</span>
                      <span className="text-xs text-muted-foreground ml-2">{ROLE_DESCRIPTIONS.admin}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="editor">
                    <div>
                      <span className="font-medium">Editor</span>
                      <span className="text-xs text-muted-foreground ml-2">{ROLE_DESCRIPTIONS.editor}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="viewer">
                    <div>
                      <span className="font-medium">Viewer</span>
                      <span className="text-xs text-muted-foreground ml-2">{ROLE_DESCRIPTIONS.viewer}</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)} className="border-border">
              Cancel
            </Button>
            <Button
              onClick={handleInvite}
              disabled={inviting || !inviteEmail.trim()}
              className="bg-primary hover:bg-primary/90"
            >
              {inviting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Sending…
                </>
              ) : (
                'Send invite'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove confirmation */}
      <Dialog open={!!removeOpen} onOpenChange={() => setRemoveOpen(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Remove team member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {removeOpen?.name} from the team? They will lose access to the organization.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveOpen(null)} className="border-border">
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
