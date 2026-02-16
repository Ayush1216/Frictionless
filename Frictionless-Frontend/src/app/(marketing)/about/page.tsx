'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Target, Eye, Lightbulb, Heart, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const team = [
  {
    name: 'Alex Rivera',
    role: 'CEO & Co-founder',
    initials: 'AR',
    bio: 'Former VC at Sequoia. 10+ years in venture capital and startup operations.',
  },
  {
    name: 'Priya Sharma',
    role: 'CTO & Co-founder',
    initials: 'PS',
    bio: 'Ex-Google ML engineer. Built AI systems processing billions of signals daily.',
  },
  {
    name: 'Jordan Lee',
    role: 'Head of Product',
    initials: 'JL',
    bio: 'Previously led product at Stripe. Passionate about developer and founder experience.',
  },
  {
    name: 'Maya Chen',
    role: 'Head of AI',
    initials: 'MC',
    bio: 'PhD in NLP from Stanford. Published researcher in financial modeling and AI.',
  },
  {
    name: 'David Park',
    role: 'VP Engineering',
    initials: 'DP',
    bio: 'Scaled engineering at Figma. Expert in real-time systems and infrastructure.',
  },
  {
    name: 'Sofia Martinez',
    role: 'Head of Growth',
    initials: 'SM',
    bio: 'Built growth at Notion from Series A to unicorn. Community-led growth specialist.',
  },
];

const milestones = [
  {
    year: '2022',
    quarter: 'Q3',
    title: 'The Beginning',
    description: 'Founded with a mission to democratize access to smart fundraising tools for startups worldwide.',
  },
  {
    year: '2023',
    quarter: 'Q1',
    title: 'Seed Round',
    description: 'Raised $3.2M seed round led by Founders Fund to build the first version of our AI scoring engine.',
  },
  {
    year: '2023',
    quarter: 'Q3',
    title: 'Public Beta Launch',
    description: 'Launched to 500 beta users. Within 3 months, facilitated $120M in matched deal flow.',
  },
  {
    year: '2024',
    quarter: 'Q1',
    title: '2,000 Startups',
    description: 'Crossed 2,000 active startups on the platform. Launched investor matching algorithm v2.',
  },
  {
    year: '2024',
    quarter: 'Q3',
    title: 'Series A',
    description: 'Raised $18M Series A. Expanded team to 45 people across San Francisco, London, and Singapore.',
  },
  {
    year: '2025',
    quarter: 'Q1',
    title: 'AI Chat & Task Engine',
    description: 'Launched AI Chat Assistant and Smart Task Engine. Hit $4.2B in total deal flow processed.',
  },
];

const values = [
  {
    icon: Target,
    title: 'Mission-Driven',
    description: 'Every feature we build starts with one question: does this help founders raise smarter?',
  },
  {
    icon: Eye,
    title: 'Transparency First',
    description: 'We believe in radical transparency — in our product, our pricing, and our company.',
  },
  {
    icon: Lightbulb,
    title: 'Relentless Innovation',
    description: 'We push the boundaries of what AI can do for fundraising. Standing still isn\'t an option.',
  },
  {
    icon: Heart,
    title: 'Founder Empathy',
    description: 'We\'ve been in your shoes. Every team member has founded, funded, or operated a startup.',
  },
];

function TeamCard({
  member,
  index,
}: {
  member: (typeof team)[number];
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="glass-card p-6 text-center group hover:border-obsidian-500/50 transition-all duration-300"
    >
      <div className="w-16 h-16 rounded-full bg-neon-gradient flex items-center justify-center mx-auto mb-4 text-white font-display font-bold text-lg group-hover:shadow-glow transition-shadow duration-300">
        {member.initials}
      </div>
      <h3 className="font-display font-bold text-white text-lg mb-1">
        {member.name}
      </h3>
      <p className="text-electric-blue text-sm font-display font-medium mb-3">
        {member.role}
      </p>
      <p className="text-sm text-obsidian-400 font-body leading-relaxed">
        {member.bio}
      </p>
    </motion.div>
  );
}

