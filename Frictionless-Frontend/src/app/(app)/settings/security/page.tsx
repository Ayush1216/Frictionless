'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Key, Monitor, Smartphone } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const dummySessions = [
  { id: 's1', device: 'Chrome on macOS', ip: '192.168.1.1', lastActive: '2025-02-11T10:30:00Z', current: true },
  { id: 's2', device: 'Safari on iPhone', ip: '192.168.1.2', lastActive: '2025-02-10T18:45:00Z', current: false },
  { id: 's3', device: 'Firefox on Windows', ip: '10.0.0.1', lastActive: '2025-02-08T14:20:00Z', current: false },
];

const dummyLoginHistory = [
  { id: 'l1', date: '2025-02-11T10:30:00Z', ip: '192.168.1.1', success: true },
  { id: 'l2', date: '2025-02-10T18:45:00Z', ip: '192.168.1.2', success: true },
  { id: 'l3', date: '2025-02-09T09:15:00Z', ip: '192.168.1.1', success: true },
  { id: 'l4', date: '2025-02-08T14:20:00Z', ip: '10.0.0.1', success: true },
  { id: 'l5', date: '2025-02-07T11:00:00Z', ip: '192.168.1.1', success: true },
  { id: 'l6', date: '2025-02-06T16:30:00Z', ip: '192.168.1.2', success: true },
  { id: 'l7', date: '2025-02-05T08:45:00Z', ip: '192.168.1.1', success: true },
  { id: 'l8', date: '2025-02-04T13:20:00Z', ip: '192.168.1.1', success: true },
  { id: 'l9', date: '2025-02-03T10:10:00Z', ip: '10.0.0.1', success: true },
  { id: 'l10', date: '2025-02-02T19:00:00Z', ip: '192.168.1.1', success: true },
];

export default function SettingsSecurityPage() {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    new: '',
    confirm: '',
  });

  const handleChangePassword = () => {
    if (passwordForm.new !== passwordForm.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwordForm.new.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    toast.success('Password updated successfully');
    setPasswordForm({ current: '', new: '', confirm: '' });
  };

  const handleRevokeSession = () => {
    toast.success('Session revoked');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security"
        subtitle="Protect your account with strong security settings"
      />

      {/* Change password */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Change password
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="current-pwd">Current password</Label>
              <Input
                id="current-pwd"
                type="password"
                value={passwordForm.current}
                onChange={(e) =>
                  setPasswordForm((p) => ({ ...p, current: e.target.value }))
                }
                placeholder="••••••••"
                className="mt-2 bg-background/50 border-border"
              />
            </div>
            <div>
              <Label htmlFor="new-pwd">New password</Label>
              <Input
                id="new-pwd"
                type="password"
                value={passwordForm.new}
                onChange={(e) =>
                  setPasswordForm((p) => ({ ...p, new: e.target.value }))
                }
                placeholder="••••••••"
                className="mt-2 bg-background/50 border-border"
              />
            </div>
            <div>
              <Label htmlFor="confirm-pwd">Confirm new password</Label>
              <Input
                id="confirm-pwd"
                type="password"
                value={passwordForm.confirm}
                onChange={(e) =>
                  setPasswordForm((p) => ({ ...p, confirm: e.target.value }))
                }
                placeholder="••••••••"
                className="mt-2 bg-background/50 border-border"
              />
            </div>
            <Button onClick={handleChangePassword} className="bg-primary hover:bg-primary/90">
              Update password
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Two-factor authentication */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.1 }}
      >
        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Two-factor authentication
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="font-medium text-foreground">Add an extra layer of security</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Use an authenticator app or SMS to verify your identity when signing in.
                </p>
              </div>
              <Switch
                checked={twoFactorEnabled}
                onCheckedChange={setTwoFactorEnabled}
                className="shrink-0"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Active sessions */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.15 }}
      >
        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="w-5 h-5" />
              Active sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dummySessions.map((session) => (
                <div
                  key={session.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl bg-card/30 border border-border/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      {session.device.includes('iPhone') ? (
                        <Smartphone className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <Monitor className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{session.device}</p>
                      <p className="text-xs text-muted-foreground">
                        {session.ip} • Last active{' '}
                        {format(new Date(session.lastActive), 'MMM d, h:mm a')}
                      </p>
                    </div>
                    {session.current && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                        Current
                      </span>
                    )}
                  </div>
                  {!session.current && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRevokeSession}
                      className="border-border text-muted-foreground hover:text-destructive"
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* API keys (Enterprise) */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.2 }}
      >
        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle>API keys</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 rounded-xl bg-card/30 border border-border/30">
              <p className="text-sm text-muted-foreground">
                API keys are available on the Enterprise plan. Upgrade to access programmatic access to Frictionless Intelligence.
              </p>
              <Button asChild variant="outline" size="sm" className="mt-4 border-border">
                <a href="/pricing">View plans</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Login history */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.25 }}
      >
        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle>Login history</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase">Date</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase">IP Address</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dummyLoginHistory.map((login) => (
                    <tr key={login.id} className="border-b border-border/30 last:border-0">
                      <td className="py-3 px-4 text-sm">
                        {format(new Date(login.date), 'MMM d, yyyy h:mm a')}
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{login.ip}</td>
                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            'text-xs px-2 py-0.5 rounded-full',
                            login.success
                              ? 'bg-score-excellent/20 text-score-excellent'
                              : 'bg-destructive/20 text-destructive'
                          )}
                        >
                          {login.success ? 'Success' : 'Failed'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
