import React from 'react';
import { motion } from 'framer-motion';

interface Props {
  audioLevel: number;
}

export const SpeakingBars: React.FC<Props> = ({ audioLevel }) => {
  // Four bars with slightly different responsiveness for a subtle variation
  const bars = Array.from({ length: 4 }, (_, index) => {
    const responsiveness = 0.7 + index * 0.1; // 0.7, 0.8, 0.9, 1.0

    // Scale from center: compact baseline, grow with audio
    const minScale = 0.5;
    const extra = Math.min(0.7, audioLevel * responsiveness); // cap growth
    const scaleY = minScale + extra; // ~0.5 .. 1.2

    return {
      id: index,
      scaleY,
    };
  });

  return (
    <div className="flex items-center justify-center gap-3 h-16 w-28">
      {bars.map((bar) => (
        <motion.div
          key={bar.id}
          className="bg-black rounded-full"
          style={{
            width: '16px', // thicker bars
            height: '56px', // center-anchored height
            transformOrigin: 'center',
          }}
          animate={{
            scaleY: bar.scaleY,
            opacity: audioLevel > 0.02 ? 1 : 0.75,
          }}
          transition={{
            scaleY: {
              type: 'spring',
              stiffness: 380,
              damping: 28,
            },
            opacity: { duration: 0.15 },
          }}
        />
      ))}
    </div>
  );
};