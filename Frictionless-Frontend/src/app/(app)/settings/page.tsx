'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon, Upload } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuthStore } from '@/stores/auth-store';
import { useUIStore } from '@/stores/ui-store';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const { theme, setTheme } = useUIStore();

  const [profile, setProfile] = useState({
    name: user?.full_name ?? 'Alex Chen',
    email: user?.email ?? 'alex@neuralpay.io',
    bio: 'Founder at NeuralPay. Building the future of payments.',
  });
  const [org, setOrg] = useState({
    name: user?.org_name ?? 'NeuralPay',
    website: 'https://neuralpay.io',
  });
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    matchAlerts: true,
    weeklyDigest: false,
    language: 'en',
    timezone: 'America/Los_Angeles',
  });
  const [demoMode, setDemoMode] = useState(false);

  const handleSaveProfile = () => {
    toast.success('Profile updated');
  };

  const handleSaveOrg = () => {
    toast.success('Organization updated');
  };

  const handleSavePreferences = () => {
    toast.success('Preferences saved');
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="General Settings"
        subtitle="Manage your profile and preferences"
      />

      {/* Profile section */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-xl p-6"
      >
        <h2 className="text-lg font-display font-semibold text-foreground mb-4">Profile</h2>
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="flex flex-col items-center sm:items-start gap-2">
            <Avatar className="h-24 w-24">
              <AvatarImage src={user?.avatar_url ?? undefined} alt={profile.name} />
              <AvatarFallback className="bg-electric-blue/20 text-electric-blue text-2xl font-bold">
                {profile.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <Button variant="outline" size="sm" className="gap-2 border-obsidian-600">
              <Upload className="w-4 h-4" />
              Upload
            </Button>
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={profile.name}
                onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                className="mt-1.5 bg-obsidian-900/50 border-obsidian-600"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                className="mt-1.5 bg-obsidian-900/50 border-obsidian-600"
              />
            </div>
            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={profile.bio}
                onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
                rows={3}
                className="mt-1.5 bg-obsidian-900/50 border-obsidian-600"
              />
            </div>
            <Button onClick={handleSaveProfile} className="bg-electric-blue hover:bg-electric-blue/90">
              Save Profile
            </Button>
          </div>
        </div>
      </motion.section>

      {/* Organization section */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-xl p-6"
      >
        <h2 className="text-lg font-display font-semibold text-foreground mb-4">Organization</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="org-name">Organization name</Label>
            <Input
              id="org-name"
              value={org.name}
              onChange={(e) => setOrg((o) => ({ ...o, name: e.target.value }))}
              className="mt-1.5 bg-obsidian-900/50 border-obsidian-600"
            />
          </div>
          <div>
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              value={org.website}
              onChange={(e) => setOrg((o) => ({ ...o, website: e.target.value }))}
              placeholder="https://"
              className="mt-1.5 bg-obsidian-900/50 border-obsidian-600"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-obsidian-700 flex items-center justify-center text-obsidian-400 text-sm font-bold">
              {org.name.charAt(0)}
            </div>
            <Button variant="outline" size="sm" className="border-obsidian-600">
              Upload logo
            </Button>
          </div>
          <Button onClick={handleSaveOrg} className="bg-electric-blue hover:bg-electric-blue/90">
            Save Organization
          </Button>
        </div>
      </motion.section>

      {/* Preferences section */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card rounded-xl p-6"
      >
        <h2 className="text-lg font-display font-semibold text-foreground mb-4">Preferences</h2>

        {/* Theme toggle */}
        <div className="flex items-center justify-between py-4 border-b border-obsidian-600/50">
          <div className="flex items-center gap-3">
            {theme === 'dark' ? (
              <Moon className="w-5 h-5 text-electric-purple" />
            ) : (
              <Sun className="w-5 h-5 text-score-fair" />
            )}
            <div>
              <p className="font-medium text-foreground">Theme</p>
              <p className="text-xs text-muted-foreground">Dark or light mode</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setTheme('dark')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                theme === 'dark'
                  ? 'bg-electric-blue text-white'
                  : 'bg-obsidian-800 text-obsidian-400 hover:text-foreground'
              )}
            >
              Dark
            </button>
            <button
              onClick={() => setTheme('light')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                theme === 'light'
                  ? 'bg-electric-blue text-white'
                  : 'bg-obsidian-800 text-obsidian-400 hover:text-foreground'
              )}
            >
              Light
            </button>
          </div>
        </div>

        {/* Notification preferences */}
        <div className="space-y-4 py-4 border-b border-obsidian-600/50">
          <p className="font-medium text-foreground">Notifications</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="email-notif" className="font-normal">Email notifications</Label>
              <Switch
                id="email-notif"
                checked={preferences.emailNotifications}
                onCheckedChange={(c) =>
                  setPreferences((p) => ({ ...p, emailNotifications: c }))
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="match-alerts" className="font-normal">Match alerts</Label>
              <Switch
                id="match-alerts"
                checked={preferences.matchAlerts}
                onCheckedChange={(c) =>
                  setPreferences((p) => ({ ...p, matchAlerts: c }))
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="weekly-digest" className="font-normal">Weekly digest</Label>
              <Switch
                id="weekly-digest"
                checked={preferences.weeklyDigest}
                onCheckedChange={(c) =>
                  setPreferences((p) => ({ ...p, weeklyDigest: c }))
                }
              />
            </div>
          </div>
        </div>

        {/* Language */}
        <div className="py-4 border-b border-obsidian-600/50">
          <Label htmlFor="language">Language</Label>
          <Select
            value={preferences.language}
            onValueChange={(v) =>
              setPreferences((p) => ({ ...p, language: v }))
            }
          >
            <SelectTrigger id="language" className="mt-2 bg-obsidian-900/50 border-obsidian-600">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Español</SelectItem>
              <SelectItem value="fr">Français</SelectItem>
              <SelectItem value="de">Deutsch</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Timezone */}
        <div className="py-4">
          <Label htmlFor="timezone">Timezone</Label>
          <Select
            value={preferences.timezone}
            onValueChange={(v) =>
              setPreferences((p) => ({ ...p, timezone: v }))
            }
          >
            <SelectTrigger id="timezone" className="mt-2 bg-obsidian-900/50 border-obsidian-600">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="America/Los_Angeles">Pacific (Los Angeles)</SelectItem>
              <SelectItem value="America/New_York">Eastern (New York)</SelectItem>
              <SelectItem value="Europe/London">London</SelectItem>
              <SelectItem value="Europe/Paris">Paris</SelectItem>
              <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
              <SelectItem value="Asia/Singapore">Singapore</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleSavePreferences} className="mt-4 bg-electric-blue hover:bg-electric-blue/90">
          Save Preferences
        </Button>
      </motion.section>

      {/* Demo Mode */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card rounded-xl p-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-display font-semibold text-foreground">Demo Mode</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Enable demo mode to use sample data and explore features without affecting your real data. Perfect for demos and testing.
            </p>
          </div>
          <Switch
            checked={demoMode}
            onCheckedChange={setDemoMode}
            className="shrink-0"
          />
        </div>
      </motion.section>
    </div>
  );
}