function Timeline() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <div ref={ref} className="relative">
      {/* Vertical line */}
      <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px bg-obsidian-700/50 md:-translate-x-px" />

      <div className="space-y-12 md:space-y-16">
        {milestones.map((milestone, i) => {
          const isLeft = i % 2 === 0;
          return (
            <motion.div
              key={milestone.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`relative grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12 ${
                isLeft ? '' : 'md:direction-rtl'
              }`}
            >
              {/* Dot */}
              <div className="absolute left-4 md:left-1/2 w-3 h-3 rounded-full bg-electric-blue border-2 border-obsidian-900 -translate-x-1/2 mt-1.5 z-10 shadow-glow" />

              {/* Content card */}
              <div
                className={`ml-10 md:ml-0 ${
                  isLeft ? 'md:text-right md:pr-12' : 'md:col-start-2 md:pl-12 md:text-left'
                }`}
              >
                <div className="inline-flex items-center gap-2 text-xs font-mono text-electric-blue mb-2">
                  <span>{milestone.year}</span>
                  <span className="text-obsidian-600">·</span>
                  <span className="text-obsidian-500">{milestone.quarter}</span>
                </div>
                <h3 className="text-lg md:text-xl font-display font-bold text-white mb-2">
                  {milestone.title}
                </h3>
                <p className="text-sm text-obsidian-400 font-body leading-relaxed">
                  {milestone.description}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default function AboutPage() {
  return (
    <div className="pt-28 md:pt-36 pb-20 md:pb-32">
      {/* Hero */}
      <motion.div
        className="text-center px-4 mb-20 md:mb-28"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 mb-6 text-sm text-obsidian-400">
          <span className="w-1.5 h-1.5 rounded-full bg-score-excellent" />
          Our Story
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-extrabold mb-6 max-w-4xl mx-auto">
          Making fundraising{' '}
          <span className="gradient-text">frictionless</span> for everyone
        </h1>
        <p className="text-obsidian-400 text-base md:text-lg max-w-2xl mx-auto font-body leading-relaxed">
          We believe that the best startups should get funded — regardless of
          their network, geography, or background. We&apos;re building the AI-powered
          platform to make that happen.
        </p>
      </motion.div>

      {/* Mission & Vision */}
      <section className="px-4 mb-20 md:mb-28">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div
            className="glass-card p-8 md:p-10"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex p-3 rounded-xl bg-electric-blue/10 mb-5">
              <Target className="w-6 h-6 text-electric-blue" />
            </div>
            <h2 className="text-2xl font-display font-bold text-white mb-3">
              Our Mission
            </h2>
            <p className="text-obsidian-400 font-body leading-relaxed">
              To democratize access to smart fundraising tools, so every
              founder — regardless of background or connections — has the best
              possible chance of getting funded.
            </p>
          </motion.div>

          <motion.div
            className="glass-card p-8 md:p-10"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex p-3 rounded-xl bg-electric-purple/10 mb-5">
              <Eye className="w-6 h-6 text-electric-purple" />
            </div>
            <h2 className="text-2xl font-display font-bold text-white mb-3">
              Our Vision
            </h2>
            <p className="text-obsidian-400 font-body leading-relaxed">
              A world where every promising startup finds its perfect investor
              match — instantly, intelligently, and without friction. We&apos;re building
              the infrastructure for the future of venture capital.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Values */}
      <section className="px-4 mb-20 md:mb-28">
        <div className="max-w-5xl mx-auto">
          <motion.h2
            className="text-3xl md:text-4xl font-display font-bold text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Our <span className="gradient-text">values</span>
          </motion.h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {values.map((value, i) => {
              const Icon = value.icon;
              return (
                <motion.div
                  key={value.title}
                  className="glass-card p-6 md:p-8"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                >
                  <Icon className="w-5 h-5 text-electric-blue mb-4" />
                  <h3 className="font-display font-bold text-white text-lg mb-2">
                    {value.title}
                  </h3>
                  <p className="text-sm text-obsidian-400 font-body leading-relaxed">
                    {value.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="px-4 mb-20 md:mb-28">
        <div className="max-w-5xl mx-auto">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Meet the <span className="gradient-text">team</span>
            </h2>
            <p className="text-obsidian-400 font-body max-w-xl mx-auto">
              A team of operators, engineers, and investors building the future of fundraising.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {team.map((member, i) => (
              <TeamCard key={member.name} member={member} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Timeline / Updates */}
      <section id="updates" className="px-4 mb-20 md:mb-28">
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="text-center mb-14"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Our <span className="gradient-text">journey</span>
            </h2>
            <p className="text-obsidian-400 font-body">
              From idea to platform — here&apos;s how we got here.
            </p>
          </motion.div>
          <Timeline />
        </div>
      </section>

      {/* CTA */}
      <section className="px-4">
        <motion.div
          className="max-w-3xl mx-auto text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
            Join us on this mission
          </h2>
          <p className="text-obsidian-400 font-body mb-8">
            We&apos;re hiring world-class talent across engineering, product, and growth.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-display font-semibold text-white bg-neon-gradient animated-gradient shadow-glow hover:shadow-glow-lg transition-shadow text-sm"
            >
              Get in Touch
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-display font-semibold text-obsidian-200 glass hover:bg-white/10 transition-all text-sm"
            >
              Try the Platform
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
