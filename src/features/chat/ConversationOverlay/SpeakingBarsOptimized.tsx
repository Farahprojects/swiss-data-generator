import React, { useEffect, useRef } from 'react';
import { directAudioAnimationService } from '@/services/voice/DirectAudioAnimationService';

interface Props {
  isActive: boolean;
  audioLevel?: number; // Deprecated path; kept for compatibility
}

export const SpeakingBarsOptimized: React.FC<Props> = ({ isActive, audioLevel = 0 }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // 🎯 Subscribe directly and map level → CSS var without client-side smoothing
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const baselineHeight = 0.2; // visual baseline
    const maxMovement = 0.8;    // visual range

    const applyLevel = (level01: number) => {
      const clamped = level01 < 0 ? 0 : level01 > 1 ? 1 : level01;
      const scaleY = baselineHeight + clamped * maxMovement;
      containerRef.current!.style.setProperty('--bar-scale', scaleY.toString());
    };

    // Set initial visual immediately
    applyLevel(audioLevel);

    const unsubscribe = directAudioAnimationService.subscribe(applyLevel);
    return unsubscribe;
  }, [isActive, audioLevel]);

  // Four bars with different base heights: small, big, big, small
  const bars = [
    { id: 0, baseHeight: 0.6, className: 'h-10' }, // Small bar on left
    { id: 1, baseHeight: 0.8, className: 'h-14' }, // Big bar in middle-left
    { id: 2, baseHeight: 0.8, className: 'h-14' }, // Big bar in middle-right
    { id: 3, baseHeight: 0.6, className: 'h-10' }, // Small bar on right
  ];

  return (
    <div 
      ref={containerRef}
      className="flex items-center justify-center gap-3 h-16 w-28"
      style={{
        '--bar-scale': '1',
        willChange: 'transform', // GPU acceleration hint
      } as React.CSSProperties}
    >
      {bars.map((bar) => (
        <div
          key={bar.id}
          className={`bg-black rounded-full ${bar.className}`}
          style={{
            width: '16px', // All bars same width
            transformOrigin: 'bottom',
            transform: `scaleY(var(--bar-scale, 1))`,
            willChange: 'transform', // GPU acceleration hint
            transition: 'none !important', // Disable any CSS transitions
          }}
        />
      ))}
    </div>
  );
};
