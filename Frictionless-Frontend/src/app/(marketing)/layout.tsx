'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import {
  Menu,
  X,
  ArrowRight,
  Twitter,
  Linkedin,
  Github,
  Mail,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ui/theme-toggle';

const navLinks = [
  { href: '/features', label: 'Features' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

const footerColumns = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '/features' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Frictionless Scoring', href: '/features#scoring' },
      { label: 'Investor Matching', href: '/features#matching' },
      { label: 'Data Room', href: '/features#dataroom' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Blog', href: '/about#updates' },
      { label: 'Careers', href: '/contact?topic=careers' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Documentation', href: '/features' },
      { label: 'Help Center', href: '/contact?topic=help' },
      { label: 'API Reference', href: '/contact?topic=api' },
      { label: 'Status', href: '/contact?topic=status' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms of Service', href: '/legal/terms' },
      { label: 'Privacy Policy', href: '/legal/privacy' },
      { label: 'Cookie Policy', href: '/legal/privacy#cookies' },
      { label: 'Security', href: '/legal/terms#security' },
    ],
  },
];

const socialLinks = [
  { icon: Twitter, href: 'https://twitter.com/frictionlessiq', label: 'Twitter' },
  { icon: Linkedin, href: 'https://linkedin.com/company/frictionless-intelligence', label: 'LinkedIn' },
  { icon: Github, href: 'https://github.com/frictionless-intelligence', label: 'GitHub' },
  { icon: Mail, href: 'mailto:hello@frictionless.ai', label: 'Email' },
];

/* ═══════════════════════════════════════════
   NAVBAR
   ═══════════════════════════════════════════ */
function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setScrolled(latest > 20);
  });

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  return (
    <>
      <motion.header
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-colors duration-300',
          scrolled
            ? 'bg-background/80 backdrop-blur-xl border-b border-border/50'
            : 'bg-transparent'
        )}
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <nav className="max-w-7xl mx-auto flex items-center justify-between px-4 md:px-6 h-16 md:h-[72px]">
          {/* Logo — compact padding, 2x size */}
          <Link href="/" className="flex items-center group p-0">
            <div className="relative w-14 h-14 flex-shrink-0 md:w-16 md:h-16">
              <Image
                src="/logo.png"
                alt="Frictionless"
                width={512}
                height={512}
                className="object-contain w-full h-full"
              />
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-body font-medium transition-colors duration-200',
                  pathname === link.href
                    ? 'text-foreground bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle size="md" />
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-body font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="group inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-display font-semibold text-white bg-neon-gradient animated-gradient shadow-glow hover:shadow-glow-lg transition-shadow"
            >
              Get Started
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </nav>
      </motion.header>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="fixed inset-0 z-40 bg-background/98 backdrop-blur-2xl md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="flex flex-col items-center justify-center h-full gap-2 px-6">
              {navLinks.map((link, i) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ delay: i * 0.05 + 0.1 }}
                >
                  <Link
                    href={link.href}
                    className={cn(
                      'block text-2xl font-display font-semibold py-3 transition-colors',
                      pathname === link.href ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                    )}
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}

              <motion.div
                className="flex flex-col items-center gap-4 mt-8 w-full max-w-xs"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.3 }}
              >
                <ThemeToggle size="lg" className="mb-2" />
                <Link
                  href="/login"
                  className="w-full py-3 text-center rounded-xl glass text-foreground font-display font-semibold"
                  onClick={() => setMobileOpen(false)}
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="w-full py-3 text-center rounded-xl bg-neon-gradient animated-gradient text-white font-display font-semibold shadow-glow"
                  onClick={() => setMobileOpen(false)}
                >
                  Get Started Free
                </Link>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ═══════════════════════════════════════════
   FOOTER
   ═══════════════════════════════════════════ */
function Footer() {
  return (
    <footer className="border-t border-border bg-card/50">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-20">
        {/* Top section */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 md:gap-12 mb-14">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center mb-4 p-0">
              <div className="relative w-20 h-20 flex-shrink-0">
                <Image
                  src="/logo.png"
                  alt="Frictionless"
                  width={512}
                  height={512}
                  className="object-contain w-full h-full"
                />
              </div>
            </Link>
            <p className="text-sm text-muted-foreground font-body leading-relaxed mb-6 max-w-[240px]">
              AI-powered investment Frictionless platform for startups and investors.
            </p>
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg glass text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-all duration-200"
                    aria-label={social.label}
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Link columns */}
          {footerColumns.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-display font-semibold text-foreground mb-4">
                {col.title}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors font-body"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground font-body">
            © {new Date().getFullYear()} Frictionless Intelligence, Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/legal/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors font-body">
              Terms
            </Link>
            <Link href="/legal/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors font-body">
              Privacy
            </Link>
            <Link href="/contact" className="text-xs text-muted-foreground hover:text-foreground transition-colors font-body">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ═══════════════════════════════════════════
   LAYOUT
   ═══════════════════════════════════════════ */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
