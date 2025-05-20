
import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  // Check for password reset route
  const isPasswordResetRoute = location.pathname.includes('/auth/password');
  
  useEffect(() => {
    // We can add debug logging here to see when AuthGuard is evaluating
    console.log('AuthGuard evaluating:', {
      path: location.pathname,
      hasUser: !!user,
      loading,
      isPasswordReset: isPasswordResetRoute
    });
  }, [location.pathname, user, loading, isPasswordResetRoute]);
  
  // If user is on password reset route, don't apply auth guard
  if (isPasswordResetRoute) {
    console.log('Password reset route detected, bypassing auth guard');
    return <>{children}</>;
  }
  
  if (loading) {
    // Still loading auth state, don't redirect yet
    return <div>Loading authentication...</div>;
  }
  
  // Not logged in, redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // User is logged in, render protected component
  return <>{children}</>;
};
