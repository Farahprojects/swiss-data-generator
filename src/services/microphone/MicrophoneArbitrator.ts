/**
 * 🎯 MICROPHONE ARBITRATOR - Domain Ownership Controller
 * 
 * Professional approach: Simple arbitrator that prevents conflicts
 * between different microphone domains (journal, chat, conversation).
 * 
 * NOT a manager - just a traffic cop that says "yes" or "no".
 */

export type MicrophoneDomain = 'journal' | 'chat-text' | 'conversation';

class MicrophoneArbitratorService {
  private currentOwner: MicrophoneDomain | null = null;
  private listeners = new Set<() => void>();

  /**
   * CAN USE - Check if domain can use microphone
   */
  canUse(domainId: MicrophoneDomain): boolean {
    const canUse = this.currentOwner === null || this.currentOwner === domainId;
    return canUse;
  }

  /**
   * CLAIM - Domain claims microphone ownership
   */
  claim(domainId: MicrophoneDomain): boolean {
    if (this.canUse(domainId)) {
      this.currentOwner = domainId;
      this.notifyListeners();
      return true;
    }
    
    return false;
  }

  /**
   * RELEASE - Domain releases microphone ownership
   */
  release(domainId: MicrophoneDomain): void {
    if (this.currentOwner === domainId) {
      this.currentOwner = null;
      this.notifyListeners();
    } else {
      // Keep this warning as it indicates a potential bug
      // console.warn(`[MicArbitrator] ⚠️ ${domainId} tried to release but doesn't own mic`);
    }
  }

  /**
   * GET STATUS - For debugging and UI
   */
  getStatus() {
    return {
      currentOwner: this.currentOwner,
      isAvailable: this.currentOwner === null
    };
  }

  /**
   * SUBSCRIBE - React to ownership changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  /**
   * FORCE RELEASE - Emergency cleanup
   */
  forceRelease(): void {
    // console.log('[MicArbitrator] 🚨 FORCE RELEASE - Emergency cleanup');
    this.currentOwner = null;
    this.notifyListeners();
  }
}

// Singleton instance - One arbitrator for the entire app
export const microphoneArbitrator = new MicrophoneArbitratorService();
