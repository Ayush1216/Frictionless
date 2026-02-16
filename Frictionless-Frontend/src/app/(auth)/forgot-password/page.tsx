'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 1500));
    setIsLoading(false);
    setIsSent(true);
  };

  return (
    <div className="space-y-8">
      <AnimatePresence mode="wait">
        {!isSent ? (
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            {/* Header */}
            <div className="space-y-2">
              <h1 className="text-3xl font-display font-bold text-foreground">
                Reset your password
              </h1>
              <p className="text-muted-foreground">
                Enter your email and we&apos;ll send you a link to reset your
                password.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11 bg-obsidian-800/50 border-obsidian-600/50 focus:border-electric-blue"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-electric-blue hover:bg-electric-blue/90 text-white font-medium"
                disabled={isLoading || !email}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Send reset link
              </Button>
            </form>

            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </motion.div>
        ) : (
          <motion.div
            key="success"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            {/* Success state */}
            <div className="text-center space-y-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', bounce: 0.5, delay: 0.1 }}
                className="mx-auto w-16 h-16 rounded-full bg-score-excellent/20 flex items-center justify-center"
              >
                <CheckCircle2 className="w-8 h-8 text-score-excellent" />
              </motion.div>
              <h1 className="text-3xl font-display font-bold text-foreground">
                Check your email
              </h1>
              <p className="text-muted-foreground max-w-sm mx-auto">
                We&apos;ve sent a password reset link to{' '}
                <span className="text-foreground font-medium">{email}</span>.
                The link will expire in 24 hours.
              </p>
            </div>

            <div className="space-y-3">
              <Button
                type="button"
                className="w-full h-11 bg-electric-blue hover:bg-electric-blue/90 text-white font-medium"
                onClick={() => {
                  setIsSent(false);
                  setEmail('');
                }}
              >
                Send again
              </Button>

              <Link href="/login" className="block">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to sign in
                </Button>
              </Link>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Didn&apos;t receive the email? Check your spam folder or try a
              different email address.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
