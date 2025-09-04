/**
 * 🎵 ENVELOPE CONSUMER - Frontend Only Consumes Precomputed Data
 * 
 * Frontend is now "dumb" - only consumes envelope data from backend.
 * No RMS, no sliding windows, no PCM processing - all done on edge function.
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
   * Frontend no longer generates envelopes - only consumes precomputed data
   * This method is deprecated and should not be used
   */
  static generatePreviewEnvelope(audioBuffer: AudioBuffer): PreviewEnvelope {
    console.warn('[EnvelopeGenerator] ❌ Frontend envelope generation is deprecated - use precomputed data from backend');
    return {
      level: 0,
      isValid: false,
      error: 'Frontend envelope generation removed - use backend precomputed data'
    };
  }

  /**
   * Frontend no longer generates envelopes - only consumes precomputed data
   * This method is deprecated and should not be used
   */
  static generateFullEnvelope(audioBuffer: AudioBuffer): EnvelopeResult {
    console.warn('[EnvelopeGenerator] ❌ Frontend envelope generation is deprecated - use precomputed data from backend');
    return {
      envelope: [],
      duration: audioBuffer.duration,
      isValid: false,
      error: 'Frontend envelope generation removed - use backend precomputed data'
    };
  }
}
