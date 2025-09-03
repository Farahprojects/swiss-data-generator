/**
 * 🎵 ENVELOPE GENERATOR - Progressive PCM-Derived Envelopes
 * 
 * Generates envelope data progressively for instant speaking bar animation.
 * Quick preview for immediate start, full envelope for perfect sync.
 */

export interface EnvelopeResult {
  envelope: number[];
  duration: number;
  isValid: boolean;
  error?: string;
}

export interface PreviewEnvelope {
  level: number;
  isValid: boolean;
  error?: string;
}

export class EnvelopeGenerator {
  /**
   * Generate quick preview envelope from first ~100ms of audio
   * @param audioBuffer - Decoded audio from AudioContext.decodeAudioData
   * @returns PreviewEnvelope for immediate bar animation
   */
  static generatePreviewEnvelope(audioBuffer: AudioBuffer): PreviewEnvelope {
    try {
      const channelData = audioBuffer.getChannelData(0);
      const previewWindowSize = 512; // samples per frame
      const previewSamples = Math.min(previewWindowSize * 4, channelData.length); // first ~100ms
      
      if (previewSamples < previewWindowSize) {
        return {
          level: 0,
          isValid: false,
          error: 'Audio too short for preview envelope'
        };
      }
      
      // Calculate RMS for preview window
      let sum = 0;
      for (let i = 0; i < previewSamples; i++) {
        sum += channelData[i] ** 2;
      }
      
      const previewLevel = Math.sqrt(sum / previewSamples);
      
      // Validate preview has meaningful variation
      if (previewLevel < 0.01) {
        return {
          level: 0,
          isValid: false,
          error: 'Preview envelope too quiet'
        };
      }
      
      return {
        level: Math.min(1.0, previewLevel * 10), // Scale up for visibility
        isValid: true
      };
      
    } catch (error) {
      return {
        level: 0,
        isValid: false,
        error: `Preview envelope generation failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Generate full envelope progressively from decoded audio buffer
   * @param audioBuffer - Decoded audio from AudioContext.decodeAudioData
   * @returns EnvelopeResult with normalized RMS values or error
   */
  static generateFullEnvelope(audioBuffer: AudioBuffer): EnvelopeResult {
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
