
import React from 'react';
import { useProfileContext } from '@/contexts/ProfileContext';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const VerificationStatus = () => {
  const { profile, isLoading } = useProfileContext();

  if (isLoading || !profile) {
    return null;
  }

  const getStatusIcon = () => {
    switch (profile.verification_status) {
      case 'verified':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'blocked':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusMessage = () => {
    switch (profile.verification_status) {
      case 'verified':
        return 'Your account is verified and ready to use all features.';
      case 'blocked':
        return 'Your account has been blocked. Please contact support.';
      default:
        return 'Please verify your email address to unlock all features.';
    }
  };

  const getStatusVariant = () => {
    switch (profile.verification_status) {
      case 'verified':
        return 'default';
      case 'blocked':
        return 'destructive';
      default:
        return 'default';
    }
  };

  if (profile.verification_status === 'verified') {
    return null; // Don't show anything for verified users
  }

  return (
    <Alert variant={getStatusVariant()} className="mb-4">
      {getStatusIcon()}
      <AlertDescription>{getStatusMessage()}</AlertDescription>
    </Alert>
  );
};
