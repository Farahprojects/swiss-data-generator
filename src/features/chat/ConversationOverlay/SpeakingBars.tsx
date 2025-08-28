import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

interface Props {
  audioLevel: number;
}

export const SpeakingBars: React.FC<Props> = ({ audioLevel }) => {
  useEffect(() => {
    console.log('🎵 SPEAKING ANIMATION MOUNTED: SpeakingBars component is now active.');
  }, []);

  useEffect(() => {
    console.log('🎵 SpeakingBars audioLevel changed:', audioLevel);
  }, [audioLevel]);

  const bars = Array.from({ length: 4 }).map((_, index) => {
    const isMiddleBar = index === 1 || index === 2;
    const baseHeight = isMiddleBar ? 0.8 : 0.6;
    const audioResponse = Math.min(0.4, audioLevel * 2);
    const scaleY = baseHeight + audioResponse;

    return (
      <motion.div
        key={index}
        className="bg-black rounded-full"
        style={{
          width: '16px',
          height: '56px',
          transformOrigin: 'center',
        }}
        animate={{
          scaleY: scaleY,
          opacity: audioLevel > 0.02 ? 1 : 0.75,
        }}
        transition={{
          scaleY: { type: 'spring', stiffness: 380, damping: 28 },
          opacity: { duration: 0.15 },
        }}
      />
    );
  });

  return (
    <div className="flex items-center justify-center gap-3 h-16 w-28">
      {bars}
    </div>
  );
};