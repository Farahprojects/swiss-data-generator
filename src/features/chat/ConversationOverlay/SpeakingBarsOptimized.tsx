import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

interface Props {
  audioLevel: number;
  isActive: boolean;
}

export const SpeakingBarsOptimized: React.FC<Props> = ({ audioLevel, isActive }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Update CSS variables directly - no React re-renders!
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Set CSS custom property for GPU-accelerated animations
    containerRef.current.style.setProperty('--audio-level', audioLevel.toString());
    containerRef.current.style.setProperty('--is-active', isActive ? '1' : '0');
  }, [audioLevel, isActive]);

  // Generate 4 bars with different base heights
  const bars = Array.from({ length: 4 }, (_, index) => {
    const isMiddleBar = index === 1 || index === 2;
    const baseHeight = isMiddleBar ? 0.8 : 0.6;
    
    return (
      <div
        key={index}
        className="speaking-bar"
        style={{
          '--bar-index': index.toString(),
          '--base-height': baseHeight.toString(),
        } as React.CSSProperties}
      />
    );
  });

  return (
    <div 
      ref={containerRef}
      className="speaking-bars-container"
      style={{
        '--audio-level': audioLevel.toString(),
        '--is-active': isActive ? '1' : '0',
      } as React.CSSProperties}
    >
      {bars}
      
      {/* CSS handles all animations via custom properties */}
      <style jsx>{`
        .speaking-bars-container {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          height: 64px;
          width: 112px;
        }
        
        .speaking-bar {
          width: 16px;
          height: 56px;
          background-color: rgb(0, 0, 0);
          border-radius: 50%;
          transform-origin: center;
          
          /* GPU-accelerated animations via CSS variables */
          transform: scaleY(calc(var(--base-height) + var(--audio-level) * 0.4));
          opacity: calc(0.75 + var(--is-active) * 0.25);
          
          /* Smooth transitions for GPU acceleration */
          transition: transform 0.1s cubic-bezier(0.4, 0, 0.2, 1),
                      opacity 0.15s ease;
        }
        
        /* Hover effects */
        .speaking-bar:hover {
          transform: scaleY(calc(var(--base-height) + var(--audio-level) * 0.4)) scale(1.1);
        }
      `}</style>
    </div>
  );
};
