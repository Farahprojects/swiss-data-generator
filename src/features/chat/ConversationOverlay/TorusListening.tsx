import React, { useEffect, useMemo, useRef, useState } from "react";

type TorusListeningProps = {
  /** Set true while your app is in “listening” state (after a user gesture). */
  active: boolean;
  /** Size of the whole widget in pixels. */
  size?: number;
  /** Number of dots per spiral arm. Total dots = dotsPerArm * 2 */
  dotsPerArm?: number;
  /** Base color when quiet. */
  baseColor?: string; // e.g. "#111"
};

export default function TorusListening({
  active,
  size = 180,
  dotsPerArm = 22,
  baseColor = "#111",
}: TorusListeningProps) {
  const [level, setLevel] = useState(0); // 0..1 approx loudness
  const [rot, setRot] = useState(0);     // rotation degrees
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataRef = useRef<Uint8Array | null>(null);

  // Build dot positions for a 2-arm dotted torus look
  const dots = useMemo(() => {
    const out: { x: number; y: number; r: number; arm: number; idx: number }[] = [];
    const arms = 2;
    const total = dotsPerArm * arms;
    // Outer radius and subtle inward spiral
    const R = size * 0.40;
    const spiralTightness = 0.12; // tweak for the “swirl”
    for (let arm = 0; arm < arms; arm++) {
      for (let i = 0; i < dotsPerArm; i++) {
        const t = i / (dotsPerArm - 1);              // 0..1 along the arm
        const theta = (t * Math.PI * 2) + (arm * Math.PI); // offset arm by pi
        const inward = 1 - (t * spiralTightness);    // gently move inward
        const radius = R * inward;
        const x = radius * Math.cos(theta);
        const y = radius * Math.sin(theta);
        // Slight size falloff to mimic your reference
        const r = (size * 0.018) * (0.85 + 0.3 * (1 - t));
        out.push({ x, y, r, arm, idx: arm * dotsPerArm + i });
      }
    }
    return out;
  }, [size, dotsPerArm]);

  // Audio setup/teardown tied to `active`
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
        // If mic is blocked/denied, just idle-animate (no crash)
        console.warn("Mic unavailable:", e);
        loop(); // still rotate without audio
      }
    }

    function stop() {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      if (analyserRef.current && audioCtxRef.current) {
        try { analyserRef.current.disconnect(); } catch {}
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (audioCtxRef.current) {
        // Don't close immediately; some browsers dislike it. Just leave for GC.
      }
      analyserRef.current = null;
      dataRef.current = null;
    }

    function loop() {
      const tick = () => {
        // Rotate continuously when active, slower when idle
        setRot(prev => (prev + (active ? 0.7 : 0.25)) % 360);

        // Update mic level if we have audio
        const analyser = analyserRef.current;
        const buf = dataRef.current;
        if (analyser && buf) {
          analyser.getByteTimeDomainData(buf);
          // Compute RMS
          let sum = 0;
          for (let i = 0; i < buf.length; i++) {
            const v = (buf[i] - 128) / 128; // -1..1
            sum += v * v;
          }
          const rms = Math.sqrt(sum / buf.length); // ~0..1
          // Ease to reduce jitter
          setLevel(prev => prev * 0.80 + rms * 0.20);
        } else {
          // No mic: gently breathe
          const t = performance.now() / 1000;
          const faux = (Math.sin(t * 2) + 1) / 10; // ~0..0.2
          setLevel(prev => prev * 0.9 + faux * 0.1);
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    }

    start();
    return () => {
      mounted = false;
      stop();
    };
  }, [active]);

  // Map loudness to a subtle color & size change
  // level ~ 0..1 → hue shift & lightness bump
  const hueBase = 220; // deep blue-violet base to fit your brand vibe
  const hueDelta = 18; // subtle hue travel on speech
  const lightnessBase = 16; // dark when idle
  const lightnessBoost = Math.min(26, 10 + Math.round(level * 100) / 2); // brighten on voice
  const hue = hueBase + level * hueDelta;
  const fillQuiet = baseColor; // when truly idle
  const fillTalk = `hsl(${hue}deg 90% ${lightnessBase + lightnessBoost}%)`;

  const dotFill = active ? fillTalk : fillQuiet;
  const scaleTalk = 1 + Math.min(0.25, level * 0.6); // gentle pop on voice

  const view = useMemo(() => {
    const half = size / 2;
    return { w: size, h: size, cx: half, cy: half };
  }, [size]);

  return (
    <div
      aria-label="Listening"
      role="img"
      style={{
        width: size,
        height: size,
        display: "grid",
        placeItems: "center",
        transform: `rotate(${rot}deg)`,
        transition: "transform 80ms linear",
        willChange: "transform",
        userSelect: "none",
      }}
    >
      <svg width={view.w} height={view.h} viewBox={`0 0 ${view.w} ${view.h}`} aria-hidden>
        {/* optional subtle glow when speaking */}
        {active && (
          <circle
            cx={view.cx}
            cy={view.cy}
            r={size * 0.44}
            fill="none"
            stroke={`hsl(${hue}deg 100% 58% / 0.08)`}
            strokeWidth={size * 0.06}
          />
        )}

        <g transform={`translate(${view.cx} ${view.cy})`}>
          {dots.map((d) => {
            // Arm-based phase so the two spirals breathe a touch differently
            const armPhase = d.arm === 0 ? 0 : Math.PI;
            const s = active ? scaleTalk * (1 + 0.06 * Math.sin((performance.now() / 300) + armPhase + d.idx * 0.12)) : 1;
            return (
              <circle
                key={d.idx}
                cx={d.x}
                cy={d.y}
                r={d.r * s}
                fill={dotFill}
                style={{
                  transition: "r 120ms ease, fill 120ms ease",
                }}
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
}
