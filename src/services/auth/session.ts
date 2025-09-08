// src/services/auth/session.ts
import { v4 as uuidv4 } from 'uuid';

const GUEST_ID_KEY = 'therai_guest_id';
const AUTH_USER_ID_KEY = 'therai_auth_user_id';
const SESSION_TYPE_KEY = 'therai_session_type';

export type SessionType = 'guest' | 'authenticated';

export interface SessionInfo {
  type: SessionType;
  userId: string;
  isGuest: boolean;
  isAuthenticated: boolean;
}

export const getGuestId = (): string => {
  let guestId = localStorage.getItem(GUEST_ID_KEY);
  if (!guestId) {
    guestId = uuidv4();
    localStorage.setItem(GUEST_ID_KEY, guestId);
  }
  return guestId;
};

export const setAuthUserId = (userId: string): void => {
  localStorage.setItem(AUTH_USER_ID_KEY, userId);
  localStorage.setItem(SESSION_TYPE_KEY, 'authenticated');
};

export const getAuthUserId = (): string | null => {
  return localStorage.getItem(AUTH_USER_ID_KEY);
};

export const clearAuthUserId = (): void => {
  localStorage.removeItem(AUTH_USER_ID_KEY);
  localStorage.removeItem(SESSION_TYPE_KEY);
};

export const getSessionType = (): SessionType => {
  return localStorage.getItem(SESSION_TYPE_KEY) as SessionType || 'guest';
};

export const getCurrentSessionInfo = (): SessionInfo => {
  const sessionType = getSessionType();
  const isAuthenticated = sessionType === 'authenticated';
  const isGuest = sessionType === 'guest';
  
  const userId = isAuthenticated 
    ? getAuthUserId() || getGuestId()
    : getGuestId();
    
  return {
    type: sessionType,
    userId,
    isGuest,
    isAuthenticated
  };
};

export const clearAllSession = (): void => {
  localStorage.removeItem(GUEST_ID_KEY);
  clearAuthUserId();
};
