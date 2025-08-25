import React, { useEffect, useMemo, useRef, useState } from "react";

type TorusListeningProps = {
  /** Set true while your app is in “listening” state (after a user gesture). */
  active: boolean;
  /** Size of the whole widget in pixels. */
  size?: number;
  /** Number of dots per spiral arm. Total dots = dotsPerArm * 2 */
  dotsPerArm?: number;
};

// Helper to interpolate between two colors
const lerpColor = (
  c1: { r: number; g: number; b: number },
  c2: { r: number; g: number; b: number },
  t: number
) => {
  const r = c1.r + (c2.r - c1.r) * t;
  const g = c1.g + (c2.g - c1.g) * t;
  const b = c1.b + (c2.b - c1.b) * t;
  return `rgb(${r.toFixed(0)}, ${g.toFixed(0)}, ${b.toFixed(0)})`;
};

export default function TorusListening({
  active,
  size = 180,
  dotsPerArm = 22,
}: TorusListeningProps) {
  const [level, setLevel] = useState(0); // 0..1 smoothed audio level
  const [time, setTime] = useState(0); // time for idle animation
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataRef = useRef<Uint8Array | null>(null);

  const dots = useMemo(() => {
    const out: { x: number; y: number; r: number; idx: number }[] = [];
    const arms = 2;
    const R = size * 0.40;
    const spiralTightness = 0.12;
    for (let arm = 0; arm < arms; arm++) {
      for (let i = 0; i < dotsPerArm; i++) {
        const t = i / (dotsPerArm - 1);
        const theta = (t * Math.PI * 2) + (arm * Math.PI);
        const inward = 1 - (t * spiralTightness);
        const radius = R * inward;
        const x = radius * Math.cos(theta);
        const y = radius * Math.sin(theta);
        const r = (size * 0.018) * (0.85 + 0.3 * (1 - t));
        out.push({ x, y, r, idx: arm * dotsPerArm + i });
      }
    }
    return out;
  }, [size, dotsPerArm]);

  useEffect(() => {
    let mounted = true;

    async function start() {
      if (!active) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }

        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.85;
        source.connect(analyser);

        streamRef.current = stream;
        audioCtxRef.current = ctx;
        analyserRef.current = analyser;
        dataRef.current = new Uint8Array(analyser.frequencyBinCount);

        loop();
      } catch (e) {
        console.warn("Mic unavailable:", e);
        loop(); 
      }
    }

    function stop() {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      if (analyserRef.current) {
        try { analyserRef.current.disconnect(); } catch {}
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      analyserRef.current = null;
      dataRef.current = null;
    }

    function loop() {
      const tick = () => {
        if (!mounted) return;
        
        setTime(performance.now());
        
        const analyser = analyserRef.current;
        const buf = dataRef.current;
        let rms = 0;
        if (analyser && buf) {
          analyser.getByteTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) {
            const v = (buf[i] - 128) / 128;
            sum += v * v;
          }
          rms = Math.sqrt(sum / buf.length);
          setLevel(prev => prev * 0.80 + rms * 0.20);
        } else {
           // If no mic, decay to zero
          setLevel(prev => prev * 0.9);
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    }

    if (active) {
      start();
    } else {
      stop();
    }

    return () => {
      mounted = false;
      stop();
    };
  }, [active]);

  const view = useMemo(() => {
    const half = size / 2;
    return { w: size, h: size, cx: half, cy: half };
  }, [size]);

  // Animation parameters
  const t = time / 1000;
  const energy = Math.min(1, level * 7);
  const idleBreathe = 0.1 + 0.1 * (Math.sin(t * 1.5) + 1);

  // Colors
  const baseColor = { r: 60, g: 60, b: 65 }; // Dark cool grey
  const activeColor = { r: 255, g: 255, b: 255 }; // Pure white

  return (
    <div
      aria-label="Listening"
      role="img"
      style={{
        width: size,
        height: size,
        display: "grid",
        placeItems: "center",
      }}
    >
      <svg width={view.w} height={view.h} viewBox={`0 0 ${view.w} ${view.h}`} aria-hidden>
        <g transform={`translate(${view.cx} ${view.cy})`}>
          {dots.map((d) => {
            const wave = (Math.sin(t * 2 - d.idx * 0.4) + 1) / 2;
            const intensity = Math.max(idleBreathe, wave * energy);
            
            const dotFill = lerpColor(baseColor, activeColor, intensity);
            const dotScale = 1 + 0.3 * intensity;

            return (
              <circle
                key={d.idx}
                cx={d.x}
                cy={d.y}
                r={d.r * dotScale}
                fill={dotFill}
                style={{
                  transition: "r 100ms ease-out, fill 100ms ease-out",
                }}
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
}
