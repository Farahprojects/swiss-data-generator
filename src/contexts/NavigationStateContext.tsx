
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { isPasswordResetUrl } from '@/utils/urlUtils';
import { logToSupabase } from '@/utils/batchedLogManager';

type NavigationStateContextType = {
  lastRoute: string;
  setLastRoute: (route: string) => void;
  lastRouteParams: string;
  setLastRouteParams: (params: string) => void;
  clearNavigationState: () => void;
  getSafeRedirectPath: () => string;
};

const NavigationStateContext = createContext<NavigationStateContextType | undefined>(undefined);

export const useNavigationState = () => {
  const context = useContext(NavigationStateContext);
  if (context === undefined) {
    throw new Error('useNavigationState must be used within a NavigationStateProvider');
  }
  return context;
};

interface NavigationStateProviderProps {
  children: React.ReactNode;
}

// List of routes that should not be stored as the last route
const RESTRICTED_ROUTES = [
  '/login', 
  '/signup', 
  '/payment-return', 
  '/auth/email',
  '/auth/password',
  '/dashboard',
  '/dashboard/settings',
  '/dashboard/upgrade',
  '/dashboard/activity-logs',
  '/dashboard/api-keys',
  '/dashboard/docs',
  '/dashboard/usage',
  '/dashboard/billing',
  '/dashboard/pricing'
];

// Helper function to check if a path is a dashboard path regardless of query params
const isDashboardPath = (path: string): boolean => {
  return path.startsWith('/dashboard') || RESTRICTED_ROUTES.some(route => {
    return path === route || path.startsWith(`${route}/`) || path.startsWith(`${route}?`);
  });
};

// Helper to clean up any stored password reset URLs
const cleanupPasswordResetURLs = () => {
  try {
    const storedRoute = localStorage.getItem('last_route');
    const storedParams = localStorage.getItem('last_route_params');
    
    if (storedRoute && storedRoute === '/auth/password') {
      logToSupabase('Clearing stored password reset route', { 
        level: 'info',
        page: 'NavigationState' 
      });
      localStorage.removeItem('last_route');
      localStorage.removeItem('last_route_params');
    } else if (storedParams && isPasswordResetUrl('', storedParams)) {
      logToSupabase('Clearing stored password reset params', { 
        level: 'info',
        page: 'NavigationState' 
      });
      localStorage.removeItem('last_route_params');
    }
  } catch (e) {
    console.error('Error cleaning up password reset URLs:', e);
  }
};

const NavigationStateProvider: React.FC<NavigationStateProviderProps> = ({ children }) => {
  // Initialize from localStorage with error handling
  const [lastRoute, setLastRoute] = useState<string>(() => {
    if (typeof window === 'undefined') return '/';
    try {
      const storedRoute = localStorage.getItem('last_route');
      return storedRoute && typeof storedRoute === 'string' ? storedRoute : '/';
    } catch (e) {
      console.error('Error reading last_route from localStorage:', e);
      return '/';
    }
  });
  
  const [lastRouteParams, setLastRouteParams] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    try {
      const storedParams = localStorage.getItem('last_route_params');
      return storedParams && typeof storedParams === 'string' ? storedParams : '';
    } catch (e) {
      console.error('Error reading last_route_params from localStorage:', e);
      return '';
    }
  });

  const location = useLocation();

  // Clean up any password reset URLs on initial load
  useEffect(() => {
    cleanupPasswordResetURLs();
  }, []);

  // Automatically track and save the current route when it changes
  useEffect(() => {
    const currentPath = location.pathname;
    const currentParams = location.search;
    
    // Check if the current path is restricted
    if (!isDashboardPath(currentPath) && !isPasswordResetUrl(currentPath, currentParams)) {
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('last_route', currentPath);
        }
        setLastRoute(currentPath);
        
        if (currentParams) {
          if (typeof window !== 'undefined') {
            localStorage.setItem('last_route_params', currentParams);
          }
          setLastRouteParams(currentParams);
        } else {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('last_route_params');
          }
          setLastRouteParams('');
        }
      } catch (e) {
        console.error('Error saving route to localStorage:', e);
      }
    }
  }, [location.pathname, location.search]);

  // Clear navigation state (used on signout)
  const clearNavigationState = () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('last_route');
        localStorage.removeItem('last_route_params');
      }
      setLastRoute('/');
      setLastRouteParams('');
    } catch (e) {
      console.error('Error clearing navigation state:', e);
    }
  };

  // More robust safe redirect path retrieval
  const getSafeRedirectPath = (): string => {
    try {
      let storedPath = '/';
      let storedParams = '';
      
      // Try to get from state first (most recent)
      if (lastRoute && !isDashboardPath(lastRoute)) {
        storedPath = lastRoute;
        storedParams = lastRouteParams;
      } else {
        // Fall back to localStorage if state is restricted
        if (typeof window !== 'undefined') {
          const localPath = localStorage.getItem('last_route');
          if (localPath && typeof localPath === 'string' && !isDashboardPath(localPath)) {
            storedPath = localPath;
            const localParams = localStorage.getItem('last_route_params');
            if (localParams && typeof localParams === 'string') {
              storedParams = localParams;
            }
          }
        }
      }
      
      return `${storedPath}${storedParams}`;
    } catch (e) {
      console.error('Error in getSafeRedirectPath:', e);
      return '/';
    }
  };

  return (
    <NavigationStateContext.Provider 
      value={{ 
        lastRoute, 
        setLastRoute, 
        lastRouteParams, 
        setLastRouteParams,
        clearNavigationState,
        getSafeRedirectPath
      }}
    >
      {children}
    </NavigationStateContext.Provider>
  );
};

export default NavigationStateProvider;
