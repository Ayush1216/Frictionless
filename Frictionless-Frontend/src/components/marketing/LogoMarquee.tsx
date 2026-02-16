'use client';

import { motion } from 'framer-motion';

const logos = [
  'Y Combinator',
  'Techstars',
  '500 Startups',
  'Plug and Play',
  'Sequoia Capital',
  'Andreessen Horowitz',
  'Accel',
  'Benchmark',
  'Greylock',
  'Founders Fund',
  'NEA',
  'Lightspeed',
];

export function LogoMarquee() {
  return (
    <section className="py-16 md:py-24 overflow-hidden">
      <motion.p
        className="text-center text-obsidian-400 text-sm md:text-base font-body mb-10 md:mb-14"
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        Trusted by <span className="text-white font-semibold">2,000+</span> startups worldwide
      </motion.p>

      <div className="relative">
        {/* Left fade */}
        <div className="absolute left-0 top-0 bottom-0 w-24 md:w-40 bg-gradient-to-r from-obsidian-900 to-transparent z-10" />
        {/* Right fade */}
        <div className="absolute right-0 top-0 bottom-0 w-24 md:w-40 bg-gradient-to-l from-obsidian-900 to-transparent z-10" />

        <div className="flex animate-marquee">
          {[...logos, ...logos].map((name, i) => (
            <div
              key={i}
              className="flex-shrink-0 mx-6 md:mx-10 flex items-center justify-center"
            >
              <div className="glass rounded-lg px-6 py-3 md:px-8 md:py-4 text-obsidian-400 hover:text-obsidian-200 transition-colors duration-300 font-display font-semibold text-sm md:text-base whitespace-nowrap">
                {name}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
