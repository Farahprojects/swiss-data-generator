/**
 * 🎵 ENVELOPE GENERATOR - Real PCM-Derived Envelopes
 * 
 * Generates envelope data from decoded MP3 audio for smooth speaking bar animation.
 * Fails fast if envelope is invalid - no silent fallbacks.
 */

export interface EnvelopeResult {
  envelope: number[];
  duration: number;
  isValid: boolean;
  error?: string;
}

export class EnvelopeGenerator {
  /**
   * Generate envelope from decoded audio buffer
   * @param audioBuffer - Decoded audio from AudioContext.decodeAudioData
   * @returns EnvelopeResult with normalized RMS values or error
   */
  static generateEnvelope(audioBuffer: AudioBuffer): EnvelopeResult {
    try {
      // Get PCM channel data (mono or first channel)
      const channelData = audioBuffer.getChannelData(0); // Float32Array [-1..1]
      const windowSize = 512; // samples per frame for RMS calculation
      const envelope: number[] = [];
      
      // Calculate RMS for each window
      for (let i = 0; i < channelData.length; i += windowSize) {
        let sum = 0;
        const endIndex = Math.min(i + windowSize, channelData.length);
        
        for (let j = i; j < endIndex; j++) {
          sum += channelData[j] ** 2;
        }
        
        const rms = Math.sqrt(sum / (endIndex - i));
        envelope.push(rms);
      }
      
      // Validate envelope has meaningful variation
      const maxVal = Math.max(...envelope);
      const minVal = Math.min(...envelope);
      const amplitudeRange = maxVal - minVal;
      
      if (amplitudeRange < 0.05) {
        return {
          envelope: [],
          duration: audioBuffer.duration,
          isValid: false,
          error: `Envelope invalid: amplitude too flat (range: ${amplitudeRange.toFixed(4)})`
        };
      }
      
      // Normalize envelope to 0..1 range
      const normalizedEnvelope = envelope.map(v => (v - minVal) / amplitudeRange);
      
      return {
        envelope: normalizedEnvelope,
        duration: audioBuffer.duration,
        isValid: true
      };
      
    } catch (error) {
      return {
        envelope: [],
        duration: audioBuffer.duration,
        isValid: false,
        error: `Envelope generation failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
}
