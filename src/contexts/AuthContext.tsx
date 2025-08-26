import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { useNavigationState } from '@/contexts/NavigationStateContext';
import { getAbsoluteUrl } from '@/utils/urlUtils';
import { log } from '@/utils/logUtils';

import { authService } from '@/services/authService';
import { SUPABASE_URL } from '@/integrations/supabase/client';
/**
 * Utility – only logs outside production builds.
 */
const debug = (...args: any[]) => {
  if (process.env.NODE_ENV !== 'production') console.log(...args);
};

// Lightweight trace object
if (typeof window !== 'undefined' && !(window as any).__authTrace) {
  (window as any).__authTrace = {
    providerMounts: 0,
    listeners: 0,
    initialSessionChecks: 0,
  };
}

// ──────────────────────────────────────────
// Remove hardcoded constants - use the centralized Supabase client instead
// ──────────────────────────────────────────

/**
 * Typed shape for the Auth context.
 */
export type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  pendingEmailAddress: string | null;
  isPendingEmailCheck: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; data: any }>; // eslint-disable-line @typescript-eslint/no-explicit-any
  signUp: (email: string, password: string) => Promise<{ error: Error | null; user?: User | null }>; // eslint-disable-line @typescript-eslint/no-explicit-any
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signInWithApple: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<{ error: Error | null }>;
  resetPasswordForEmail: (email: string) => Promise<{ error: Error | null }>;
  clearPendingEmail: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Edge function: /functions/v1/email-check
 *   Expects bearer SESSION token so it can check RLS against the current user.
 */
