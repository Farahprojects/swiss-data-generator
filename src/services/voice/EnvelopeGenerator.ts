/**
 * 🎵 ENVELOPE GENERATOR - Professional PCM-Derived Envelopes
 * 
 * Generates envelope data from real PCM samples for perfect audio sync.
 * No fallbacks, no fake levels - bars always represent actual audio.
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
   * Generate accurate preview envelope from first PCM chunk
   * @param audioBuffer - Decoded audio from AudioContext.decodeAudioData
   * @returns PreviewEnvelope derived from real PCM data
   */
  static generatePreviewEnvelope(audioBuffer: AudioBuffer): PreviewEnvelope {
    try {
      const channelData = audioBuffer.getChannelData(0);
      const sampleRate = audioBuffer.sampleRate;
      
      // Professional approach: Use first 100ms window for accurate preview
      const previewDuration = 0.1; // 100ms
      const previewSamples = Math.floor(sampleRate * previewDuration);
      const actualSamples = Math.min(previewSamples, channelData.length);
      
      if (actualSamples < 512) { // Minimum viable window
        return {
          level: 0,
          isValid: false,
          error: `Audio too short for preview (${actualSamples} samples)`
        };
      }
      
      // Calculate RMS over the first 100ms window
      let sum = 0;
      for (let i = 0; i < actualSamples; i++) {
        sum += channelData[i] ** 2;
      }
      
      const previewLevel = Math.sqrt(sum / actualSamples);
      
      // Debug logging for analysis
      console.log(`[EnvelopeGenerator] 🔍 Professional preview analysis:`, {
        sampleRate,
        previewDuration: `${previewDuration * 1000}ms`,
        actualSamples,
        rawRMS: previewLevel.toFixed(6),
        sampleRange: `[${Math.min(...channelData.slice(0, actualSamples)).toFixed(4)}, ${Math.max(...channelData.slice(0, actualSamples)).toFixed(4)}]`
      });
      
      // Professional validation: Accept any non-zero amplitude
      if (previewLevel < 0.000001) { // Extremely low threshold for silent audio
        return {
          level: 0,
          isValid: false,
          error: `Audio appears silent (RMS: ${previewLevel.toFixed(8)})`
        };
      }
      
      // Scale appropriately for visibility while maintaining accuracy
      const scaledLevel = Math.min(1.0, previewLevel * 50); // Conservative scaling
      
      return {
        level: scaledLevel,
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
      const sampleRate = audioBuffer.sampleRate;
      const windowSize = Math.floor(sampleRate * 0.02); // 20ms windows for smooth animation
      const envelope: number[] = [];
      
      // Calculate RMS for each 20ms window
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
      
      if (amplitudeRange < 0.001) { // More lenient for full envelope
        return {
          envelope: [],
          duration: audioBuffer.duration,
          isValid: false,
          error: `Envelope invalid: amplitude too flat (range: ${amplitudeRange.toFixed(6)})`
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
