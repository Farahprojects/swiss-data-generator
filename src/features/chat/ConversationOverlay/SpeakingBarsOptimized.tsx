import React, { useEffect, useRef } from 'react';

interface Props {
  isActive: boolean;
  audioLevel?: number;
}

export const SpeakingBarsOptimized: React.FC<Props> = ({ isActive, audioLevel = 0 }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // 🎯 DUMB: Just update CSS variables directly from precomputed envelope (no math!)
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    // 🎯 BASELINE: Start with visible height, then add audio level for movement
    const baselineHeight = 0.4; // Always visible baseline (40% of bar height)
    const audioMovement = audioLevel * 0.6; // Audio adds up to 60% more height
    const scaleY = baselineHeight + audioMovement; // Total: 40% + 0-60% = 40-100%
    
    // Update CSS variable for smooth GPU animation
    containerRef.current.style.setProperty('--bar-scale', scaleY.toString());
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
          className={`bg-black rounded-full ${bar.className} transition-transform duration-75`}
          style={{
            width: '16px', // All bars same width
            transformOrigin: 'center',
            transform: `scaleY(var(--bar-scale, 1))`,
            willChange: 'transform', // GPU acceleration hint
          }}
        />
      ))}
    </div>
  );
};
