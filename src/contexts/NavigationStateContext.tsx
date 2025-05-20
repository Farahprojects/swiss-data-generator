import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { isPasswordResetUrl } from '@/utils/urlUtils';
import { logNavigation } from '@/utils/logUtils';

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
      logNavigation('Clearing stored password reset route');
      localStorage.removeItem('last_route');
      localStorage.removeItem('last_route_params');
    } else if (storedParams && isPasswordResetUrl('', storedParams)) {
      logNavigation('Clearing stored password reset params');
      localStorage.removeItem('last_route_params');
    }
  } catch (e) {
    logNavigation('Error cleaning up password reset URLs', e);
  }
};

const NavigationStateProvider: React.FC<NavigationStateProviderProps> = ({ children }) => {
  // Initialize from localStorage with more error handling
  const [lastRoute, setLastRoute] = useState<string>(() => {
    try {
      const storedRoute = localStorage.getItem('last_route');
      logNavigation("Initial lastRoute from localStorage:", storedRoute);
      return storedRoute && typeof storedRoute === 'string' ? storedRoute : '/';
    } catch (e) {
      logNavigation('Error reading last_route from localStorage', e);
      return '/';
    }
  });
  
  const [lastRouteParams, setLastRouteParams] = useState<string>(() => {
    try {
      const storedParams = localStorage.getItem('last_route_params');
      logNavigation("Initial lastRouteParams from localStorage:", storedParams);
      return storedParams && typeof storedParams === 'string' ? storedParams : '';
    } catch (e) {
      logNavigation('Error reading last_route_params from localStorage', e);
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
    logNavigation(`Current path: ${currentPath}, current params: ${currentParams}`);
    
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
        logNavigation(`Saved route ${currentPath}${currentParams}`);
      } catch (e) {
        logNavigation('Error saving route to localStorage', e);
      }
    } else {
      logNavigation(`Not saving restricted route: ${currentPath}`);
    }
  }, [location.pathname, location.search]);

  // Clear navigation state (used on signout)
  const clearNavigationState = () => {
    try {
      logNavigation('Clearing navigation state');
      localStorage.removeItem('last_route');
      localStorage.removeItem('last_route_params');
      setLastRoute('/');
      setLastRouteParams('');
      logNavigation('Cleared navigation state - lastRoute=/, lastRouteParams=""');
    } catch (e) {
      logNavigation('Error clearing navigation state', e);
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
      
      logNavigation(`NavigationStateContext: Safe redirect path: ${storedPath}${storedParams}`);
      // Return the safe path with params if available
      return `${storedPath}${storedParams}`;
    } catch (e) {
      logNavigation('Error in getSafeRedirectPath:', e);
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
