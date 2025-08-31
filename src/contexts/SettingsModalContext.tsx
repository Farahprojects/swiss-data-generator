
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SettingsModalState {
  isOpen: boolean;
  activePanel: string;
  openModal: () => void;
  closeModal: () => void;
  openSettings: (panel?: string) => void;
  closeSettings: () => void;
  setActivePanel: (panel: string) => void;
}

const SettingsModalContext = createContext<SettingsModalState | undefined>(undefined);

export const useSettingsModal = (): SettingsModalState => {
  const context = useContext(SettingsModalContext);
  if (!context) {
    throw new Error('useSettingsModal must be used within a SettingsModalProvider');
  }
  return context;
};

interface SettingsModalProviderProps {
  children: ReactNode;
}

export const SettingsModalProvider: React.FC<SettingsModalProviderProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activePanel, setActivePanel] = useState('general');

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);
  const openSettings = (panel = 'general') => {
    setActivePanel(panel);
    setIsOpen(true);
  };
  const closeSettings = () => setIsOpen(false);

  return (
    <SettingsModalContext.Provider value={{ 
      isOpen, 
      activePanel,
      openModal, 
      closeModal, 
      openSettings, 
      closeSettings, 
      setActivePanel 
    }}>
      {children}
    </SettingsModalContext.Provider>
  );
};
