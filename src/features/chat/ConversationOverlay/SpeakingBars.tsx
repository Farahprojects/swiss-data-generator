import React from 'react';
import { motion } from 'framer-motion';

interface Props {
  audioLevel: number;
}

export const SpeakingBars: React.FC<Props> = ({ audioLevel }) => {
  // Create a wave-like pattern where middle bars are bigger
  const bars = Array.from({ length: 4 }, (_, index) => {
    // Create a bell curve effect - middle bars are more responsive
    const centerDistance = Math.abs(index - 1.5); // Distance from center (0.5, 1.5, 1.5, 0.5)
    const responsiveness = Math.max(0.3, 1 - centerDistance * 0.4); // 0.8, 1.0, 1.0, 0.8
    
    // Add some randomness for more natural movement
    const randomFactor = 0.8 + Math.sin(Date.now() * 0.01 + index) * 0.2;
    
    // Base height with wave pattern
    const baseHeight = 0.4 + (1 - centerDistance * 0.3); // 0.55, 0.85, 0.85, 0.55
    const audioResponse = Math.min(0.6, audioLevel * responsiveness * randomFactor);
    const scaleY = baseHeight + audioResponse; // 0.55-1.15, 0.85-1.45, 0.85-1.45, 0.55-1.15

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