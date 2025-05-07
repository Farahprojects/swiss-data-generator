
import React, { createContext, useContext, useState, useEffect } from 'react';

type NavigationStateContextType = {
  lastRoute: string;
  setLastRoute: (route: string) => void;
  lastRouteParams: string;
  setLastRouteParams: (params: string) => void;
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

const NavigationStateProvider: React.FC<NavigationStateProviderProps> = ({ children }) => {
  // Initialize from localStorage with more error handling
  const [lastRoute, setLastRoute] = useState<string>(() => {
    try {
      const storedRoute = localStorage.getItem('last_route');
      return storedRoute && typeof storedRoute === 'string' ? storedRoute : '/dashboard';
    } catch (e) {
      console.error('Error reading last_route from localStorage:', e);
      return '/dashboard';
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

  // Persist to localStorage with error handling
  useEffect(() => {
    try {
      localStorage.setItem('last_route', lastRoute);
      console.log('Saved last route to localStorage:', lastRoute);
    } catch (e) {
      console.error('Error saving last_route to localStorage:', e);
    }
  }, [lastRoute]);

  useEffect(() => {
    try {
      if (lastRouteParams) {
        localStorage.setItem('last_route_params', lastRouteParams);
        console.log('Saved route params to localStorage:', lastRouteParams);
      } else {
        localStorage.removeItem('last_route_params');
      }
    } catch (e) {
      console.error('Error handling last_route_params in localStorage:', e);
    }
  }, [lastRouteParams]);

  // More robust safe redirect path retrieval
  const getSafeRedirectPath = (): string => {
    try {
      let storedPath = '/dashboard'; // Default fallback
      let storedParams = '';
      
      // Try to get from state first (most recent)
      if (lastRoute && lastRoute !== '/login' && lastRoute !== '/signup' && lastRoute !== '/payment-return') {
        storedPath = lastRoute;
        storedParams = lastRouteParams;
      } else {
        // Fall back to localStorage if state is restricted
        const localPath = localStorage.getItem('last_route');
        if (localPath && typeof localPath === 'string' 
            && localPath !== '/login' 
            && localPath !== '/signup' 
            && localPath !== '/payment-return') {
          storedPath = localPath;
          const localParams = localStorage.getItem('last_route_params');
          if (localParams && typeof localParams === 'string') {
            storedParams = localParams;
          }
        }
      }
      
      // Check if storedPath is a restricted route
      const restrictedRoutes = ['/login', '/signup', '/payment-return'];
      if (restrictedRoutes.includes(storedPath)) {
        return '/dashboard';
      }
      
      console.log('Using safe redirect path:', `${storedPath}${storedParams}`);
      // Return the safe path with params if available
      return `${storedPath}${storedParams}`;
    } catch (e) {
      console.error('Error in getSafeRedirectPath:', e);
      return '/dashboard'; // Ultimate fallback
    }
  };

  return (
    <NavigationStateContext.Provider 
      value={{ 
        lastRoute, 
        setLastRoute, 
        lastRouteParams, 
        setLastRouteParams,
        getSafeRedirectPath
      }}
    >
      {children}
    </NavigationStateContext.Provider>
  );
};

export default NavigationStateProvider;
