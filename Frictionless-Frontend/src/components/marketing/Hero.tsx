'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Play, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { GradientMeshBackground } from './GradientMeshBackground';
import { AnimatedCounter } from './AnimatedCounter';

export function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-4">
      <GradientMeshBackground />

      {/* Badge */}
      <motion.div
        className="mb-8 md:mb-10"
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <div className="glass rounded-full px-4 py-2 md:px-5 md:py-2.5 flex items-center gap-2 text-sm text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </span>
          <span>Now in public beta</span>
          <span className="text-muted-foreground/70">·</span>
          <Link
            href="/pricing"
            className="text-primary hover:text-accent transition-colors"
          >
            See what&apos;s new →
          </Link>
        </div>
      </motion.div>

      {/* Headline */}
      <motion.h1
        className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-extrabold text-center leading-[1.1] max-w-5xl mb-6 md:mb-8"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.2 }}
      >
        Raise Smarter.{' '}
        <span className="gradient-text">Match Better.</span>
        <br />
        Score Higher.
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        className="text-base sm:text-lg md:text-xl text-muted-foreground text-center max-w-2xl mb-10 md:mb-12 leading-relaxed font-body"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        The AI-powered platform that scores your investment readiness,
        matches you with ideal investors, and accelerates fundraising success.
      </motion.p>

      {/* CTAs */}
      <motion.div
        className="flex flex-col sm:flex-row items-center gap-4 mb-16 md:mb-20"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.55 }}
      >
        <Link
          href="/register"
          className="group relative inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-display font-semibold text-white bg-neon-gradient animated-gradient shadow-glow hover:shadow-glow-lg transition-shadow duration-300 text-base"
        >
          Get Started Free
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          {/* Glow pulse */}
          <div className="absolute inset-0 rounded-xl bg-neon-gradient opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300" />
        </Link>
        <Link
          href="#demo"
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-display font-semibold text-foreground/90 glass hover:bg-primary/10 transition-all duration-300 text-base"
        >
          <Play className="w-4 h-4" />
          Watch Demo
        </Link>
      </motion.div>

      {/* Stats */}
      <motion.div
        className="grid grid-cols-3 gap-6 sm:gap-10 md:gap-16 w-full max-w-2xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.7 }}
      >
        <AnimatedCounter target={12000} suffix="+" label="Assessments" />
        <AnimatedCounter target={4.2} prefix="$" suffix="B" label="Deal Flow" duration={2500} />
        <AnimatedCounter target={850} suffix="+" label="Investors" />
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 md:bottom-12 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="flex flex-col items-center gap-2 cursor-pointer"
          onClick={() =>
            document
              .getElementById('features')
              ?.scrollIntoView({ behavior: 'smooth' })
          }
        >
          <span className="text-xs text-muted-foreground font-body">Scroll to explore</span>
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        </motion.div>
      </motion.div>
    </section>
  );
}
