export function hasSeen(guestId?: string | null): boolean {
  if (!guestId) return false;
  
  console.log('🔍 [DEBUG][SeenTracker] hasSeen() called with guestId:', guestId);
  
  try {
    // Check both formats: seen:${guestId} and seen:last
    const directKey = `seen:${guestId}`;
    const lastKey = 'seen:last';
    
    const directValue = localStorage.getItem(directKey);
    const lastValue = localStorage.getItem(lastKey);
    
    console.log('🔍 [DEBUG][SeenTracker] Checking keys:', {
      directKey,
      directValue,
      lastKey, 
      lastValue,
      directMatch: directValue === '1',
      lastMatch: lastValue === guestId
    });
    
    // Return true if either format matches
    const result = directValue === '1' || lastValue === guestId;
    console.log('🔍 [DEBUG][SeenTracker] hasSeen() result:', result);
    
    return result;
  } catch (error) {
    console.error('🔍 [DEBUG][SeenTracker] hasSeen() error:', error);
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
