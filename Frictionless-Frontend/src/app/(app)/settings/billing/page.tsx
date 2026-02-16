'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { CreditCard, TrendingUp, Zap, FileText, Download } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const dummyBilling = {
  plan: 'Starter',
  status: 'active' as const,
  usage: {
    assessments: { used: 4, limit: 5 },
    matches: { used: 2, limit: 3 },
    storage: { used: 45, limit: 100 }, // MB
  },
  paymentMethod: {
    brand: 'Visa',
    last4: '4242',
    expMonth: 12,
    expYear: 2026,
  },
  invoices: [
    { id: 'inv-1', date: '2025-02-01', amount: 49, status: 'paid' as const },
    { id: 'inv-2', date: '2025-01-01', amount: 49, status: 'paid' as const },
    { id: 'inv-3', date: '2024-12-01', amount: 49, status: 'paid' as const },
    { id: 'inv-4', date: '2024-11-01', amount: 49, status: 'paid' as const },
    { id: 'inv-5', date: '2024-10-01', amount: 49, status: 'paid' as const },
  ],
};

export default function SettingsBillingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        subtitle="Manage your plan and payment details"
        actions={
          <Button asChild className="bg-electric-blue hover:bg-electric-blue/90">
            <Link href="/pricing">Upgrade Plan</Link>
          </Button>
        }
      />

      {/* Current plan */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Card className="glass-card border-obsidian-600/50">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Current Plan</span>
              <span
                className={cn(
                  'text-sm font-normal px-3 py-1 rounded-full',
                  dummyBilling.status === 'active'
                    ? 'bg-score-excellent/20 text-score-excellent'
                    : 'bg-obsidian-600 text-obsidian-300'
                )}
              >
                {dummyBilling.plan}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              You&apos;re on the <strong className="text-foreground">{dummyBilling.plan}</strong> plan. Upgrade for unlimited assessments, matches, and AI features.
            </p>
            <Button asChild variant="outline" className="mt-4 border-electric-blue text-electric-blue hover:bg-electric-blue/10">
              <Link href="/pricing">Upgrade Plan</Link>
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Usage stats */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.1 }}
      >
        <Card className="glass-card border-obsidian-600/50">
          <CardHeader>
            <CardTitle>Usage this month</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-electric-blue" />
                  Assessments
                </span>
                <span className="text-sm text-muted-foreground">
                  {dummyBilling.usage.assessments.used} / {dummyBilling.usage.assessments.limit}
                </span>
              </div>
              <Progress
                value={
                  (dummyBilling.usage.assessments.used /
                    dummyBilling.usage.assessments.limit) *
                  100
                }
                className="h-2"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-2 text-sm">
                  <Zap className="w-4 h-4 text-electric-purple" />
                  Matches
                </span>
                <span className="text-sm text-muted-foreground">
                  {dummyBilling.usage.matches.used} / {dummyBilling.usage.matches.limit}
                </span>
              </div>
              <Progress
                value={
                  (dummyBilling.usage.matches.used /
                    dummyBilling.usage.matches.limit) *
                  100
                }
                className="h-2"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4 text-electric-cyan" />
                  Storage
                </span>
                <span className="text-sm text-muted-foreground">
                  {dummyBilling.usage.storage.used} / {dummyBilling.usage.storage.limit} MB
                </span>
              </div>
              <Progress
                value={
                  (dummyBilling.usage.storage.used /
                    dummyBilling.usage.storage.limit) *
                  100
                }
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Payment method */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.15 }}
      >
        <Card className="glass-card border-obsidian-600/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Payment method
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 rounded-xl bg-obsidian-800/50 border border-obsidian-600/50">
              <div>
                <p className="font-medium text-foreground">{dummyBilling.paymentMethod.brand} •••• {dummyBilling.paymentMethod.last4}</p>
                <p className="text-xs text-muted-foreground">
                  Expires {dummyBilling.paymentMethod.expMonth}/{dummyBilling.paymentMethod.expYear}
                </p>
              </div>
              <Button variant="outline" size="sm" className="border-obsidian-600">
                Update
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Billing history */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.2 }}
      >
        <Card className="glass-card border-obsidian-600/50">
          <CardHeader>
            <CardTitle>Billing history</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dummyBilling.invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between py-3 px-4 rounded-lg bg-obsidian-800/30 hover:bg-obsidian-800/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(inv.date), 'MMM d, yyyy')}
                    </span>
                    <span className="font-medium">${inv.amount}.00</span>
                    <span
                      className={cn(
                        'text-xs px-2 py-0.5 rounded-full capitalize',
                        inv.status === 'paid'
                          ? 'bg-score-excellent/20 text-score-excellent'
                          : 'bg-score-fair/20 text-score-fair'
                      )}
                    >
                      {inv.status}
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" className="gap-1">
                    <Download className="w-4 h-4" />
                    Download
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