const checkForPendingEmailChange = async (sessionToken: string, userEmail: string) => {
  try {
    // Use Supabase edge function via the client
    const { data, error } = await supabase.functions.invoke('email-check', {
      body: { email: userEmail }
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  } catch (err) {
    return null;
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingEmailAddress, setPendingEmailAddress] = useState<string | null>(null);
  const [isPendingEmailCheck, setIsPendingEmailCheck] = useState(false);
  const { clearNavigationState } = useNavigationState();
  const initializedRef = useRef(false);

  /* ─────────────────────────────────────────────────────────────
   * Register Supabase auth listener and get initial session
   * ────────────────────────────────────────────────────────────*/
  useEffect(() => {
    // Skip auth initialization during SSR but don't return early from provider
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    if (initializedRef.current) return;
    initializedRef.current = true;

    if (typeof window !== 'undefined') (window as any).__authTrace.providerMounts++;
    log('debug', 'Initializing AuthContext with enhanced session management', null, 'auth');

    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, supaSession) => {
      if (typeof window !== 'undefined') (window as any).__authTrace.listeners++;
      log('debug', 'Auth state change', { event, hasSession: !!supaSession }, 'auth');
      
      // Set user and session state immediately to avoid race conditions
      setUser(supaSession?.user ?? null);
      setSession(supaSession);
      setLoading(false);

      if (event === 'SIGNED_IN' && supaSession) {
        // Only check for pending email change if we suspect there might be one
        // Don't block the auth flow for every sign-in
        const hasEmailChangeHistory = localStorage.getItem('hasEmailChangeHistory');
        if (hasEmailChangeHistory === 'true') {
          setIsPendingEmailCheck(true);
          
          // Defer the email check to avoid blocking the auth flow
          setTimeout(async () => {
            try {
              const emailCheckData = await checkForPendingEmailChange(
                supaSession.access_token, 
                supaSession.user.email || ''
              );
              

              if (emailCheckData?.status === 'pending') {
                setPendingEmailAddress(emailCheckData.pending_to);
              } else {
                setPendingEmailAddress(null);
              }
            } catch (error) {
              setPendingEmailAddress(null);
            } finally {
              setIsPendingEmailCheck(false);
            }
          }, 0);
        } else {
          // No email change history, skip the check entirely
          setPendingEmailAddress(null);
          setIsPendingEmailCheck(false);
        }
      }

      if (event === 'SIGNED_OUT') {
        setPendingEmailAddress(null);
        setIsPendingEmailCheck(false);
      }
    });

    /* ────────────────────────────
     * Bootstrap existing session ONLY ONCE
     * ────────────────────────────*/
    if (typeof window !== 'undefined') (window as any).__authTrace.initialSessionChecks++;
    supabase.auth.getSession().then(({ data: { session: supaSession } }) => {
      log('debug', 'Initial session check', { hasSession: !!supaSession }, 'auth');
      
      setUser(supaSession?.user ?? null);
      setSession(supaSession);
      setLoading(false);
    }).catch((error) => {
      console.error('Error getting initial session:', error);
      setLoading(false);
    });

    return () => {
      log('debug', 'Cleaning up auth subscription', null, 'auth');
      subscription.unsubscribe();
    };
  }, []);

  const clearPendingEmail = () => {
    setPendingEmailAddress(null);
  };

  /* ──────────────────────────────────
   * Helpers exposed through context
   * ─────────────────────────────────*/
  const signIn = async (email: string, password: string) => {
    try {

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        return { error, data: null };
      }
      
      // Manually set user state if auth state change doesn't fire
      if (data?.user) {
        setUser(data.user);
        setSession(data.session);
        setLoading(false);
      }
      
      return { error: null, data };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unexpected sign-in error');
      
      return { error, data: null };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { 
          emailRedirectTo: typeof window !== 'undefined' 
            ? `${window.location.origin}/chat` 
            : '/chat'
        },
      });
      
      if (error) {
        return { error };
      }
      
      return { error: null, user: data.user };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unexpected sign-up error');
      
      return { error };
    }
  };

  const signInWithGoogle = async (): Promise<{ error: Error | null }> => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

    try {
      if (!SUPABASE_URL) {
        return { error: new Error('Missing Supabase URL') };
      }
      // Create popup window
      const popup = window.open(
        `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(`${baseUrl}/chat`)}`,
        'googleSignIn',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        return { error: new Error('Popup blocked. Please allow popups for this site.') };
      }

      // Wait for popup to close or redirect
      return new Promise<{ error: Error | null }>((resolve) => {
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed);
            // Check if user was authenticated by checking current session
            supabase.auth.getSession().then(({ data: { session } }) => {
              if (session) {
                resolve({ error: null });
              } else {
                resolve({ error: new Error('Authentication was cancelled or failed') });
              }
            });
          }
        }, 1000);
      });
    } catch (err: unknown) {
      return { error: err instanceof Error ? err : new Error('Unexpected Google sign-in error') };
    }
  };

  const signInWithApple = async (): Promise<{ error: Error | null }> => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

    try {
      if (!SUPABASE_URL) {
        return { error: new Error('Missing Supabase URL') };
      }
      
      // Create popup window
      const popup = window.open(
        `${SUPABASE_URL}/auth/v1/authorize?provider=apple&redirect_to=${encodeURIComponent(`${baseUrl}/chat`)}`,
        'appleSignIn',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        return { error: new Error('Popup blocked. Please allow popups for this site.') };
      }

      // Wait for popup to close or redirect
      return new Promise<{ error: Error | null }>((resolve) => {
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed);
            // Check if user was authenticated by checking current session
            supabase.auth.getSession().then(({ data: { session } }) => {
              if (session) {
                resolve({ error: null });
              } else {
                resolve({ error: new Error('Authentication was cancelled or failed') });
              }
            });
          }
        }, 1000);
      });
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unexpected Apple sign-in error');
      return { error };
    }
  };

  const signOut = async () => {
    try {
      debug('========== SIGN‑OUT ==========');
      setLoading(true);
      
      // Clear local state first
      setUser(null);
      setSession(null);
      setPendingEmailAddress(null);
      setIsPendingEmailCheck(false);
      clearNavigationState();

      // Import and use cleanup utility
      const { cleanupAuthState } = await import('@/utils/authCleanup');
      cleanupAuthState();

      // Sign out from Supabase with global scope
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (signOutError) {
        // Continue even if Supabase signOut fails
        console.warn('Supabase signOut failed, but continuing with cleanup:', signOutError);
      }
      
      // Force page reload to ensure clean state
      window.location.href = '/chat';
      
    } catch (error) {
      console.error('Sign out error:', error);
      // Force reload even on error to ensure clean state
      window.location.href = '/chat';
    } finally {
      setLoading(false);
    }
  };

  /**
   * Resend confirmation link if the user deleted the first one.
   * Only succeeds when the account exists & is still unconfirmed.
   */
  const resendVerificationEmail = async (email: string) => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { 
          emailRedirectTo: typeof window !== 'undefined' 
            ? `${window.location.origin}/chat` 
            : '/chat'
        },
      });
      return { error };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err : new Error('Could not resend verification') };
    }
  };

  /**
   * Trigger a password reset email for the given email address
   */
  const resetPasswordForEmail = async (email: string) => {
    try {
      // Use the utility function for consistent absolute URL formatting
      const redirectUrl = getAbsoluteUrl('auth/password');
      
      console.log(`AuthContext: Sending password reset email with redirectTo: ${redirectUrl}`);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });
      return { error };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err : new Error('Could not send password reset email') };
    }
  };

  /* ────────────────────────────────────────────────────────────────*/
  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        pendingEmailAddress,
        isPendingEmailCheck,
        signIn,
        signUp,
        signInWithGoogle,
        signInWithApple,
        signOut,
        resendVerificationEmail,
        resetPasswordForEmail,
        clearPendingEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
