export function hasSeen(guestId?: string | null): boolean {
  if (!guestId) return false;
  try {
    return localStorage.getItem(`seen:${guestId}`) === '1';
  } catch {
    return false;
  }
}

export function markSeen(guestId: string): void {
  try {
    localStorage.setItem(`seen:${guestId}`, '1');
  } catch {
    // no-op
  }
}
