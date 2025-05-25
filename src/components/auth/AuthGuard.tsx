
import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, pendingEmailAddress, isPendingEmailCheck } = useAuth();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  
  // Check for password reset route with more precision
  // This will match both /auth/password and /auth/password?type=recovery
  const isPasswordResetRoute = location.pathname.includes('/auth/password');
  
  // Check specifically for recovery token
  const hasRecoveryToken = searchParams.get('type') === 'recovery';
  
  useEffect(() => {
    // We can add debug logging here to see when AuthGuard is evaluating
    console.log('AuthGuard evaluating:', {
      path: location.pathname,
      search: location.search,
      hasUser: !!user,
      loading,
      isPasswordReset: isPasswordResetRoute,
      hasRecoveryToken,
      pendingEmailAddress,
      isPendingEmailCheck
    });
  }, [location.pathname, location.search, user, loading, isPasswordResetRoute, hasRecoveryToken, pendingEmailAddress, isPendingEmailCheck]);
  
  // If user is on password reset route, don't apply auth guard
  if (isPasswordResetRoute) {
    console.log('Password reset route detected, bypassing auth guard');
    return <>{children}</>;
  }
  
  // If there's a recovery token anywhere, redirect to password reset page
  if (hasRecoveryToken && !isPasswordResetRoute) {
    console.log('Recovery token detected on non-password reset route, redirecting');
    return <Navigate to={`/auth/password${location.search}`} replace />;
  }
  
  if (loading || isPendingEmailCheck) {
    // Still loading auth state or checking for pending email, don't redirect yet
    return <div>Loading authentication...</div>;
  }
  
  // Not logged in, redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If user has pending email verification, redirect to login to show verification modal
  if (pendingEmailAddress) {
    console.log('User has pending email verification, redirecting to login');
    return <Navigate to="/login" state={{ from: location, showVerification: true, pendingEmail: pendingEmailAddress }} replace />;
  }
  
  // User is logged in and verified, render protected component
  return <>{children}</>;
};
