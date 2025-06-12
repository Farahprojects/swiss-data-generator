
import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

interface ModalState {
  showNewClientModal: boolean;
  showJournalModal: boolean;
  showInsightModal: boolean;
  showReportModal: boolean;
  showEditModal: boolean;
  selectedClientId: string | null;
}

interface ModalStateContextType {
  modalState: ModalState;
  setModalState: (key: keyof ModalState, value: boolean | string | null) => void;
  resetModalState: () => void;
  preserveModalState: () => void;
  restoreModalState: () => void;
}

const defaultModalState: ModalState = {
  showNewClientModal: false,
  showJournalModal: false,
  showInsightModal: false,
  showReportModal: false,
  showEditModal: false,
  selectedClientId: null,
};

const ModalStateContext = createContext<ModalStateContextType | null>(null);

interface ModalStateProviderProps {
  children: ReactNode;
}

export const ModalStateProvider = ({ children }: ModalStateProviderProps) => {
  const [modalState, setModalStateInternal] = useState<ModalState>(defaultModalState);

  // Restore modal state from session storage on mount
  useEffect(() => {
    try {
      const savedState = sessionStorage.getItem('modalState');
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        setModalStateInternal(prevState => ({ ...prevState, ...parsedState }));
      }
    } catch (error) {
      console.error('Failed to restore modal state:', error);
    }
  }, []);

  const setModalState = useCallback((key: keyof ModalState, value: boolean | string | null) => {
    setModalStateInternal(prevState => {
      const newState = { ...prevState, [key]: value };
      try {
        sessionStorage.setItem('modalState', JSON.stringify(newState));
      } catch (error) {
        console.error('Failed to save modal state:', error);
      }
      return newState;
    });
  }, []);

  const resetModalState = useCallback(() => {
    setModalStateInternal(defaultModalState);
    try {
      sessionStorage.removeItem('modalState');
    } catch (error) {
      console.error('Failed to clear modal state:', error);
    }
  }, []);

  const preserveModalState = useCallback(() => {
    try {
      sessionStorage.setItem('modalState', JSON.stringify(modalState));
    } catch (error) {
      console.error('Failed to preserve modal state:', error);
    }
  }, [modalState]);

  const restoreModalState = useCallback(() => {
    try {
      const savedState = sessionStorage.getItem('modalState');
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        setModalStateInternal(prevState => ({ ...prevState, ...parsedState }));
      }
    } catch (error) {
      console.error('Failed to restore modal state:', error);
    }
  }, []);

  return (
    <ModalStateContext.Provider value={{
      modalState,
      setModalState,
      resetModalState,
      preserveModalState,
      restoreModalState
    }}>
      {children}
    </ModalStateContext.Provider>
  );
};

export const useModalState = () => {
  const context = useContext(ModalStateContext);
  if (!context) {
    throw new Error('useModalState must be used within a ModalStateProvider');
  }
  return context;
};
