import React, { useEffect, useRef } from 'react';
import { directAudioAnimationService } from '@/services/voice/DirectAudioAnimationService';
import { directBarsAnimationService, FourBarLevels } from '@/services/voice/DirectBarsAnimationService';

interface Props {
  isActive: boolean;
  audioLevel?: number; // Deprecated path; kept for compatibility
}

export const SpeakingBarsOptimized: React.FC<Props> = ({ isActive, audioLevel = 0 }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // 🎯 PURE SERVER-DRIVEN (single-level fallback)
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const applyLevel = (serverValue: number) => {
      // NO MATH - server already calculated the final scale value
      containerRef.current!.style.setProperty('--bar-scale', serverValue.toString());
    };

    // Set initial visual immediately
    applyLevel(audioLevel);

    const unsubscribe = directAudioAnimationService.subscribe(applyLevel);
    return unsubscribe;
  }, [isActive, audioLevel]);

  // 🎯 NEW: 4-bar updates if provided
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const applyBars = (levels: FourBarLevels) => {
      // levels are 0..1 final scale values per bar (server-driven)
      containerRef.current!.style.setProperty('--bar1-scale', levels[0].toString());
      containerRef.current!.style.setProperty('--bar2-scale', levels[1].toString());
      containerRef.current!.style.setProperty('--bar3-scale', levels[2].toString());
      containerRef.current!.style.setProperty('--bar4-scale', levels[3].toString());
    };

    const unsubscribe = directBarsAnimationService.subscribe(applyBars);
    return unsubscribe;
  }, [isActive]);

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
      {bars.map((bar, idx) => (
        <div
          key={bar.id}
          className={`bg-black rounded-full ${bar.className}`}
          style={{
            width: '16px', // All bars same width
            transformOrigin: 'bottom',
            transform: `scaleY(var(--bar${idx+1}-scale, var(--bar-scale, 1)))`,
            willChange: 'transform', // GPU acceleration hint
            transition: 'none !important', // Disable any CSS transitions
          }}
        />
      ))}
    </div>
  );
};
