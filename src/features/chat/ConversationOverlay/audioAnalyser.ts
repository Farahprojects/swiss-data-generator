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
    this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.source = this.context.createMediaStreamSource(stream);
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 2048;
    this.source.connect(this.analyser);
    this.monitor();
  }

  private monitor = () => {
    const data = new Uint8Array(this.analyser.fftSize);
    this.analyser.getByteTimeDomainData(data);
    const rms = Math.sqrt(data.reduce((s, v) => s + (v - 128) ** 2, 0) / data.length);
    const db = 20 * Math.log10(Math.max(rms, 1e-6) / 128);

    if (db < this.silenceThreshold) {
      if (this.silenceTimer === null) {
        this.silenceTimer = window.setTimeout(() => {
          this.onSilence();
        }, this.silenceDuration);
      }
    } else if (this.silenceTimer !== null) {
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
