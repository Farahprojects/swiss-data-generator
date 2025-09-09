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
    this._frameSizeTarget = 160; // 10ms at 16kHz
  }

  static get parameterDescriptors() {
    return [];
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) {
      return true;
    }

    // Downmix to mono
    const channelData = input[0];
    if (!channelData) return true;
    const numFrames = channelData.length;

    for (let i = 0; i < numFrames; i++) {
      const monoSample = channelData[i];

      // Naive resampler: pick samples based on accumulator
      this._resampleAccumulator += 1;
      while (this._resampleAccumulator >= this._resampleRatio) {
        this._buffer.push(monoSample);
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


