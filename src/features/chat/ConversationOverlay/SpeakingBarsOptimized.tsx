import React, { useEffect, useRef } from 'react';

interface Props {
  isActive: boolean;
  audioLevel?: number;
}

export const SpeakingBarsOptimized: React.FC<Props> = ({ isActive, audioLevel = 0 }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // 🎯 MOBILE-FIRST: Use CSS variables + GPU transforms for smooth animation
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    let frameId: number;
    
    const animate = () => {
      if (!containerRef.current) return;
      
      // 🎵 Calculate scale values for each bar
      const minScale = 0.45;
      const extra = Math.min(0.75, audioLevel * 1.2); // Dramatic movement
      const scaleY = minScale + extra;
      
      // 🎨 Update CSS variables for GPU-accelerated animation
      containerRef.current.style.setProperty('--bar-scale', scaleY.toString());
      
      frameId = requestAnimationFrame(animate);
    };

    // 🚀 Start animation loop
    frameId = requestAnimationFrame(animate);
    
    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
    };
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
          }}
        />
      ))}
    </div>
  );
};
