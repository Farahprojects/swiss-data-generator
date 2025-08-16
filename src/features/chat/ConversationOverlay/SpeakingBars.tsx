import React from 'react';
import { motion } from 'framer-motion';

interface Props {
  audioLevel: number;
}

export const SpeakingBars: React.FC<Props> = ({ audioLevel }) => {
  // Create 4 bars with different heights - middle ones taller, sides shorter
  const bars = Array.from({ length: 4 }, (_, index) => {
    // Middle bars (1, 2) are taller, side bars (0, 3) are shorter
    const baseHeight = index === 1 || index === 2 ? 40 : 24; // Middle: 40px, Sides: 24px
    const responsiveness = 0.7 + index * 0.1; // Different sensitivity per bar
    const audioHeight = audioLevel * 80 * responsiveness; // Increased scale for taller bars
    const totalHeight = Math.max(baseHeight, baseHeight + audioHeight);
    
    return {
      id: index,
      height: totalHeight,
      delay: index * 0.05, // Slight delay for wave effect
    };
  });

  return (
    <div className="flex items-end justify-center gap-2 h-16 w-24">
      {bars.map((bar) => (
        <motion.div
          key={bar.id}
          className="bg-black rounded-full"
          style={{
            width: '10px',
            height: `${bar.height}px`,
          }}
          animate={{
            height: `${bar.height}px`,
            opacity: audioLevel > 0.01 ? 1 : 0.6, // Dim when no audio
          }}
          transition={{
            height: {
              type: 'spring',
              stiffness: 300,
              damping: 30,
              delay: bar.delay,
            },
            opacity: {
              duration: 0.2,
            },
          }}
        />
      ))}
    </div>
  );
};