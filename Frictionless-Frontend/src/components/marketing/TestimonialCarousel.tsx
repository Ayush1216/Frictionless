'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react';

const testimonials = [
  {
    quote:
      "Frictionless Intelligence transformed our fundraising process. We went from 6 months of cold outreach to closing our seed round in 8 weeks with perfectly matched investors.",
    name: 'Sarah Chen',
    title: 'CEO & Co-founder',
    company: 'NexaFlow AI',
    avatar: 'SC',
  },
  {
    quote:
      "The readiness score gave us the clarity we needed. We knew exactly what to improve before going out to raise, and it made all the difference in our Series A.",
    name: 'Marcus Johnson',
    title: 'Founder',
    company: 'DataPulse',
    avatar: 'MJ',
  },
  {
    quote:
      "As an investor, the matching algorithm saves me hours every week. I'm seeing higher-quality deal flow that actually aligns with my thesis and portfolio strategy.",
    name: 'Emily Rodriguez',
    title: 'Managing Partner',
    company: 'Horizon Ventures',
    avatar: 'ER',
  },
];

export function TestimonialCarousel() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);

  const next = useCallback(() => {
    setDirection(1);
    setCurrent((prev) => (prev + 1) % testimonials.length);
  }, []);

  const prev = useCallback(() => {
    setDirection(-1);
    setCurrent((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [next]);

  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 100 : -100,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -100 : 100,
      opacity: 0,
    }),
  };

  return (
    <section className="py-20 md:py-32 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <motion.h2
          className="text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          Loved by <span className="gradient-text">founders & investors</span>
        </motion.h2>
        <motion.p
          className="text-muted-foreground text-base md:text-lg mb-16 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
        >
          Hear from the people who use Frictionless Intelligence every day
        </motion.p>

        <div className="relative min-h-[280px] md:min-h-[240px]">
          <AnimatePresence custom={direction} mode="wait">
            <motion.div
              key={current}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.4, ease: 'easeInOut' }}
              className="glass-card p-8 md:p-12"
            >
              <Quote className="w-8 h-8 text-primary/40 mb-6 mx-auto" />
              <p className="text-lg md:text-xl text-foreground/80 leading-relaxed mb-8 font-body">
                &ldquo;{testimonials[current].quote}&rdquo;
              </p>
              <div className="flex items-center justify-center gap-4">
                <div className="w-12 h-12 rounded-full bg-neon-gradient flex items-center justify-center font-display font-bold text-white text-sm">
                  {testimonials[current].avatar}
                </div>
                <div className="text-left">
                  <div className="font-display font-semibold text-white">
                    {testimonials[current].name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {testimonials[current].title}, {testimonials[current].company}
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={prev}
            className="p-2 rounded-full glass hover:bg-white/10 transition-colors"
            aria-label="Previous testimonial"
          >
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          </button>

          <div className="flex gap-2">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setDirection(i > current ? 1 : -1);
                  setCurrent(i);
                }}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  i === current
                    ? 'bg-primary w-6'
                    : 'bg-border hover:bg-muted-foreground'
                }`}
                aria-label={`Go to testimonial ${i + 1}`}
              />
            ))}
          </div>

          <button
            onClick={next}
            className="p-2 rounded-full glass hover:bg-white/10 transition-colors"
            aria-label="Next testimonial"
          >
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>
    </section>
  );
}
