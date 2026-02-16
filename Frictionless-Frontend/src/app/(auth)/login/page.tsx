'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  Rocket,
  TrendingUp,
  GraduationCap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/auth-store';
import { mockLogin } from '@/lib/auth';
import { signInWithSupabase, signInWithGoogle } from '@/lib/supabase/auth';
import type { User } from '@/types/database';
import { toast } from 'sonner';

const demoAccounts = [
  {
    type: 'startup' as const,
    label: 'Startup Demo',
    name: 'Sarah Chen',
    org: 'NeuralPay',
    icon: Rocket,
    accent: 'blue',
    borderColor: 'border-electric-blue/30',
    bgColor: 'bg-electric-blue/10',
    hoverBg: 'hover:bg-electric-blue/20',
    textColor: 'text-electric-blue',
    shadowColor: 'hover:shadow-glow',
  },
  {
    type: 'investor' as const,
    label: 'Investor Demo',
    name: 'Hemant Taneja',
    org: 'General Catalyst',
    icon: TrendingUp,
    accent: 'purple',
    borderColor: 'border-electric-purple/30',
    bgColor: 'bg-electric-purple/10',
    hoverBg: 'hover:bg-electric-purple/20',
    textColor: 'text-electric-purple',
    shadowColor: 'hover:shadow-glow-purple',
  },
  {
    type: 'accelerator' as const,
    label: 'Accelerator Demo',
    name: 'Lisa Wang',
    org: 'SKU Accelerator',
    icon: GraduationCap,
    accent: 'cyan',
    borderColor: 'border-electric-cyan/30',
    bgColor: 'bg-electric-cyan/10',
    hoverBg: 'hover:bg-electric-cyan/20',
    textColor: 'text-electric-cyan',
    shadowColor: 'hover:shadow-[0_0_20px_rgba(6,182,212,0.3)]',
  },
];

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { user, error } = await signInWithSupabase({ email, password });
      if (error) {
        toast.error(error);
        return;
      }
      if (user) {
        login(user);
        router.push('/dashboard');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoadingGoogle(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) toast.error(error);
      // If no error, the page will redirect to Google
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Google sign-in failed.');
    } finally {
      setLoadingGoogle(false);
    }
  };

  const handleDemoLogin = async (type: 'startup' | 'investor' | 'accelerator') => {
    setLoadingDemo(type);
    await new Promise((r) => setTimeout(r, 600));
    const user = mockLogin(type);
    login(user as User);
    router.push('/dashboard');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-display font-bold text-foreground">
          Welcome back
        </h1>
        <p className="text-muted-foreground">
          Sign in to your Frictionless Intelligence account
        </p>
      </div>

      {/* Social login buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          className="h-11 font-medium"
          type="button"
          onClick={handleGoogleLogin}
          disabled={loadingGoogle}
        >
          {loadingGoogle ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          )}
          Google
        </Button>
        <Button
          variant="outline"
          className="h-11 font-medium"
          type="button"
        >
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          GitHub
        </Button>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-obsidian-900 px-2 text-muted-foreground">
            Or continue with email
          </span>
        </div>
      </div>

      {/* Login form */}
      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-11 bg-obsidian-800/50 border-obsidian-600/50 focus:border-electric-blue"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 pr-10 h-11 bg-obsidian-800/50 border-obsidian-600/50 focus:border-electric-blue"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-obsidian-600 bg-obsidian-800 text-electric-blue focus:ring-electric-blue/50 focus:ring-offset-0"
            />
            <span className="text-sm text-muted-foreground">Remember me</span>
          </label>
          <Link
            href="/forgot-password"
            className="text-sm text-electric-blue hover:text-electric-blue/80 transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          className="w-full h-11 bg-electric-blue hover:bg-electric-blue/90 text-white font-medium"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          Sign in
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link
          href="/signup"
          className="text-electric-blue hover:text-electric-blue/80 font-medium transition-colors"
        >
          Sign up
        </Link>
      </p>

      {/* Demo Account Cards */}
      <div className="space-y-3 pt-2">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-obsidian-900 px-2 text-muted-foreground">
              Quick Demo Access
            </span>
          </div>
        </div>

        <div className="grid gap-3 pt-1">
          {demoAccounts.map((demo, index) => {
            const Icon = demo.icon;
            return (
              <motion.button
                key={demo.type}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index, duration: 0.3 }}
                onClick={() => handleDemoLogin(demo.type)}
                disabled={loadingDemo !== null}
                className={`
                  w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-200
                  ${demo.borderColor} ${demo.bgColor} ${demo.hoverBg} ${demo.shadowColor}
                  disabled:opacity-50 disabled:cursor-not-allowed
                  group cursor-pointer text-left
                `}
              >
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${demo.bgColor} ${demo.textColor}`}
                >
                  {loadingDemo === demo.type ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {demo.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {demo.name} &middot; {demo.org}
                  </p>
                </div>
                <svg
                  className={`w-4 h-4 ${demo.textColor} opacity-0 group-hover:opacity-100 transition-opacity`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
