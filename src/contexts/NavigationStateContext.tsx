
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

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
// Added all dashboard routes to prevent dashboard redirect loops
const RESTRICTED_ROUTES = [
  '/login', 
  '/signup', 
  '/payment-return', 
  '/auth/email',
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

const NavigationStateProvider: React.FC<NavigationStateProviderProps> = ({ children }) => {
  // Initialize from localStorage with more error handling
  const [lastRoute, setLastRoute] = useState<string>(() => {
    try {
      const storedRoute = localStorage.getItem('last_route');
      return storedRoute && typeof storedRoute === 'string' ? storedRoute : '/';
    } catch (e) {
      console.error('Error reading last_route from localStorage:', e);
      return '/';
    }
  });
  
  const [lastRouteParams, setLastRouteParams] = useState<string>(() => {
    try {
      const storedParams = localStorage.getItem('last_route_params');
      return storedParams && typeof storedParams === 'string' ? storedParams : '';
    } catch (e) {
      console.error('Error reading last_route_params from localStorage:', e);
      return '';
    }
  });

  const location = useLocation();

  // Automatically track and save the current route when it changes
  useEffect(() => {
    const currentPath = location.pathname;
    const currentParams = location.search;
    
    // Check if the current path is restricted using the enhanced dashboard check
    if (!isDashboardPath(currentPath)) {
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
        console.log(`NavigationState: Saved route ${currentPath}${currentParams}`);
      } catch (e) {
        console.error('Error saving route to localStorage:', e);
      }
    } else {
      console.log(`NavigationState: Not saving restricted route: ${currentPath}`);
    }
  }, [location.pathname, location.search]);

  // Clear navigation state (used on signout)
  const clearNavigationState = () => {
    try {
      localStorage.removeItem('last_route');
      localStorage.removeItem('last_route_params');
      setLastRoute('/');
      setLastRouteParams('');
      console.log('NavigationState: Cleared navigation state');
    } catch (e) {
      console.error('Error clearing navigation state:', e);
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
      
      console.log(`NavigationStateContext: Safe redirect path: ${storedPath}${storedParams}`);
      // Return the safe path with params if available
      return `${storedPath}${storedParams}`;
    } catch (e) {
      console.error('Error in getSafeRedirectPath:', e);
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
