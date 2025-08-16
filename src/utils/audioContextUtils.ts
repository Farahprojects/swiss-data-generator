/**
 * Minimum fix that resolves 90% of audio flakiness
 * One AudioContext, one source per <audio> (and resume once)
 */

let ctx: AudioContext | null = null;

export async function attachToAudio(el: HTMLAudioElement): Promise<void> {
  ctx ||= new AudioContext();
  if (ctx.state === "suspended") await ctx.resume();   // call after a user gesture
  if (!(el as any)._srcNode) (el as any)._srcNode = ctx.createMediaElementSource(el);
  const src = (el as any)._srcNode;
  if (!(el as any)._connected) { 
    src.connect(ctx.destination); 
    (el as any)._connected = true; 
  }
}

export function getGlobalAudioContext(): AudioContext | null {
  return ctx;
}

/**
 * Clean up audio element connections and flags
 */
export function cleanupAudioElement(el: HTMLAudioElement): void {
  if (!el) return;
  
  try {
    const srcNode = (el as any)._srcNode;
    if (srcNode) {
      srcNode.disconnect();
      console.log('[AudioContextUtils] Disconnected audio element source node');
    }
    
    // Clear all flags
    (el as any)._srcNode = null;
    (el as any)._connected = false;
    (el as any)._analyserConnected = false;
    
    console.log('[AudioContextUtils] Audio element cleaned up');
  } catch (error) {
    console.error('[AudioContextUtils] Error cleaning up audio element:', error);
  }
}

/**
 * Clean up all audio connections and close AudioContext
 * Call this on app unmount or page refresh
 */
export function cleanupGlobalAudioContext(): void {
  if (ctx) {
    try {
      ctx.close();
      console.log('[AudioContextUtils] Global AudioContext closed');
    } catch (error) {
      console.error('[AudioContextUtils] Error closing AudioContext:', error);
    }
    ctx = null;
  }
}
