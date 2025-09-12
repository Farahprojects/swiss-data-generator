// AudioWorkletProcessor that captures mic audio, downmixes to mono, resamples to 16 kHz,
// and streams Float32Array frames to the main thread.

class ConversationAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.inputSampleRate = sampleRate; // worklet context sample rate
    this.targetSampleRate = 16000;
    this._resampleRatio = this.inputSampleRate / this.targetSampleRate;
    this._resampleAccumulator = 0;
    this._buffer = [];
    this._frameSizeTarget = 320; // 20ms at 16kHz - sweet spot for mobile/desktop
    this._ts = 0; // monotonically increasing frame timestamp (ms @ 50fps)
  }

  static get parameterDescriptors() {
    return [];
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) {
      return true;
    }

    // input is an array of channels: [Float32Array, Float32Array, ...]
    const channels = input;
    const firstChannel = channels[0];
    if (!firstChannel) return true;
    const numFrames = firstChannel.length;

    for (let i = 0; i < numFrames; i++) {
      // Average available channels to mono (handles 1..N channels)
      let sum = 0;
      for (let c = 0; c < channels.length; c++) {
        const ch = channels[c];
        sum += ch ? ch[i] : 0;
      }
      const monoSample = sum / Math.max(1, channels.length);

      // Naive resampler: pick samples based on accumulator
      this._resampleAccumulator += 1;
      while (this._resampleAccumulator >= this._resampleRatio) {
        this._buffer.push(monoSample);
        this._resampleAccumulator -= this._resampleRatio;

        if (this._buffer.length >= this._frameSizeTarget) {
          const frame = new Float32Array(this._buffer);
          // Attach lightweight timestamp to support stale-frame dropping in worker
          this._ts += 20; // ~20ms per frame
          this.port.postMessage({ type: 'audio', buffer: frame.buffer, ts: this._ts }, [frame.buffer]);
          this._buffer.length = 0;
        }
      }
    }

    return true;
  }
}

registerProcessor('conversation-audio-processor', ConversationAudioProcessor);


