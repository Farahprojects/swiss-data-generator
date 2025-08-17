// src/services/auth/chatTokens.ts

const CHAT_UUID_KEY = 'therai_chat_uuid';
const CHAT_TOKEN_KEY = 'therai_chat_token';

export interface ChatTokens {
  uuid: string | null;
  token: string | null;
}

export function setChatTokens(uuid: string, token: string): void {
  try {
    localStorage.setItem(CHAT_UUID_KEY, uuid);
    localStorage.setItem(CHAT_TOKEN_KEY, token);
  } catch (_e) {
    // no-op: storage may be unavailable
  }
}

export function getChatTokens(): ChatTokens {
  try {
    const uuid = localStorage.getItem(CHAT_UUID_KEY);
    const token = localStorage.getItem(CHAT_TOKEN_KEY);
    return { uuid, token };
  } catch (_e) {
    return { uuid: null, token: null };
  }
}

export function clearChatTokens(): void {
  try {
    localStorage.removeItem(CHAT_UUID_KEY);
    localStorage.removeItem(CHAT_TOKEN_KEY);
  } catch (_e) {
    // no-op
  }
}

// Persisted flag indicating a report is ready for this session
const HAS_REPORT_KEY = 'therai_has_report';

export function setHasReportFlag(value: boolean): void {
  try {
    localStorage.setItem(HAS_REPORT_KEY, value ? '1' : '0');
  } catch (_e) {
    // no-op
  }
}

export function getHasReportFlag(): boolean {
  try {
    return localStorage.getItem(HAS_REPORT_KEY) === '1';
  } catch (_e) {
    return false;
  }
}

export function clearHasReportFlag(): void {
  try {
    localStorage.removeItem(HAS_REPORT_KEY);
  } catch (_e) {
    // no-op
  }
}
