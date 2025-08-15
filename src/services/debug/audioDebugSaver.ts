/**
 * 🔍 AUDIO DEBUG SAVER - Global debug audio storage for failed STT analysis
 * 
 * Saves failed audio to ChatAudio bucket for manual inspection and debugging.
 */

import { supabase } from '@/integrations/supabase/client';

export class AudioDebugSaver {
  /**
   * Save debug audio to ChatAudio bucket with metadata
   */
  static async saveFailedAudio(
    audioBlob: Blob, 
    reason: string, 
    metadata: {
      service?: string;
      voiceDetected?: boolean;
      bufferChunks?: number;
      finalBlobSize?: number;
      [key: string]: any;
    } = {}
  ): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `debug-failed-${reason}-${timestamp}.webm`;
      
      console.log(`🔍 [AudioDebugSaver] Saving failed audio: ${filename} (${audioBlob.size} bytes)`);
      console.log(`🔍 [AudioDebugSaver] Reason: ${reason}`);
      console.log(`🔍 [AudioDebugSaver] Metadata:`, metadata);
      
      const { error } = await supabase.storage
        .from('ChatAudio')
        .upload(filename, audioBlob, {
          contentType: 'audio/webm',
          metadata: {
            ...metadata,
            timestamp,
            reason,
            debugType: 'failed-audio-analysis',
            blobSize: audioBlob.size
          }
        });

      if (error) {
        console.error('❌ [AudioDebugSaver] Failed to save debug audio:', error);
      } else {
        console.log(`✅ [AudioDebugSaver] Debug audio saved successfully: ${filename}`);
        console.log(`🔗 [AudioDebugSaver] Check bucket: https://supabase.com/dashboard/project/wrvqqvqvwqmfdqvqmaar/storage/buckets/ChatAudio`);
      }
    } catch (error) {
      console.error('❌ [AudioDebugSaver] Error saving debug audio:', error);
    }
  }

  /**
   * Create a debug saver function for a specific service
   */
  static createSaver(serviceName: string) {
    return (audioBlob: Blob, reason: string) => {
      AudioDebugSaver.saveFailedAudio(audioBlob, reason, {
        service: serviceName,
        timestamp: Date.now()
      });
    };
  }
}
