
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
// Added auth/password to prevent password reset redirect loops
const RESTRICTED_ROUTES = [
  '/login', 
  '/signup', 
  '/payment-return', 
  '/auth/email',
  '/auth/password', // Added password reset page to restricted routes
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
    // Check if the path matches a restricted route or is a sub-route with query params
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
    logToSupabase('Error cleaning up password reset URLs', { 
      level: 'error',
      page: 'NavigationState',
      data: { error: e instanceof Error ? e.message : String(e) }
    });
  }
};

const NavigationStateProvider: React.FC<NavigationStateProviderProps> = ({ children }) => {
  // Initialize from localStorage with more error handling
  const [lastRoute, setLastRoute] = useState<string>(() => {
    try {
      const storedRoute = localStorage.getItem('last_route');
      logToSupabase("Initial lastRoute from localStorage", { 
        level: 'debug',
        page: 'NavigationState',
        data: { route: storedRoute }
      });
      return storedRoute && typeof storedRoute === 'string' ? storedRoute : '/';
    } catch (e) {
      logToSupabase('Error reading last_route from localStorage', { 
        level: 'error',
        page: 'NavigationState',
        data: { error: e instanceof Error ? e.message : String(e) }
      });
      return '/';
    }
  });
  
  const [lastRouteParams, setLastRouteParams] = useState<string>(() => {
    try {
      const storedParams = localStorage.getItem('last_route_params');
      logToSupabase("Initial lastRouteParams from localStorage", { 
        level: 'debug',
        page: 'NavigationState',
        data: { params: storedParams }
      });
      return storedParams && typeof storedParams === 'string' ? storedParams : '';
    } catch (e) {
      logToSupabase('Error reading last_route_params from localStorage', { 
        level: 'error',
        page: 'NavigationState',
        data: { error: e instanceof Error ? e.message : String(e) }
      });
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
    
    // Only log in debug level since this happens frequently
    logToSupabase(`Current path: ${currentPath}, current params: ${currentParams}`, {
      level: 'debug',
      page: 'NavigationState'
    });
    
    // Check if the current path is restricted using the enhanced dashboard check
    if (!isDashboardPath(currentPath) && !isPasswordResetUrl(currentPath, currentParams)) {
      try {
        localStorage.setItem('last_route', currentPath);
        setLastRoute(currentPath);
        
        if (currentParams) {
          localStorage.setItem('last_route_params', currentParams);
          setLastRouteParams(currentParams);
        } else {
          localStorage.removeItem('last_route_params');
          setLastRouteParams('');
        }
        logToSupabase(`Saved route ${currentPath}${currentParams}`, {
          level: 'debug',
          page: 'NavigationState'
        });
      } catch (e) {
        logToSupabase('Error saving route to localStorage', { 
          level: 'error',
          page: 'NavigationState',
          data: { error: e instanceof Error ? e.message : String(e) }
        });
      }
    } else {
      logToSupabase(`Not saving restricted route: ${currentPath}`, {
        level: 'debug',
        page: 'NavigationState'
      });
    }
  }, [location.pathname, location.search]);

  // Clear navigation state (used on signout)
  const clearNavigationState = () => {
    try {
      logToSupabase('Clearing navigation state', {
        level: 'info',
        page: 'NavigationState'
      });
      localStorage.removeItem('last_route');
      localStorage.removeItem('last_route_params');
      setLastRoute('/');
      setLastRouteParams('');
      logToSupabase('Cleared navigation state - lastRoute=/, lastRouteParams=""', {
        level: 'info',
        page: 'NavigationState'
      });
    } catch (e) {
      logToSupabase('Error clearing navigation state', { 
        level: 'error',
        page: 'NavigationState',
        data: { error: e instanceof Error ? e.message : String(e) }
      });
    }
  };

  // More robust safe redirect path retrieval
  const getSafeRedirectPath = (): string => {
    try {
      let storedPath = '/'; // Default fallback to home
      let storedParams = '';
      
      // Try to get from state first (most recent)
      if (lastRoute && !isDashboardPath(lastRoute)) {
        storedPath = lastRoute;
        storedParams = lastRouteParams;
      } else {
        // Fall back to localStorage if state is restricted
        const localPath = localStorage.getItem('last_route');
        if (localPath && typeof localPath === 'string' 
            && !isDashboardPath(localPath)) {
          storedPath = localPath;
          const localParams = localStorage.getItem('last_route_params');
          if (localParams && typeof localParams === 'string') {
            storedParams = localParams;
          }
        }
      }
      
      logToSupabase(`Safe redirect path: ${storedPath}${storedParams}`, {
        level: 'debug',
        page: 'NavigationState'
      });
      // Return the safe path with params if available
      return `${storedPath}${storedParams}`;
    } catch (e) {
      logToSupabase('Error in getSafeRedirectPath', { 
        level: 'error',
        page: 'NavigationState',
        data: { error: e instanceof Error ? e.message : String(e) }
      });
      return '/'; // Ultimate fallback to home instead of dashboard
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
