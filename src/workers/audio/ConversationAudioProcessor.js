// Simplified audio processor - no heavy filtering

class ConversationAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.inputSampleRate = sampleRate;
    this.targetSampleRate = 16000;
    this._resampleRatio = this.inputSampleRate / this.targetSampleRate;
    this._resampleAccumulator = 0;
    this._buffer = [];
    this._frameSizeTarget = 320; // 20ms at 16kHz
  }

  static get parameterDescriptors() { return []; }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;

    const channels = input;
    const firstChannel = channels[0];
    if (!firstChannel) return true;
    const numFrames = firstChannel.length;

    for (let i = 0; i < numFrames; i++) {
      // Simple mono mix
      let sum = 0;
      for (let c = 0; c < channels.length; c++) {
        const ch = channels[c];
        sum += ch ? ch[i] : 0;
      }
      const monoSample = sum / Math.max(1, channels.length);

      // Simple downsampling - no filtering
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