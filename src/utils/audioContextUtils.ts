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
