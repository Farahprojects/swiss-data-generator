
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SettingsModalState {
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
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

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  return (
    <SettingsModalContext.Provider value={{ isOpen, openModal, closeModal }}>
      {children}
    </SettingsModalContext.Provider>
  );
};
