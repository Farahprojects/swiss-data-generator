import { useChatStore } from '@/core/store';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams, useLocation } from 'react-router-dom';

export type UserType = 'authenticated' | 'unauthenticated';

export interface UserTypeInfo {
  type: UserType;
  isAuthenticated: boolean;
  isUnauthenticated: boolean;
  userId?: string;
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
  
  // 🎯 Auth detection: URL path starts with "/c/" or /therai
  const isAuthPath = pathname.startsWith('/c/');
  const isTheraiPath = pathname === '/therai';
  
  // Determine user type with clear priority
  const isAuthenticated = !!user && (isAuthPath || isTheraiPath);
  const isUnauthenticated = !isAuthenticated;
  
  let type: UserType = 'unauthenticated';
  if (isAuthenticated) type = 'authenticated';
  
  return {
    type,
    isAuthenticated,
    isUnauthenticated,
    userId: isAuthenticated ? user?.id : undefined // Use actual user ID, not URL param
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
    canDeleteCurrentChat: userType.isAuthenticated,
    canSearchChats: userType.isAuthenticated,
    canAccessThreadHistory: userType.isAuthenticated,
    canUseAstroData: userType.isAuthenticated,
    needsAuthentication: userType.isUnauthenticated
  };
};