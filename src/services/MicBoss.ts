/**
 * 🎤 GLOBAL MIC BOSS - Singleton Authority
 * 
 * The ONE AND ONLY controller of browser microphone.
 * All functions must ask the Boss for permission.
 * 
 * Usage:
 * - Function 1: const stream = await MicBoss.requestStream()
 * - Function 2: const stream = await MicBoss.requestStream()  
 * - Function 3: const stream = await MicBoss.requestStream()
 * - Anyone: MicBoss.releaseStream()
 */

class MicBossService {
  private isOn: boolean = false;
  private currentStream: MediaStream | null = null;
  private activeRequests: Set<string> = new Set();
  private originalGetUserMedia: typeof navigator.mediaDevices.getUserMedia | null = null;

  constructor() {
    this.setupRogueDetector();
  }

  /**
   * Setup global rogue request detector
   */
  private setupRogueDetector() {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      this.originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      
      navigator.mediaDevices.getUserMedia = (constraints) => {
        console.error('🚨 ROGUE MIC REQUEST DETECTED! 🚨');
        console.error('Someone is bypassing the MIC BOSS!');
        console.trace('ROGUE REQUEST CALL STACK:');
        
        return this.originalGetUserMedia!(constraints);
      };
    }
  }

  /**
   * REQUEST STREAM - The proper way to ask for mic access
   */
  async requestStream(requesterId: string): Promise<MediaStream | null> {
    console.log(`[MIC BOSS] 📞 Request from: ${requesterId}`);
    
    // If we already have a stream, share it
    if (this.isOn && this.currentStream && this.currentStream.active) {
      console.log(`[MIC BOSS] ✅ Sharing existing stream with: ${requesterId}`);
      this.activeRequests.add(requesterId);
      return this.currentStream;
    }

    // Create new stream if needed
    if (!this.isOn) {
      try {
        console.log('[MIC BOSS] 🎤 MIC ON');
        
        const stream = await this.originalGetUserMedia!({
          audio: true
        });
        
        this.currentStream = stream;
        this.isOn = true;
        this.activeRequests.add(requesterId);
        
        console.log(`[MIC BOSS] ✅ MIC ON - Stream provided to: ${requesterId}`);
        return stream;
        
      } catch (error) {
        console.error('[MIC BOSS] ❌ MIC FAILED:', error);
        return null;
      }
    }

    return this.currentStream;
  }

  /**
   * RELEASE STREAM - Tell Boss you're done with mic
   */
  releaseStream(requesterId: string) {
    console.log(`[MIC BOSS] 📞 Release from: ${requesterId}`);
    
    this.activeRequests.delete(requesterId);
    
    // If no one else needs the mic, turn it off
    if (this.activeRequests.size === 0 && this.isOn) {
      console.log('[MIC BOSS] 🔇 MIC OFF - No more active requests');
      
      if (this.currentStream) {
        this.currentStream.getTracks().forEach(track => track.stop());
        this.currentStream = null;
      }
      
      this.isOn = false;
      console.log('[MIC BOSS] ✅ MIC OFF');
    } else {
      console.log(`[MIC BOSS] 🔄 Keeping mic ON - ${this.activeRequests.size} active requests:`, 
        Array.from(this.activeRequests));
    }
  }

  /**
   * GET STATUS - Check if mic is currently on
   */
  getStatus() {
    return {
      isOn: this.isOn,
      hasStream: !!this.currentStream,
      activeRequests: Array.from(this.activeRequests),
      streamActive: this.currentStream?.active || false
    };
  }

  /**
   * FORCE SHUTDOWN - Emergency shutdown (for debugging)
   */
  forceShutdown() {
    console.log('[MIC BOSS] 🚨 FORCE SHUTDOWN');
    
    if (this.currentStream) {
      this.currentStream.getTracks().forEach(track => track.stop());
      this.currentStream = null;
    }
    
    this.isOn = false;
    this.activeRequests.clear();
    
    console.log('[MIC BOSS] ✅ FORCE SHUTDOWN COMPLETE');
  }
}

// SINGLETON INSTANCE - Only one MIC BOSS exists
export const MicBoss = new MicBossService();
