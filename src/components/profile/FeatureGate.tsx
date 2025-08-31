
import React from 'react';
import { useProfileContext } from '@/contexts/ProfileContext';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface FeatureGateProps {
  children: React.ReactNode;
  requireVerification?: boolean;
  requireFeature?: string;
  requireSubscription?: string;
  fallback?: React.ReactNode;
  showMessage?: boolean;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({
  children,
  requireVerification = false,
  requireFeature,
  requireSubscription,
  fallback,
  showMessage = true
}) => {
  const { profile, isVerified, hasFeature, hasSubscriptionPlan } = useProfileContext();

  // Check verification requirement
  if (requireVerification && !isVerified) {
    if (fallback) return <>{fallback}</>;
    if (!showMessage) return null;
    
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Please verify your email address to access this feature.
        </AlertDescription>
      </Alert>
    );
  }

  // Check feature requirement
  if (requireFeature && !hasFeature(requireFeature)) {
    if (fallback) return <>{fallback}</>;
    if (!showMessage) return null;
    
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          This feature is not available in your current plan.
        </AlertDescription>
      </Alert>
    );
  }

  // Check subscription requirement
  if (requireSubscription && !hasSubscriptionPlan(requireSubscription)) {
    if (fallback) return <>{fallback}</>;
    if (!showMessage) return null;
    
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          This feature requires a {requireSubscription} subscription.
        </AlertDescription>
      </Alert>
    );
  }

  return <>{children}</>;
};
