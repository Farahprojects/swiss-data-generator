import React from 'react';
import { motion } from 'framer-motion';

interface Props {
  state: 'listening' | 'processing' | 'replying';
}

export const VoiceBubble: React.FC<Props> = ({ state }) => {
  const baseClass =
    'flex items-center justify-center rounded-full w-40 h-40 md:w-56 md:h-56 shadow-lg';

  const styles: Record<typeof state, string> = {
    listening: 'bg-gradient-to-br from-purple-500 to-purple-600',
    processing: 'bg-gradient-to-br from-blue-500 to-blue-600',
    replying: 'bg-gradient-to-br from-green-500 to-green-600',
  };

  return (
    <motion.div
      className={`${baseClass} ${styles[state]}`}
      animate={
        state === 'listening'
          ? { scale: [1, 1.05, 1] }
          : state === 'processing'
          ? { opacity: [1, 0.7, 1] }
          : { scale: [1, 1.02, 1], rotate: [0, 2, -2, 0] }
      }
      transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
    />
  );
};
