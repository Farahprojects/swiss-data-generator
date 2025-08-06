import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { log } from '@/utils/logUtils';

interface StripeSuccessState {
  showSuccessModal: boolean;
  guestId: string | null;
  sessionId: string | null;
  status: string | null;
  isProcessing: boolean;
}

interface StripeSuccessContextType {
  stripeSuccess: StripeSuccessState;
  setStripeSuccess: (state: StripeSuccessState) => void;
  clearStripeSuccess: () => void;
  hydrateFromUrl: () => void;
}

const StripeSuccessContext = createContext<StripeSuccessContextType | undefined>(undefined);

export const useStripeSuccess = () => {
  const context = useContext(StripeSuccessContext);
  if (context === undefined) {
    throw new Error('useStripeSuccess must be used within a StripeSuccessProvider');
  }
  return context;
};

interface StripeSuccessProviderProps {
  children: ReactNode;
}

export const StripeSuccessProvider: React.FC<StripeSuccessProviderProps> = ({ children }) => {
  const [stripeSuccess, setStripeSuccess] = useState<StripeSuccessState>({
    showSuccessModal: false,
    guestId: null,
    sessionId: null,
    status: null,
    isProcessing: false
  });

  // Hydrate state from URL on mount
  useEffect(() => {
    hydrateFromUrl();
  }, []);

  const hydrateFromUrl = () => {
    if (typeof window === 'undefined') return;

    const search = new URLSearchParams(window.location.search);
    const guestId = search.get("guest_id");
    const sessionId = search.get("session_id");
    const status = search.get("status");

    const isStripeSuccessReturn = status === 'success' && !!sessionId;

    if (isStripeSuccessReturn && guestId) {
      log('info', '🔄 Hydrating Stripe success state from URL', { guestId, sessionId, status }, 'stripeSuccess');
      
      setStripeSuccess({
        showSuccessModal: true,
        guestId,
        sessionId,
        status,
        isProcessing: true
      });
    }
  };

  const clearStripeSuccess = () => {
    log('info', '🔄 Clearing Stripe success state', null, 'stripeSuccess');
    setStripeSuccess({
      showSuccessModal: false,
      guestId: null,
      sessionId: null,
      status: null,
      isProcessing: false
    });
  };

  return (
    <StripeSuccessContext.Provider value={{
      stripeSuccess,
      setStripeSuccess,
      clearStripeSuccess,
      hydrateFromUrl
    }}>
      {children}
    </StripeSuccessContext.Provider>
  );
}; 