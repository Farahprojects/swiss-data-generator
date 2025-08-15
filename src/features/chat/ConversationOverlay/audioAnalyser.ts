export const getBrowserThresholdDb = () => {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('firefox')) return -50;
  if (/safari/.test(ua) && !/chrome|chromium/.test(ua)) return -48; // Safari
  return -45; // Chrome/Edge default
};

export class SilenceDetector {
  private context: AudioContext | null = null;
  private analyser!: AnalyserNode;
  private source!: MediaStreamAudioSourceNode;
  private silenceThreshold = getBrowserThresholdDb();
  private silenceDuration = 3000; // ms
  private silenceTimer: number | null = null;
  private onSilence: () => void;

  constructor(onSilence: () => void) {
    this.onSilence = onSilence;
  }

  async attachStream(stream: MediaStream) {
    console.log('[SilenceDetector] Attaching to audio stream, threshold:', this.silenceThreshold, 'dB');
    this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.source = this.context.createMediaStreamSource(stream);
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 2048;
    this.source.connect(this.analyser);
    console.log('[SilenceDetector] Audio context created, starting monitoring...');
    this.monitor();
  }

  private monitor = () => {
    const data = new Uint8Array(this.analyser.fftSize);
    this.analyser.getByteTimeDomainData(data);
    const rms = Math.sqrt(data.reduce((s, v) => s + (v - 128) ** 2, 0) / data.length);
    const db = 20 * Math.log10(Math.max(rms, 1e-6) / 128);

    // Log audio levels periodically (every ~1 second)
    if (Math.random() < 0.02) { // ~2% chance per frame = ~1x per second at 60fps
      console.log('[SilenceDetector] Audio level:', db.toFixed(1), 'dB (threshold:', this.silenceThreshold, 'dB)');
    }

    if (db < this.silenceThreshold) {
      if (this.silenceTimer === null) {
        console.log('[SilenceDetector] Silence detected, starting timer for', this.silenceDuration, 'ms');
        this.silenceTimer = window.setTimeout(() => {
          console.log('[SilenceDetector] Silence timeout reached, triggering onSilence callback');
          this.onSilence();
        }, this.silenceDuration);
      }
    } else if (this.silenceTimer !== null) {
      console.log('[SilenceDetector] Audio detected, canceling silence timer');
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    requestAnimationFrame(this.monitor);
  };

  cleanup() {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    this.context?.close();
  }
}
