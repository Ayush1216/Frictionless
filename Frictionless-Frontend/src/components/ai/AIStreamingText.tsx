'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface AIStreamingTextProps {
  text: string;
  speed?: number;
  isStreaming?: boolean;
  onComplete?: () => void;
}

export function AIStreamingText({ text, speed = 20, isStreaming = true, onComplete }: AIStreamingTextProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!isStreaming) {
      setDisplayedText(text);
      return;
    }

    setDisplayedText('');
    setCurrentIndex(0);
  }, [text, isStreaming]);

  useEffect(() => {
    if (!isStreaming || currentIndex >= text.length) {
      if (currentIndex >= text.length && isStreaming) {
        onComplete?.();
      }
      return;
    }

    const timer = setTimeout(() => {
      // Add word-by-word for faster rendering
      const nextSpace = text.indexOf(' ', currentIndex + 1);
      const nextIndex = nextSpace === -1 ? text.length : nextSpace + 1;
      setDisplayedText(text.slice(0, nextIndex));
      setCurrentIndex(nextIndex);
    }, speed);

    return () => clearTimeout(timer);
  }, [currentIndex, text, speed, isStreaming, onComplete]);

  const isComplete = displayedText.length >= text.length;

  return (
    <span>
      {displayedText}
      {isStreaming && !isComplete && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ repeat: Infinity, duration: 0.6 }}
          className="inline-block w-[2px] h-[1em] bg-electric-blue ml-0.5 align-middle"
        />
      )}
    </span>
  );
}
