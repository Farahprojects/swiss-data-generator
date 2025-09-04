import React, { useEffect, useRef } from 'react';
import { directBarsAnimationService, FourBarLevels } from '@/services/voice/DirectBarsAnimationService';

interface Props {
  isActive: boolean;
}

export const SpeakingBarsOptimized: React.FC<Props> = ({ isActive }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // 🎯 REAL-TIME: 4-bar updates from browser audio analysis
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const applyBars = (levels: FourBarLevels) => {
      // 🎯 DEBUG: Verify all bars get the same signal
      const allSame = levels[0] === levels[1] && levels[1] === levels[2] && levels[2] === levels[3];
      if (!allSame) {
        console.warn('[SpeakingBars] ⚠️ Bars not synchronized:', levels);
      }
      
      // levels are 0..1 final scale values per bar from real-time analysis
      containerRef.current!.style.setProperty('--bar1-scale', levels[0].toString());
      containerRef.current!.style.setProperty('--bar2-scale', levels[1].toString());
      containerRef.current!.style.setProperty('--bar3-scale', levels[2].toString());
      containerRef.current!.style.setProperty('--bar4-scale', levels[3].toString());
    };

    const unsubscribe = directBarsAnimationService.subscribe(applyBars);
    return unsubscribe;
  }, [isActive]);

  // 🎯 SIMPLIFIED: All bars identical for perfect synchronization
  const bars = [
    { id: 0, className: 'h-20' }, // All bars same height
    { id: 1, className: 'h-20' }, // All bars same height
    { id: 2, className: 'h-20' }, // All bars same height
    { id: 3, className: 'h-20' }, // All bars same height
  ];

  return (
    <div 
      ref={containerRef}
      className="flex items-center justify-center gap-3 h-24 w-28"
      style={{
        willChange: 'transform', // GPU acceleration hint
      } as React.CSSProperties}
    >
      {bars.map((bar, idx) => (
        <div
          key={bar.id}
          className={`bg-black rounded-full ${bar.className}`}
          style={{
            width: '16px', // All bars same width
            transformOrigin: 'center', // Scale from center outward (up and down)
            transform: `scaleY(var(--bar${idx+1}-scale, 1))`,
            willChange: 'transform', // GPU acceleration hint
            transition: 'none !important', // Disable any CSS transitions
          }}
        />
      ))}
    </div>
  );
};
