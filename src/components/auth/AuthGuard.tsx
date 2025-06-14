
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { log } from '@/utils/logUtils';
import { supabase } from '@/integrations/supabase/client';

export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, pendingEmailAddress, isPendingEmailCheck } = useAuth();
  const location = useLocation();
  const [sessionValidated, setSessionValidated] = useState(false);
  const [validatingSession, setValidatingSession] = useState(false);
  const searchParams = new URLSearchParams(location.search);
  
  // Check for password reset route with more precision
  // This will match both /auth/password and /auth/password?type=recovery
  const isPasswordResetRoute = location.pathname.includes('/auth/password');
  
  // Check specifically for recovery token
  const hasRecoveryToken = searchParams.get('type') === 'recovery';

  // Additional session validation for preview environment
  useEffect(() => {
    const validateSession = async () => {
      if (loading || validatingSession || sessionValidated) return;
      
      setValidatingSession(true);
      
      try {
        console.log('🔍 AuthGuard: Validating session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ AuthGuard: Session validation error:', error);
          log('warn', 'AuthGuard session validation error', { error: error.message });
        } else if (session) {
          console.log('✅ AuthGuard: Session validated successfully');
          log('debug', 'AuthGuard session validated', { userId: session.user.id });
          setSessionValidated(true);
        } else {
          console.log('ℹ️ AuthGuard: No session found');
          log('debug', 'AuthGuard no session found');
        }
      } catch (error) {
        console.error('❌ AuthGuard: Session validation exception:', error);
        log('error', 'AuthGuard session validation exception', { 
          error: error instanceof Error ? error.message : String(error) 
        });
      } finally {
        setValidatingSession(false);
      }
    };

    validateSession();
  }, [loading, user, validatingSession, sessionValidated]);
  
  useEffect(() => {
    // Only log significant auth state changes, not every evaluation
    if (!loading && !validatingSession) {
      log('debug', 'AuthGuard auth state settled', {
        path: location.pathname,
        hasUser: !!user,
        sessionValidated,
        isPasswordReset: isPasswordResetRoute,
        hasRecoveryToken,
        pendingEmailAddress: !!pendingEmailAddress
      });
    }
  }, [location.pathname, user, loading, validatingSession, sessionValidated, isPasswordResetRoute, hasRecoveryToken, pendingEmailAddress]);
  
  // If user is on password reset route, don't apply auth guard
  if (isPasswordResetRoute) {
    log('debug', 'Password reset route detected, bypassing auth guard');
    return <>{children}</>;
  }
  
  // If there's a recovery token anywhere, redirect to password reset page
  if (hasRecoveryToken && !isPasswordResetRoute) {
    log('info', 'Recovery token detected on non-password reset route, redirecting');
    return <Navigate to={`/auth/password${location.search}`} replace />;
  }
  
  if (loading || isPendingEmailCheck || validatingSession) {
    // Still loading auth state or checking for pending email, show loading
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  
  // Check both user state and session validation for extra reliability
  const isAuthenticated = user && (sessionValidated || !validatingSession);
  
  // Not logged in, redirect to login
  if (!isAuthenticated) {
    log('info', 'User not authenticated, redirecting to login', { 
      hasUser: !!user, 
      sessionValidated,
      validatingSession 
    });
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If user has pending email verification, redirect to login to show verification modal
  if (pendingEmailAddress) {
    log('info', 'User has pending email verification, redirecting to login');
    return <Navigate to="/login" state={{ from: location, showVerification: true, pendingEmail: pendingEmailAddress }} replace />;
  }
  
  // User is logged in and verified, render protected component
  return <>{children}</>;
};
