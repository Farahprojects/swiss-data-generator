import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
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
  const { isActive, plan, loading, refetch } = useSubscriptionStatus();
  const [showPaywall, setShowPaywall] = useState(false);
  const location = useLocation();

  // Refetch subscription status when returning from successful payment
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const paymentStatus = searchParams.get('payment_status');
    
    if (paymentStatus === 'success' && user) {
      // Refetch subscription status to ensure it's up-to-date
      refetch();
    }
  }, [location.search, user, refetch]);

  // Show paywall if user is authenticated but doesn't have active subscription
  useEffect(() => {
    // Suppress paywall overlay on checkout-related pages
    const suppressedPrefixes = ['/stripe', '/subscription', '/subscription-paywall', '/success', '/cancel'];
    const path = location.pathname || '';
    const searchParams = new URLSearchParams(location.search);
    const paymentStatus = searchParams.get('payment_status');
    
    // Suppress paywall on specific routes or if returning from successful payment
    if (suppressedPrefixes.some(prefix => path.startsWith(prefix)) || paymentStatus === 'success') {
      setShowPaywall(false);
      return;
    }

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
  }, [user, isActive, loading, location.pathname, location.search]);

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
