import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';

interface Props {
  isActive: boolean;
}

export interface SpeakingBarsRef {
  updateAudioLevel: (level: number) => void;
}

export const SpeakingBarsOptimized = forwardRef<SpeakingBarsRef, Props>(({ isActive }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Expose method to parent for direct audio level updates
  useImperativeHandle(ref, () => ({
    updateAudioLevel: (level: number) => {
      if (containerRef.current) {
        // Direct DOM manipulation - no React re-renders!
        containerRef.current.style.setProperty('--audio-level', level.toString());
        containerRef.current.style.setProperty('--is-active', isActive ? '1' : '0');
      }
    }
  }), [isActive]);

  // Generate 4 bars with different base heights
  const bars = Array.from({ length: 4 }, (_, index) => {
    const isMiddleBar = index === 1 || index === 2;
    const baseHeight = isMiddleBar ? 0.8 : 0.6;
    
    return (
      <div
        key={index}
        className="bg-black rounded-full"
        style={{
          // Dimensions
          width: '16px',
          height: '56px',
          transformOrigin: 'center',
          // CSS variable inputs
          ['--bar-index' as any]: index.toString(),
          ['--base-height' as any]: baseHeight.toString(),
          // GPU-accelerated transform driven by CSS variables - MORE DYNAMIC!
          transform: 'scaleY(calc(var(--base-height) + var(--audio-level) * 1.2))',
          opacity: `calc(0.75 + var(--is-active) * 0.25)`,
          // Smooth transitions - MOBILE OPTIMIZED
          transition: 'transform 150ms ease-out, opacity 200ms ease'
        } as React.CSSProperties}
      />
    );
  });

  return (
    <div 
      ref={containerRef}
      className="flex items-center justify-center gap-3 h-16 w-28"
      style={{
        ['--audio-level' as any]: '0',
        ['--is-active' as any]: isActive ? '1' : '0',
      } as React.CSSProperties}
    >
      {bars}
    </div>
  );
});
