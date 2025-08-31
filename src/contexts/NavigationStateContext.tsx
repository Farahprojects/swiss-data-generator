
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface NavigationState {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  clearNavigationState: () => void;
  getSafeRedirectPath: () => string;
}

const NavigationStateContext = createContext<NavigationState | undefined>(undefined);

export const useNavigationState = (): NavigationState => {
  const context = useContext(NavigationStateContext);
  if (!context) {
    throw new Error('useNavigationState must be used within a NavigationStateProvider');
  }
  return context;
};

interface NavigationStateProviderProps {
  children: ReactNode;
}

export const NavigationStateProvider: React.FC<NavigationStateProviderProps> = ({ children }) => {
  const [currentPage, setCurrentPage] = useState('chat');

  const clearNavigationState = () => {
    setCurrentPage('chat');
  };

  const getSafeRedirectPath = () => {
    return currentPage === 'chat' ? '/chat' : '/';
  };

  return (
    <NavigationStateContext.Provider value={{ 
      currentPage, 
      setCurrentPage, 
      clearNavigationState, 
      getSafeRedirectPath 
    }}>
      {children}
    </NavigationStateContext.Provider>
  );
};
