// src/features/chat/VoiceWaveform.tsx
import React, { useEffect, useRef } from 'react';

interface VoiceWaveformProps {
  audioLevelRef: React.MutableRefObject<number>; // Real-time level (0..1)
}

// Canvas-based scrolling "reel" waveform for maximum smoothness on mobile/Safari.
// UI-only smoothing and clamping applied; raw signal is untouched.
export const VoiceWaveform: React.FC<VoiceWaveformProps> = ({ audioLevelRef }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);
  const uiLevelRef = useRef<number>(0);
  const bufferRef = useRef<Float32Array | null>(null);
  const writeIdxRef = useRef<number>(0);

  const isSafari = typeof navigator !== 'undefined'
    && /safari/i.test(navigator.userAgent)
    && !/chrome|chromium|android/i.test(navigator.userAgent);
  const isAndroidChrome = typeof navigator !== 'undefined'
    && /Android/i.test(navigator.userAgent)
    && /Chrome\/\d+/i.test(navigator.userAgent)
    && /Mobile/i.test(navigator.userAgent);

  // Layout constants
  const RIGHT_GUTTER_PX = 80; // reserve area for right-side buttons with extra padding
  const LEFT_GUTTER_PX = 24; // left padding to prevent touching edge
  const TARGET_FPS = isAndroidChrome ? 15 : 20; // Slower on Android Chrome
  const BAR_WIDTH = 2; // Thinner lines
  const BAR_GAP = isAndroidChrome ? 8 : 6; // fewer bars to draw per frame on Android Chrome

  // Resize canvas and (re)allocate ring buffer based on available width
  const resizeCanvas = () => {
    if (!canvasRef.current || !containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    // Cap DPR to 1 on Android Chrome to avoid HiDPI cost
    const dpr = isAndroidChrome ? 1 : 1;
    canvasRef.current.width = Math.max(1, Math.floor(clientWidth * dpr));
    canvasRef.current.height = Math.max(1, Math.floor(clientHeight * dpr));

    const drawWidth = Math.max(0, clientWidth - RIGHT_GUTTER_PX - LEFT_GUTTER_PX);
    const pitch = BAR_WIDTH + BAR_GAP;
    const cols = Math.max(2, Math.floor(drawWidth / pitch));
    bufferRef.current = new Float32Array(cols);
    writeIdxRef.current = 0;

    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      if (dpr !== 1) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, clientWidth, clientHeight);
    }
  };

  // Animation loop: write level into ring buffer and redraw discrete bars
  const animate = () => {
    const now = performance.now();
    const frameInterval = 1000 / TARGET_FPS;
    if (now - lastTickRef.current < frameInterval) {
      rafRef.current = requestAnimationFrame(animate);
      return;
    }
    lastTickRef.current = now;

    const canvas = canvasRef.current;
    if (!canvas) {
      rafRef.current = requestAnimationFrame(animate);
      return;
    }

    const ctx = canvas.getContext('2d');
    const container = containerRef.current;
    if (!ctx || !container) {
      rafRef.current = requestAnimationFrame(animate);
      return;
    }

    const width = container.clientWidth;
    const height = container.clientHeight;
    const drawWidth = Math.max(0, width - RIGHT_GUTTER_PX - LEFT_GUTTER_PX);
    const leftPad = LEFT_GUTTER_PX;
    const pitch = BAR_WIDTH + BAR_GAP;
    const cols = bufferRef.current ? bufferRef.current.length : 0;
    if (!bufferRef.current || cols < 2) {
      rafRef.current = requestAnimationFrame(animate);
      return;
    }

    // Smooth UI level (UI only; do not modify audioLevelRef)
    const raw = audioLevelRef.current; // 0..1
    const alpha = isSafari ? 0.18 : 0.12; // Safari a bit more smoothing
    uiLevelRef.current = uiLevelRef.current + (raw - uiLevelRef.current) * alpha;
    const level = isSafari ? Math.min(uiLevelRef.current, 0.25) : uiLevelRef.current;

    // Write to ring buffer
    bufferRef.current[writeIdxRef.current] = level;
    writeIdxRef.current = (writeIdxRef.current + 1) % cols;

    // Clear drawing area
    ctx.clearRect(0, 0, width, height);

    // Draw discrete bars mapped directly from recent levels
    const centerY = height / 2;
    const verticalPadding = 8; // small padding from top/bottom edges
    const maxBarHeight = Math.max(6, height - (verticalPadding * 2)); // almost touch top/bottom
    ctx.fillStyle = '#000000';
    for (let i = 0; i < cols; i++) {
      const srcIdx = (writeIdxRef.current + i) % cols; // oldest -> newest left -> right
      const v = bufferRef.current[srcIdx];
      // Boost sensitivity: multiply by 7 to make bars reach full height with normal speech
      const boostedLevel = Math.min(1.0, v * 7.0);
      // Apple-like design touch: non-linear mapping boosts low signals for a more "live" feel
      const h = Math.max(2, Math.min(maxBarHeight, Math.floor(Math.pow(boostedLevel, 0.6) * maxBarHeight)));
      const x = leftPad + i * pitch;
      if (x + BAR_WIDTH > leftPad + drawWidth) break; // enforce boundaries
      const y = centerY - h / 2;
      ctx.fillRect(x, y, BAR_WIDTH, h);
    }

    rafRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    resizeCanvas();
    // Guard ResizeObserver without optional chaining in constructor
    const ResizeObserverCtor = (window as any).ResizeObserver as
      | (new (callback: ResizeObserverCallback) => ResizeObserver)
      | undefined;
    const ro = ResizeObserverCtor ? new ResizeObserverCtor(() => resizeCanvas()) : null;
    if (ro && containerRef.current) ro.observe(containerRef.current);

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      if (ro && containerRef.current) ro.unobserve(containerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};
