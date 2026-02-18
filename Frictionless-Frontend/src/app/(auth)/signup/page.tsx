'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Rocket,
  TrendingUp,
  GraduationCap,
  Mail,
  Lock,
  User,
  Globe,
  Building2,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/auth-store';
import { signUpWithSupabase, fetchUserFromSession } from '@/lib/supabase/auth';
import type { User as UserType } from '@/types/database';
import { toast } from 'sonner';

type OrgType = 'startup' | 'capital_provider' | 'accelerator';

const orgTypes = [
  {
    type: 'startup' as OrgType,
    label: 'Startup',
    description: 'Get scored, matched, and funded',
    icon: Rocket,
    color: 'primary',
    borderColor: 'border-primary/30',
    bgColor: 'bg-primary/10',
    hoverBg: 'hover:border-primary/60',
    textColor: 'text-primary',
    selectedBg: 'bg-primary/20 border-primary',
  },
  {
    type: 'capital_provider' as OrgType,
    label: 'Investor',
    description: 'Discover startups and manage deal flow',
    icon: TrendingUp,
    color: 'accent',
    borderColor: 'border-accent/30',
    bgColor: 'bg-accent/10',
    hoverBg: 'hover:border-accent/60',
    textColor: 'text-accent',
    selectedBg: 'bg-accent/20 border-accent',
  },
  {
    type: 'accelerator' as OrgType,
    label: 'Accelerator',
    description: 'Manage programs and mentor startups',
    icon: GraduationCap,
    color: 'accent',
    borderColor: 'border-accent/30',
    bgColor: 'bg-accent/10',
    hoverBg: 'hover:border-accent/60',
    textColor: 'text-accent',
    selectedBg: 'bg-accent/20 border-accent',
  },
];

const steps = ['Organization Type', 'Your Details', 'Organization'];

export default function SignupPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [selectedOrgType, setSelectedOrgType] = useState<OrgType | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [website, setWebsite] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  const canContinue = () => {
    if (step === 0) return selectedOrgType !== null;
    if (step === 1) return fullName && email && password.length >= 8;
    if (step === 2) return orgName && agreeTerms;
    return false;
  };

  const handleNext = () => {
    if (step < 2) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    if (!selectedOrgType) return;
    setIsLoading(true);
    try {
      const { error } = await signUpWithSupabase({
        email,
        password,
        fullName: fullName.trim(),
        orgType: selectedOrgType,
        orgName: orgName.trim(),
        website: website.trim() || undefined,
      });
      if (error) {
        toast.error(error);
        setIsLoading(false);
        return;
      }
      const user = await fetchUserFromSession();
      if (user) {
        login(user as UserType);
        if (user.org_type === 'startup' || user.org_type === 'capital_provider') {
          router.push('/onboarding/chat');
        } else {
          router.push('/dashboard');
        }
      } else {
        toast.success('Account created. Please sign in.');
        router.push('/login');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong.');
    }
    setIsLoading(false);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-display font-bold text-foreground">
          Create your account
        </h1>
        <p className="text-muted-foreground">
          Get started with Frictionless Intelligence
        </p>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center gap-2">
        {steps.map((label, i) => (
          <div key={label} className="flex items-center gap-2 flex-1">
            <div
              className={`
                flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all
                ${
                  i < step
                    ? 'bg-primary text-white'
                    : i === step
                    ? 'bg-primary/20 text-primary border border-primary'
                    : 'bg-card text-muted-foreground border border-border'
                }
              `}
            >
              {i < step ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span
              className={`text-xs hidden sm:block ${
                i <= step ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              {label}
            </span>
            {i < steps.length - 1 && (
              <div
                className={`flex-1 h-px ${
                  i < step ? 'bg-primary' : 'bg-border'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="step-0"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <p className="text-sm text-muted-foreground">
              What best describes your organization?
            </p>
            <div className="space-y-3">
              {orgTypes.map((org) => {
                const Icon = org.icon;
                const isSelected = selectedOrgType === org.type;
                return (
                  <button
                    key={org.type}
                    onClick={() => setSelectedOrgType(org.type)}
                    className={`
                      w-full flex items-center gap-4 p-5 rounded-xl border-2 transition-all duration-200 text-left
                      ${isSelected ? org.selectedBg : `${org.borderColor} ${org.hoverBg} bg-card/30`}
                    `}
                  >
                    <div
                      className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${org.bgColor} ${org.textColor}`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">
                        {org.label}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {org.description}
                      </p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isSelected
                          ? `${org.textColor} border-current`
                          : 'border-border'
                      }`}
                    >
                      {isSelected && (
                        <div className="w-2.5 h-2.5 rounded-full bg-current" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div
            key="step-1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-10 h-11 bg-card/50 border-border/50 focus:border-primary"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11 bg-card/50 border-border/50 focus:border-primary"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-11 bg-card/50 border-border/50 focus:border-primary"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters
              </p>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step-2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="org-name">Organization name</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="org-name"
                  placeholder="Acme Inc."
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="pl-10 h-11 bg-card/50 border-border/50 focus:border-primary"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">
                Website{' '}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="website"
                  type="url"
                  placeholder="https://acme.com"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="pl-10 h-11 bg-card/50 border-border/50 focus:border-primary"
                />
              </div>
            </div>

            <label className="flex items-start gap-3 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-border bg-card text-primary focus:ring-primary/50 focus:ring-offset-0"
              />
              <span className="text-sm text-muted-foreground leading-relaxed">
                I agree to the{' '}
                <Link href="/legal/terms" className="text-primary hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/legal/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
              </span>
            </label>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation buttons */}
      <div className="flex gap-3">
        {step > 0 && (
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={handleBack}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        )}

        {step < 2 ? (
          <Button
            type="button"
            className="flex-1 h-11 bg-primary hover:bg-primary/90 text-white font-medium"
            onClick={handleNext}
            disabled={!canContinue()}
          >
            Continue
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button
            type="button"
            className="flex-1 h-11 bg-primary hover:bg-primary/90 text-white font-medium"
            onClick={handleSubmit}
            disabled={!canContinue() || isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Create account
          </Button>
        )}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link
          href="/login"
          className="text-primary hover:text-primary/80 font-medium transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
