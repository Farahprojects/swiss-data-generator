import React from 'react';
import { motion } from 'framer-motion';

interface Props {
  isActive: boolean;
  audioLevel?: number;
}

export const SpeakingBarsOptimized: React.FC<Props> = ({ isActive, audioLevel = 0 }) => {
  // Four bars with different base heights: small, big, big, small
  const bars = [
    { id: 0, baseHeight: 0.6, className: 'h-10' }, // Small bar on left
    { id: 1, baseHeight: 0.8, className: 'h-14' }, // Big bar in middle-left
    { id: 2, baseHeight: 0.8, className: 'h-14' }, // Big bar in middle-right
    { id: 3, baseHeight: 0.6, className: 'h-10' }, // Small bar on right
  ];

  // All bars use the same motion calculation
  const minScale = 0.45;
  const extra = Math.min(0.75, audioLevel * 1.2); // Increased from 0.8 to 1.2 for more dramatic movement
  const scaleY = minScale + extra; // 0.45 .. ~1.35

  return (
    <div className="flex items-center justify-center gap-3 h-16 w-28">
      {bars.map((bar) => (
        <motion.div
          key={bar.id}
          className={`bg-black rounded-full ${bar.className}`}
          style={{
            width: '16px', // All bars same width
            transformOrigin: 'center',
          }}
          animate={{
            scaleY: scaleY,
            opacity: audioLevel > 0.02 ? 1 : 0.7,
          }}
          transition={{
            scaleY: {
              type: 'spring',
              stiffness: 380,
              damping: 26,
            },
            opacity: { duration: 0.15 },
          }}
        />
      ))}
    </div>
  );
};
