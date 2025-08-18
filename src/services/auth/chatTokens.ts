// src/services/auth/chatTokens.ts
import { v4 as uuidv4 } from 'uuid';

const CHAT_UUID_KEY = 'therai_chat_uuid';
const CHAT_TOKEN_KEY = 'therai_chat_token';
function getSessionStorage(): Storage | null {
  try {
    if (typeof sessionStorage !== 'undefined') return sessionStorage;
  } catch (_e) {}
  return null;
}

function getLocalStorage(): Storage | null {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch (_e) {}
  return null;
}

// Note: Per-tab isolation is handled by conversationId caching in sessionStorage.
// UUIDs remain raw to stay compatible with backend schemas.

export interface ChatTokens {
  uuid: string | null;
  token: string | null;
}

export function setChatTokens(uuid: string, token: string): void {
  const ss = getSessionStorage();
  const ls = getLocalStorage();
  try { ss?.setItem(CHAT_UUID_KEY, uuid); } catch (_e) {}
  try { ss?.setItem(CHAT_TOKEN_KEY, token); } catch (_e) {}
  // Best-effort cleanup of old localStorage values to avoid cross-tab leakage
  try { ls?.removeItem(CHAT_UUID_KEY); } catch (_e) {}
  try { ls?.removeItem(CHAT_TOKEN_KEY); } catch (_e) {}
}

export function getChatTokens(): ChatTokens {
  const ss = getSessionStorage();
  const ls = getLocalStorage();
  try {
    // Prefer sessionStorage (tab-scoped)
    let uuid = ss?.getItem(CHAT_UUID_KEY) ?? null;
    let token = ss?.getItem(CHAT_TOKEN_KEY) ?? null;

    // Migrate from localStorage if present (legacy) and not yet in sessionStorage
    if (!uuid) {
      const legacy = ls?.getItem(CHAT_UUID_KEY) ?? null;
      if (legacy) {
        uuid = legacy;
        try { ss?.setItem(CHAT_UUID_KEY, uuid!); } catch (_e) {}
        try { ls?.removeItem(CHAT_UUID_KEY); } catch (_e) {}
      }
    }
    if (!token) {
      const legacyToken = ls?.getItem(CHAT_TOKEN_KEY) ?? null;
      if (legacyToken) {
        token = legacyToken;
        try { ss?.setItem(CHAT_TOKEN_KEY, token); } catch (_e) {}
        try { ls?.removeItem(CHAT_TOKEN_KEY); } catch (_e) {}
      }
    }

    return { uuid, token };
  } catch (_e) {
    return { uuid: null, token: null };
  }
}

export function clearChatTokens(): void {
  const ss = getSessionStorage();
  const ls = getLocalStorage();
  try { ss?.removeItem(CHAT_UUID_KEY); } catch (_e) {}
  try { ss?.removeItem(CHAT_TOKEN_KEY); } catch (_e) {}
  try { ls?.removeItem(CHAT_UUID_KEY); } catch (_e) {}
  try { ls?.removeItem(CHAT_TOKEN_KEY); } catch (_e) {}
}

// Persisted flag indicating a report is ready for this session
const HAS_REPORT_KEY = 'therai_has_report';

export function setHasReportFlag(value: boolean): void {
  const ss = getSessionStorage();
  try { ss?.setItem(HAS_REPORT_KEY, value ? '1' : '0'); } catch (_e) {}
}

export function getHasReportFlag(): boolean {
  const ss = getSessionStorage();
  try { return (ss?.getItem(HAS_REPORT_KEY) ?? '') === '1'; } catch (_e) { return false; }
}

export function clearHasReportFlag(): void {
  const ss = getSessionStorage();
  const ls = getLocalStorage();
  try { ss?.removeItem(HAS_REPORT_KEY); } catch (_e) {}
  try { ls?.removeItem(HAS_REPORT_KEY); } catch (_e) {}
}
