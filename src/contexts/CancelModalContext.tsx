import React, { createContext, useContext, useState, ReactNode } from 'react';

interface CancelModalContextType {
  showCancelModal: (guestId: string) => void;
  hideCancelModal: () => void;
  isOpen: boolean;
  guestId: string | null;
}

const CancelModalContext = createContext<CancelModalContextType | undefined>(undefined);

export const useCancelModal = () => {
  const context = useContext(CancelModalContext);
  if (!context) {
    throw new Error('useCancelModal must be used within a CancelModalProvider');
  }
  return context;
};

interface CancelModalProviderProps {
  children: ReactNode;
}

export const CancelModalProvider: React.FC<CancelModalProviderProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [guestId, setGuestId] = useState<string | null>(null);

  const showCancelModal = (newGuestId: string) => {
    setGuestId(newGuestId);
    setIsOpen(true);
  };

  const hideCancelModal = () => {
    setIsOpen(false);
    setGuestId(null);
  };

  return (
    <CancelModalContext.Provider value={{ showCancelModal, hideCancelModal, isOpen, guestId }}>
      {children}
    </CancelModalContext.Provider>
  );
};
