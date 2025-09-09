import { useChatStore } from '@/core/store';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';

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
  const { getGuestId } = useChatStore();
  
  // Get identifiers
  const urlUserId = searchParams.get('user_id');
  const guestId = getGuestId(); // From centralized store
  
  // Determine user type with clear priority
  const isAuthenticated = !!user && !!urlUserId;
  const isGuest = !!guestId && !isAuthenticated; // Guest only if not authenticated
  const isUnauthenticated = !isAuthenticated && !isGuest;
  
  let type: UserType = 'unauthenticated';
  if (isAuthenticated) type = 'authenticated';
  else if (isGuest) type = 'guest';
  
  return {
    type,
    isAuthenticated,
    isGuest,
    isUnauthenticated,
    userId: isAuthenticated ? urlUserId : undefined,
    guestId: isGuest ? guestId : undefined
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
        threadSectionLabel: null, // No thread history
        authButtonLabel: 'Sign in',
        showThreadHistory: false,
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