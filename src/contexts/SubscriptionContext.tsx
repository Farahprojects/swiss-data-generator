import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import PaywallModal from '@/components/paywall/PaywallModal';

interface SubscriptionContextType {
  showPaywall: boolean;
  setShowPaywall: (show: boolean) => void;
  isSubscriptionActive: boolean;
  subscriptionPlan: string | null;
  loading: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { isActive, plan, loading } = useSubscriptionStatus();
  const [showPaywall, setShowPaywall] = useState(false);

  // Show paywall if user is authenticated but doesn't have active subscription
  useEffect(() => {
    if (user && !loading) {
      // Only show paywall if user is logged in and doesn't have active subscription
      if (!isActive) {
        setShowPaywall(true);
      } else {
        setShowPaywall(false);
      }
    } else if (!user) {
      // Don't show paywall for unauthenticated users
      setShowPaywall(false);
    }
  }, [user, isActive, loading]);

  const handlePaywallClose = () => {
    setShowPaywall(false);
  };

  const handlePaywallSuccess = () => {
    setShowPaywall(false);
    // Optionally refresh subscription status
    window.location.reload();
  };

  return (
    <SubscriptionContext.Provider
      value={{
        showPaywall,
        setShowPaywall,
        isSubscriptionActive: isActive,
        subscriptionPlan: plan,
        loading
      }}
    >
      {children}
      
      {/* Paywall Modal */}
      <PaywallModal
        isOpen={showPaywall}
        onClose={handlePaywallClose}
        onSuccess={handlePaywallSuccess}
      />
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}
