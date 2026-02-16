'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Send,
  MapPin,
  Mail,
  Phone,
  Twitter,
  Linkedin,
  Github,
  MessageSquare,
} from 'lucide-react';

const offices = [
  {
    city: 'San Francisco',
    address: '548 Market Street, Suite 36879',
    region: 'San Francisco, CA 94104',
    timezone: 'PST (UTC-8)',
  },
  {
    city: 'London',
    address: '1 Finsbury Avenue',
    region: 'London, EC2M 2PF',
    timezone: 'GMT (UTC+0)',
  },
  {
    city: 'Singapore',
    address: '80 Robinson Road, #08-01',
    region: 'Singapore, 068898',
    timezone: 'SGT (UTC+8)',
  },
];

const socialLinks = [
  { icon: Twitter, href: 'https://twitter.com/frictionlessiq', label: 'Twitter' },
  { icon: Linkedin, href: 'https://linkedin.com/company/frictionless-intelligence', label: 'LinkedIn' },
  { icon: Github, href: 'https://github.com/frictionless-intelligence', label: 'GitHub' },
];

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="pt-28 md:pt-36 pb-20 md:pb-32 px-4">
      {/* Hero */}
      <motion.div
        className="text-center mb-14 md:mb-20"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 mb-6 text-sm text-obsidian-400">
          <span className="w-1.5 h-1.5 rounded-full bg-electric-blue" />
          Contact Us
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-extrabold mb-4">
          Let&apos;s <span className="gradient-text">talk</span>
        </h1>
        <p className="text-obsidian-400 text-base md:text-lg max-w-xl mx-auto font-body">
          Have a question, want a demo, or interested in partnering?
          We&apos;d love to hear from you.
        </p>
      </motion.div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-10 md:gap-14">
        {/* Contact form */}
        <motion.div
          className="lg:col-span-3"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {submitted ? (
            <motion.div
              className="glass-card p-10 md:p-14 text-center"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <div className="inline-flex p-4 rounded-2xl bg-score-excellent/10 mb-6">
                <MessageSquare className="w-8 h-8 text-score-excellent" />
              </div>
              <h2 className="text-2xl font-display font-bold text-white mb-3">
                Message sent!
              </h2>
              <p className="text-obsidian-400 font-body mb-6">
                Thanks for reaching out. We&apos;ll get back to you within 24 hours.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="text-sm text-electric-blue hover:text-electric-cyan transition-colors font-display font-semibold"
              >
                Send another message
              </button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="glass-card p-6 md:p-10 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-display font-medium text-obsidian-300 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Your name"
                    className="w-full px-4 py-3 rounded-xl bg-obsidian-800/60 border border-obsidian-600/50 text-white placeholder:text-obsidian-600 focus:outline-none focus:ring-2 focus:ring-electric-blue/50 focus:border-electric-blue/50 font-body text-sm transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-display font-medium text-obsidian-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="you@company.com"
                    className="w-full px-4 py-3 rounded-xl bg-obsidian-800/60 border border-obsidian-600/50 text-white placeholder:text-obsidian-600 focus:outline-none focus:ring-2 focus:ring-electric-blue/50 focus:border-electric-blue/50 font-body text-sm transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-display font-medium text-obsidian-300 mb-2">
                  Company
                </label>
                <input
                  type="text"
                  placeholder="Your company name"
                  className="w-full px-4 py-3 rounded-xl bg-obsidian-800/60 border border-obsidian-600/50 text-white placeholder:text-obsidian-600 focus:outline-none focus:ring-2 focus:ring-electric-blue/50 focus:border-electric-blue/50 font-body text-sm transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-display font-medium text-obsidian-300 mb-2">
                  Subject
                </label>
                <select className="w-full px-4 py-3 rounded-xl bg-obsidian-800/60 border border-obsidian-600/50 text-obsidian-400 focus:outline-none focus:ring-2 focus:ring-electric-blue/50 focus:border-electric-blue/50 font-body text-sm transition-all appearance-none">
                  <option value="">Select a topic</option>
                  <option value="demo">Request a demo</option>
                  <option value="sales">Sales inquiry</option>
                  <option value="support">Technical support</option>
                  <option value="partnership">Partnership</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-display font-medium text-obsidian-300 mb-2">
                  Message
                </label>
                <textarea
                  required
                  rows={5}
                  placeholder="Tell us how we can help..."
                  className="w-full px-4 py-3 rounded-xl bg-obsidian-800/60 border border-obsidian-600/50 text-white placeholder:text-obsidian-600 focus:outline-none focus:ring-2 focus:ring-electric-blue/50 focus:border-electric-blue/50 font-body text-sm transition-all resize-none"
                />
              </div>
              <button
                type="submit"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-neon-gradient animated-gradient text-white font-display font-semibold text-sm shadow-glow hover:shadow-glow-lg transition-shadow"
              >
                <Send className="w-4 h-4" />
                Send Message
              </button>
            </form>
          )}
        </motion.div>

        {/* Sidebar */}
        <motion.div
          className="lg:col-span-2 space-y-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {/* Quick contact */}
          <div className="glass-card p-6">
            <h3 className="font-display font-bold text-white text-lg mb-4">
              Quick contact
            </h3>
            <div className="space-y-4">
              <a
                href="mailto:hello@frictionless.ai"
                className="flex items-center gap-3 text-sm text-obsidian-400 hover:text-white transition-colors font-body"
              >
                <Mail className="w-4 h-4 text-electric-blue flex-shrink-0" />
                hello@frictionless.ai
              </a>
              <a
                href="tel:+14155551234"
                className="flex items-center gap-3 text-sm text-obsidian-400 hover:text-white transition-colors font-body"
              >
                <Phone className="w-4 h-4 text-electric-blue flex-shrink-0" />
                +1 (415) 555-1234
              </a>
            </div>

            <div className="flex items-center gap-3 mt-6 pt-6 border-t border-white/5">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-lg glass text-obsidian-500 hover:text-white hover:bg-white/10 transition-all"
                    aria-label={social.label}
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Offices */}
          <div className="glass-card p-6">
            <h3 className="font-display font-bold text-white text-lg mb-4">
              Our offices
            </h3>
            <div className="space-y-5">
              {offices.map((office) => (
                <div key={office.city} className="flex gap-3">
                  <MapPin className="w-4 h-4 text-electric-blue mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-display font-semibold text-white">
                      {office.city}
                    </p>
                    <p className="text-xs text-obsidian-500 font-body mt-0.5">
                      {office.address}
                    </p>
                    <p className="text-xs text-obsidian-500 font-body">
                      {office.region}
                    </p>
                    <p className="text-xs text-obsidian-600 font-mono mt-1">
                      {office.timezone}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Response time */}
          <div className="glass-card p-6">
            <h3 className="font-display font-bold text-white text-lg mb-2">
              Response time
            </h3>
            <p className="text-sm text-obsidian-400 font-body">
              We typically respond within{' '}
              <span className="text-white font-semibold">24 hours</span> on business
              days. For urgent matters, call us directly.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
