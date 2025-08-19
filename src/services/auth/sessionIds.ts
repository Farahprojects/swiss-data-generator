// src/services/auth/sessionIds.ts
function getSessionStorage(): Storage | null {
  try {
    if (typeof sessionStorage !== 'undefined') return sessionStorage;
  } catch (_e) {}
  return null;
}

export function setSessionIds(guestId: string, chatId: string): void {
  const ss = getSessionStorage();
  if (!ss) return;
  
  ss.setItem('guest_id', guestId);
  ss.setItem('chat_id', chatId);
}

export function getSessionIds(): { guestId: string | null; chatId: string | null } {
  const ss = getSessionStorage();
  if (!ss) return { guestId: null, chatId: null };

  return {
    guestId: ss.getItem('guest_id'),
    chatId: ss.getItem('chat_id')
  };
}

export function clearSessionIds(): void {
  const ss = getSessionStorage();
  if (!ss) return;
  
  ss.removeItem('guest_id');
  ss.removeItem('chat_id');
}
