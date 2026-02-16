'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Rocket,
  Building2,
  Users,
  FileUp,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  SkipForward,
  Check,
  Briefcase,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StepIndicator } from './StepIndicator';
import { FileDropzone } from '@/components/shared/FileDropzone';
import { AnimatedGauge } from '@/components/charts/AnimatedGauge';

const STEPS = [
  { label: 'Welcome' },
  { label: 'Company' },
  { label: 'Team' },
  { label: 'Documents' },
  { label: 'Analysis' },
];

type Role = 'startup' | 'investor' | 'accelerator' | '';

interface CompanyInfo {
  name: string;
  website: string;
  sector: string;
  stage: string;
  city: string;
  state: string;
}

interface FounderInfo {
  name: string;
  title: string;
  bio: string;
}

const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({
    x: dir > 0 ? -80 : 80,
    opacity: 0,
  }),
};

export function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);

  // Step 1: Role
  const [role, setRole] = useState<Role>('');

  // Step 2: Company
  const [company, setCompany] = useState<CompanyInfo>({
    name: '',
    website: '',
    sector: '',
    stage: '',
    city: '',
    state: '',
  });

  // Step 3: Founders
  const [founders, setFounders] = useState<FounderInfo[]>([
    { name: '', title: '', bio: '' },
  ]);

  // Step 5: Analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);

  const goNext = () => {
    if (currentStep === 3) {
      // Going to analysis step
      setDirection(1);
      setCurrentStep(4);
      setAnalyzing(true);
      // Simulate analysis
      setTimeout(() => {
        setAnalyzing(false);
        setAnalysisComplete(true);
      }, 3000);
      return;
    }
    if (currentStep < STEPS.length - 1) {
      setDirection(1);
      setCurrentStep((s) => s + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep((s) => s - 1);
    }
  };

  const canProceed = () => {
    if (currentStep === 0) return !!role;
    if (currentStep === 1) return !!company.name;
    return true;
  };

  const addFounder = () => {
    setFounders([...founders, { name: '', title: '', bio: '' }]);
  };

  const updateFounder = (idx: number, field: keyof FounderInfo, value: string) => {
    setFounders(
      founders.map((f, i) => (i === idx ? { ...f, [field]: value } : f))
    );
  };

  return (
    <div className="min-h-[80vh] flex flex-col">
      {/* Step indicator */}
      <div className="px-4 pt-6 pb-4 sm:px-8">
        <StepIndicator steps={STEPS} currentStep={currentStep} />
      </div>

      {/* Step content */}
      <div className="flex-1 flex items-center justify-center px-4 py-6 sm:px-8">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait" custom={direction}>
            {/* Step 0: Welcome / Role */}
            {currentStep === 0 && (
              <motion.div
                key="step-0"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="text-center space-y-2">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', delay: 0.2 }}
                    className="w-16 h-16 rounded-2xl bg-electric-blue/10 flex items-center justify-center mx-auto"
                  >
                    <Rocket className="w-8 h-8 text-electric-blue" />
                  </motion.div>
                  <h2 className="text-2xl font-display font-bold text-foreground">
                    Welcome to Frictionless
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    Let&apos;s set up your profile. First, tell us who you are.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { value: 'startup' as Role, label: 'Startup', icon: Rocket, desc: 'Raising capital' },
                    { value: 'investor' as Role, label: 'Investor', icon: TrendingUp, desc: 'Finding deals' },
                    { value: 'accelerator' as Role, label: 'Accelerator', icon: Briefcase, desc: 'Supporting startups' },
                  ].map((r) => (
                    <button
                      key={r.value}
                      onClick={() => setRole(r.value)}
                      className={`p-4 rounded-xl border-2 text-center transition-all ${
                        role === r.value
                          ? 'border-electric-blue bg-electric-blue/10'
                          : 'border-obsidian-600 bg-obsidian-800/50 hover:border-obsidian-500'
                      }`}
                    >
                      <r.icon
                        className={`w-6 h-6 mx-auto mb-2 ${
                          role === r.value ? 'text-electric-blue' : 'text-muted-foreground'
                        }`}
                      />
                      <p className="text-sm font-medium text-foreground">{r.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{r.desc}</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 1: Company Info */}
            {currentStep === 1 && (
              <motion.div
                key="step-1"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="space-y-5"
              >
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-xl bg-electric-purple/10 flex items-center justify-center mx-auto">
                    <Building2 className="w-6 h-6 text-electric-purple" />
                  </div>
                  <h2 className="text-xl font-display font-bold text-foreground">
                    Company Information
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    Tell us about your company.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">
                      Company Name *
                    </label>
                    <Input
                      value={company.name}
                      onChange={(e) => setCompany({ ...company, name: e.target.value })}
                      placeholder="e.g. NeuralPay"
                      className="bg-obsidian-800 border-obsidian-600"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">
                      Website
                    </label>
                    <Input
                      value={company.website}
                      onChange={(e) => setCompany({ ...company, website: e.target.value })}
                      placeholder="https://example.com"
                      className="bg-obsidian-800 border-obsidian-600"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">Sector</label>
                      <Select
                        value={company.sector}
                        onValueChange={(v) => setCompany({ ...company, sector: v })}
                      >
                        <SelectTrigger className="bg-obsidian-800 border-obsidian-600">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent className="bg-obsidian-800 border-obsidian-600">
                          {['Fintech', 'Healthtech', 'SaaS', 'Cleantech', 'E-commerce', 'Cybersecurity', 'Edtech', 'Biotech', 'Other'].map(
                            (s) => (
                              <SelectItem key={s} value={s.toLowerCase()}>
                                {s}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">Stage</label>
                      <Select
                        value={company.stage}
                        onValueChange={(v) => setCompany({ ...company, stage: v })}
                      >
                        <SelectTrigger className="bg-obsidian-800 border-obsidian-600">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent className="bg-obsidian-800 border-obsidian-600">
                          {['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C+'].map((s) => (
                            <SelectItem key={s} value={s.toLowerCase().replace(/\s+/g, '_')}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">City</label>
                      <Input
                        value={company.city}
                        onChange={(e) => setCompany({ ...company, city: e.target.value })}
                        placeholder="San Francisco"
                        className="bg-obsidian-800 border-obsidian-600"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">State</label>
                      <Input
                        value={company.state}
                        onChange={(e) => setCompany({ ...company, state: e.target.value })}
                        placeholder="CA"
                        className="bg-obsidian-800 border-obsidian-600"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Team */}
            {currentStep === 2 && (
              <motion.div
                key="step-2"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="space-y-5"
              >
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-xl bg-electric-cyan/10 flex items-center justify-center mx-auto">
                    <Users className="w-6 h-6 text-electric-cyan" />
                  </div>
                  <h2 className="text-xl font-display font-bold text-foreground">
                    Founding Team
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    Add your co-founders and key team members.
                  </p>
                </div>

                <div className="space-y-4">
                  {founders.map((founder, idx) => (
                    <div
                      key={idx}
                      className="space-y-3 p-4 rounded-xl bg-obsidian-800/50 border border-obsidian-600/50"
                    >
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Founder {idx + 1}
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          value={founder.name}
                          onChange={(e) => updateFounder(idx, 'name', e.target.value)}
                          placeholder="Full name"
                          className="bg-obsidian-800 border-obsidian-600"
                        />
                        <Input
                          value={founder.title}
                          onChange={(e) => updateFounder(idx, 'title', e.target.value)}
                          placeholder="Title (e.g. CEO)"
                          className="bg-obsidian-800 border-obsidian-600"
                        />
                      </div>
                      <Textarea
                        value={founder.bio}
                        onChange={(e) => updateFounder(idx, 'bio', e.target.value)}
                        placeholder="Short bio..."
                        className="bg-obsidian-800 border-obsidian-600 resize-none"
                        rows={2}
                      />
                    </div>
                  ))}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={addFounder}
                    className="w-full"
                  >
                    + Add Another Founder
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Documents */}
            {currentStep === 3 && (
              <motion.div
                key="step-3"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="space-y-5"
              >
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-xl bg-score-excellent/10 flex items-center justify-center mx-auto">
                    <FileUp className="w-6 h-6 text-score-excellent" />
                  </div>
                  <h2 className="text-xl font-display font-bold text-foreground">
                    Upload Documents
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    Upload your pitch deck and financial model for AI analysis.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Pitch Deck
                    </label>
                    <FileDropzone
                      accept=".pdf,.pptx,.ppt"
                      maxSize={25 * 1024 * 1024}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Financial Model
                    </label>
                    <FileDropzone
                      accept=".xlsx,.xls,.csv"
                      maxSize={25 * 1024 * 1024}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 4: Analysis */}
            {currentStep === 4 && (
              <motion.div
                key="step-4"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="space-y-6 text-center"
              >
                {analyzing ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
                      className="w-16 h-16 rounded-2xl bg-electric-purple/10 flex items-center justify-center mx-auto"
                    >
                      <Sparkles className="w-8 h-8 text-electric-purple" />
                    </motion.div>
                    <div className="space-y-2">
                      <h2 className="text-xl font-display font-bold text-foreground">
                        AI is analyzing your documents...
                      </h2>
                      <p className="text-muted-foreground text-sm">
                        This usually takes 30-60 seconds. Hang tight!
                      </p>
                    </div>
                    {/* Shimmer bars */}
                    <div className="space-y-3 max-w-xs mx-auto">
                      {[1, 2, 3].map((i) => (
                        <motion.div
                          key={i}
                          className="h-3 rounded-full bg-obsidian-700 overflow-hidden"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.2 }}
                        >
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-electric-blue via-electric-purple to-electric-cyan"
                            animate={{
                              x: ['-100%', '100%'],
                            }}
                            transition={{
                              repeat: Infinity,
                              duration: 1.5,
                              delay: i * 0.3,
                              ease: 'easeInOut',
                            }}
                            style={{ width: '50%' }}
                          />
                        </motion.div>
                      ))}
                    </div>
                  </>
                ) : (
                  analysisComplete && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="space-y-6"
                    >
                      <div className="space-y-2">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', delay: 0.2 }}
                          className="w-14 h-14 rounded-full bg-score-excellent/10 flex items-center justify-center mx-auto"
                        >
                          <Check className="w-7 h-7 text-score-excellent" />
                        </motion.div>
                        <h2 className="text-xl font-display font-bold text-foreground">
                          Analysis Complete!
                        </h2>
                        <p className="text-muted-foreground text-sm">
                          Your initial readiness score has been calculated.
                        </p>
                      </div>

                      <AnimatedGauge score={65} size={200} strokeWidth={14} />

                      <p className="text-sm text-muted-foreground">
                        Complete your profile and upload more documents to improve your score.
                      </p>

                      <Button
                        className="bg-electric-blue hover:bg-electric-blue/90 gap-2"
                        onClick={() => {
                          // Navigate to dashboard
                          window.location.href = '/dashboard';
                        }}
                      >
                        Go to Dashboard <ChevronRight className="w-4 h-4" />
                      </Button>
                    </motion.div>
                  )
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom nav buttons */}
      {currentStep < 4 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-between px-4 py-4 sm:px-8 border-t border-obsidian-700"
        >
          <Button
            variant="ghost"
            onClick={goBack}
            disabled={currentStep === 0}
            className="gap-1"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>

          <div className="flex items-center gap-2">
            {currentStep < 3 && (
              <Button variant="ghost" onClick={goNext} className="gap-1 text-muted-foreground">
                Skip <SkipForward className="w-4 h-4" />
              </Button>
            )}
            <Button
              onClick={goNext}
              disabled={!canProceed()}
              className="gap-1 bg-electric-blue hover:bg-electric-blue/90"
            >
              {currentStep === 3 ? 'Analyze' : 'Next'} <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
