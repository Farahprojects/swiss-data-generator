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
    // DC-blocking high-pass filter state (y[n] = x[n] - x[n-1] + R*y[n-1])
    this._dcPrevIn = 0;
    this._dcPrevOut = 0;
    this._dcR = 0.995;
    // One-pole low-pass (~7 kHz at 48 kHz) to reduce aliasing before downsample
    const lpfCut = 7000; // Hz
    const twoPi = 2 * Math.PI;
    this._lpfAlpha = (twoPi * lpfCut) / (twoPi * lpfCut + this.inputSampleRate);
    this._lpfPrevOut = 0;
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

      // DC-blocking high-pass filter
      const yHP = monoSample - this._dcPrevIn + this._dcR * this._dcPrevOut;
      this._dcPrevIn = monoSample;
      this._dcPrevOut = yHP;

      // One-pole low-pass filter before decimation
      const yLP = this._lpfPrevOut + this._lpfAlpha * (yHP - this._lpfPrevOut);
      this._lpfPrevOut = yLP;

      // Resampler (decimation after LPF)
      this._resampleAccumulator += 1;
      while (this._resampleAccumulator >= this._resampleRatio) {
        this._buffer.push(yLP);
        this._resampleAccumulator -= this._resampleRatio;

        if (this._buffer.length >= this._frameSizeTarget) {
          const frame = new Float32Array(this._buffer);
          this.port.postMessage({ type: 'audio', buffer: frame.buffer }, [frame.buffer]);
          this._buffer.length = 0;
        }
      }
    }

    return true;
  }
}

registerProcessor('conversation-audio-processor', ConversationAudioProcessor);


