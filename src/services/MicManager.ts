/**
 * 🎤 MIC MANAGER - Lightweight Bouncer
 * 
 * ONLY handles:
 * - Permissions (can this feature use the mic?)
 * - Ownership (who currently owns the mic?)
 * - Stream sharing (optional - share one stream)
 * 
 * Does NOT handle:
 * - State transitions (isRecording, isProcessing)
 * - Component behavior (silence detection, etc.)
 * - Event management
 */

class MicManagerService {
  private currentOwner: string | null = null;
  private currentStream: MediaStream | null = null;

  /**
   * REQUEST MIC ACCESS - Can this feature use the mic?
   */
  requestAccess(ownerId: string): boolean {
    // If someone else owns it, deny access
    if (this.currentOwner && this.currentOwner !== ownerId) {
      console.log(`[MicManager] ❌ Access denied for ${ownerId} - ${this.currentOwner} owns mic`);
      return false;
    }
    
    // Grant access
    this.currentOwner = ownerId;
    console.log(`[MicManager] ✅ Access granted to ${ownerId}`);
    return true;
  }

  /**
   * RELEASE MIC ACCESS - Feature is done with mic
   */
  releaseAccess(ownerId: string): void {
    if (this.currentOwner === ownerId) {
      console.log(`[MicManager] 📞 ${ownerId} released mic access`);
      this.currentOwner = null;
      
      // Clean up shared stream if exists
      if (this.currentStream) {
        this.currentStream.getTracks().forEach(track => track.stop());
        this.currentStream = null;
      }
    } else {
      console.warn(`[MicManager] ⚠️ ${ownerId} tried to release but doesn't own mic`);
    }
  }

  /**
   * GET SHARED STREAM - Optional stream sharing
   * Each feature can still create its own stream if preferred
   */
  async getSharedStream(): Promise<MediaStream | null> {
    if (!this.currentOwner) {
      console.error('[MicManager] ❌ No owner - cannot create stream');
      return null;
    }

    // Return existing stream if active
    if (this.currentStream && this.currentStream.active) {
      console.log('[MicManager] ♻️ Returning existing shared stream');
      return this.currentStream;
    }

    // Create new stream
    try {
      console.log('[MicManager] 🎤 Creating new shared stream');
      this.currentStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      return this.currentStream;
    } catch (error) {
      console.error('[MicManager] ❌ Failed to create stream:', error);
      return null;
    }
  }

  /**
   * GET STATUS - For debugging
   */
  getStatus() {
    return {
      currentOwner: this.currentOwner,
      hasSharedStream: !!this.currentStream,
      streamActive: this.currentStream?.active || false
    };
  }
}

// Singleton instance
export const MicManager = new MicManagerService();
