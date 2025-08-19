function getSessionStorage(): Storage | null {
  try {
    if (typeof sessionStorage !== 'undefined') return sessionStorage;
  } catch (_e) {
    console.error('[sessionIds] Failed to access sessionStorage:', _e);
  }
  return null;
}

export function setSessionIds(guestId: string, chatId: string): void {
  console.log('[sessionIds] Attempting to store IDs:', { guestId, chatId });
  
  const ss = getSessionStorage();
  if (!ss) {
    console.error('[sessionIds] Failed to store IDs: No access to sessionStorage');
    return;
  }

  try {
    ss.setItem('guest_id', guestId);
    ss.setItem('chat_id', chatId);
    console.log('[sessionIds] Successfully stored IDs in session');
  } catch (error) {
    console.error('[sessionIds] Failed to store IDs in session:', error);
  }
}

export function getSessionIds(): { guestId: string | null; chatId: string | null } {
  const ss = getSessionStorage();
  if (!ss) {
    console.warn('[sessionIds] No access to sessionStorage, returning null IDs');
    return { guestId: null, chatId: null };
  }

  const guestId = ss.getItem('guest_id');
  const chatId = ss.getItem('chat_id');
  
  console.log('[sessionIds] Retrieved IDs from session:', { guestId, chatId });
  
  if (!guestId || !chatId) {
    console.warn('[sessionIds] Missing ID(s) in session:', { guestId, chatId });
  }

  return { guestId, chatId };
}

export function clearSessionIds(): void {
  const ss = getSessionStorage();
  if (!ss) {
    console.error('[sessionIds] Failed to clear IDs: No access to sessionStorage');
    return;
  }

  try {
    ss.removeItem('guest_id');
    ss.removeItem('chat_id');
    console.log('[sessionIds] Successfully cleared session IDs');
  } catch (error) {
    console.error('[sessionIds] Failed to clear session IDs:', error);
  }
}