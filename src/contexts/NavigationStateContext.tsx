
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
  const [lastRoute, setLastRoute] = useState<string>(() => 
    localStorage.getItem('last_route') || '/dashboard'
  );
  
  const [lastRouteParams, setLastRouteParams] = useState<string>(() => 
    localStorage.getItem('last_route_params') || ''
  );

  useEffect(() => {
    localStorage.setItem('last_route', lastRoute);
  }, [lastRoute]);

  useEffect(() => {
    if (lastRouteParams) {
      localStorage.setItem('last_route_params', lastRouteParams);
    } else {
      localStorage.removeItem('last_route_params');
    }
  }, [lastRouteParams]);

  // Function to get a safe redirect path - never returns login/signup/payment-return
  const getSafeRedirectPath = (): string => {
    const storedPath = localStorage.getItem('last_route') || '/dashboard';
    const storedParams = localStorage.getItem('last_route_params') || '';
    
    // Check if storedPath is a restricted route
    const restrictedRoutes = ['/login', '/signup', '/payment-return'];
    if (restrictedRoutes.includes(storedPath)) {
      return '/dashboard';
    }
    
    // Return the safe path with params if available
    return `${storedPath}${storedParams}`;
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
