/**
 * 🎤 SHARED MIC STREAM - Simple Global Stream Manager
 * 
 * Prevents multiple getUserMedia() calls by sharing one stream.
 * Simple request/release pattern with automatic cleanup.
 */

class SharedMicStreamService {
  private stream: MediaStream | null = null;
  private activeUsers = new Set<string>();

  /**
   * REQUEST STREAM - Get shared mic stream
   */
  async requestStream(userId: string): Promise<MediaStream> {
    console.log(`[SharedMicStream] 📞 Request from: ${userId}`);
    
    // Add user to active list
    this.activeUsers.add(userId);
    
    // Create stream if it doesn't exist or is inactive
    if (!this.stream || !this.stream.active) {
      console.log('[SharedMicStream] 🎤 Creating new stream');
      
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('[SharedMicStream] ✅ Stream created successfully');
      } catch (error) {
        console.error('[SharedMicStream] ❌ Failed to create stream:', error);
        this.activeUsers.delete(userId);
        throw error;
      }
    } else {
      console.log('[SharedMicStream] ♻️ Reusing existing stream');
    }
    
    console.log(`[SharedMicStream] 👥 Active users: ${Array.from(this.activeUsers).join(', ')}`);
    return this.stream;
  }

  /**
   * RELEASE STREAM - Tell manager you're done
   */
  releaseStream(userId: string): void {
    console.log(`[SharedMicStream] 📞 Release from: ${userId}`);
    
    this.activeUsers.delete(userId);
    
    // If no one is using the stream, clean it up
    if (this.activeUsers.size === 0 && this.stream) {
      console.log('[SharedMicStream] 🔇 No more users - stopping stream');
      
      this.stream.getTracks().forEach(track => {
        console.log(`[SharedMicStream] Stopping ${track.kind} track`);
        track.stop();
      });
      
      this.stream = null;
      console.log('[SharedMicStream] ✅ Stream cleaned up');
    } else {
      console.log(`[SharedMicStream] 🔄 Keeping stream active - ${this.activeUsers.size} users remaining`);
    }
  }

  /**
   * GET STATUS - For debugging
   */
  getStatus() {
    return {
      hasStream: !!this.stream,
      streamActive: this.stream?.active || false,
      activeUsers: Array.from(this.activeUsers),
      userCount: this.activeUsers.size
    };
  }

  /**
   * FORCE CLEANUP - Emergency cleanup
   */
  forceCleanup(): void {
    console.log('[SharedMicStream] 🚨 Force cleanup');
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    this.activeUsers.clear();
    console.log('[SharedMicStream] ✅ Force cleanup complete');
  }
}

// Singleton instance
export const sharedMicStream = new SharedMicStreamService();
