import { useChatStore } from '@/core/store';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams, useLocation } from 'react-router-dom';

export type UserType = 'authenticated' | 'guest' | 'unauthenticated';

export interface UserTypeInfo {
  type: UserType;
  isAuthenticated: boolean;
  isGuest: boolean;
  isUnauthenticated: boolean;
  userId?: string;
  guestId?: string;
}

/**
 * Centralized hook to determine user type across the app
 * Single source of truth for user type detection
 */
export const useUserType = (): UserTypeInfo => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const { pathname } = useLocation();
  const { chat_id } = useChatStore();
  
  // 🎯 Guest detection: URL path starts with "/g/"
  const isGuestPath = pathname.startsWith('/g/');
  
  // 🎯 Auth detection: URL path starts with "/c/" (but not "/c/g/") or /therai
  const isAuthPath = pathname.startsWith('/c/') && !pathname.startsWith('/c/g/');
  const isTheraiPath = pathname === '/therai';
  
  // Determine user type with clear priority
  const isAuthenticated = !!user && (isAuthPath || isTheraiPath);
  const isGuest = isGuestPath && !isAuthenticated; // Guest only if not authenticated
  const isUnauthenticated = !isAuthenticated && !isGuest;
  
  let type: UserType = 'unauthenticated';
  if (isAuthenticated) type = 'authenticated';
  else if (isGuest) type = 'guest';
  
  return {
    type,
    isAuthenticated,
    isGuest,
    isUnauthenticated,
    userId: isAuthenticated ? user?.id : undefined, // Use actual user ID, not URL param
    guestId: isGuest ? chat_id : undefined // Use chat_id as guestId for guests
  };
};

/**
 * Get user-type specific UI text and behavior
 */
export const getUserTypeConfig = (userType: UserType) => {
  switch (userType) {
    case 'authenticated':
      return {
        chatMenuActions: {
          delete: {
            label: 'Delete',
            description: 'Delete this conversation permanently',
            confirmTitle: 'Delete Conversation',
            confirmMessage: 'Are you sure you want to delete this conversation? All messages and data will be permanently removed.',
            confirmButton: 'Delete Conversation'
          }
        },
        newChatLabel: 'New chat',
        threadSectionLabel: 'Chat history',
        authButtonLabel: null, // Already authenticated
        showThreadHistory: true,
        showSearchChat: true,
        showAstroData: true
      };
      
    case 'guest':
      return {
        chatMenuActions: {
          delete: {
            label: 'Delete', // Same label but different functionality
            description: 'Delete this chat session permanently',
            confirmTitle: 'Delete Chat Session',
            confirmMessage: 'Are you sure you want to delete this chat session? All messages and data will be permanently removed.',
            confirmButton: 'Delete Session'
          }
        },
        newChatLabel: null, // Guests can't create new chats
        threadSectionLabel: null, // No thread history for guests on /c/g
        authButtonLabel: 'Sign in',
        showThreadHistory: false, // Skip thread history and thread fetching for guests
        showSearchChat: false,
        showAstroData: true // Guests can still use astro
      };
      
    case 'unauthenticated':
      return {
        chatMenuActions: {
          delete: null // No delete option for unauthenticated
        },
        newChatLabel: null,
        threadSectionLabel: null,
        authButtonLabel: 'Sign in',
        showThreadHistory: false,
        showSearchChat: false,
        showAstroData: false
      };
  }
};

/**
 * Utility to check if current user can perform specific actions
 */
export const useUserPermissions = () => {
  const userType = useUserType();
  
  return {
    canCreateNewChat: userType.isAuthenticated,
    canDeleteCurrentChat: userType.isAuthenticated || userType.isGuest,
    canSearchChats: userType.isAuthenticated,
    canAccessThreadHistory: userType.isAuthenticated,
    canUseAstroData: userType.isAuthenticated || userType.isGuest,
    needsAuthentication: userType.isUnauthenticated
  };
};