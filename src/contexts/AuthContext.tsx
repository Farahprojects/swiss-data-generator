import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { useNavigationState } from '@/contexts/NavigationStateContext';
import { getAbsoluteUrl } from '@/utils/urlUtils';
import { log } from '@/utils/logUtils';

import { authService } from '@/services/authService';
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
  isValidating: boolean;
  pendingEmailAddress?: string;
  isPendingEmailCheck?: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; data: any }>; // eslint-disable-line @typescript-eslint/no-explicit-any
  signUp: (email: string, password: string) => Promise<{ error: Error | null; user?: User | null }>; // eslint-disable-line @typescript-eslint/no-explicit-any
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signInWithApple: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<{ error: Error | null }>;
  resetPasswordForEmail: (email: string) => Promise<{ error: Error | null }>;
  clearPendingEmail?: () => void;
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
  // Email verification state removed - handled by custom system
  const [isValidating, setIsValidating] = useState(false);
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
      
      // Set user and session state - let features decide access based on email_confirmed_at
      setUser(supaSession?.user ?? null);
      setSession(supaSession);
      setLoading(false);

      // Update URL parameters to match auth state
      if (supaSession?.user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        // User signed in or has existing session - no need to add user_id to URL
        // The user information is available through the auth context
      } else if (!supaSession?.user && event === 'SIGNED_OUT') {
        // User signed out - clean up any existing user_id from URL if present
        const currentUrl = new URL(window.location.href);
        if (currentUrl.searchParams.has('user_id')) {
          currentUrl.searchParams.delete('user_id');
          window.history.replaceState({}, '', currentUrl.toString());
        }
      }

      // Validate session after any auth state change (deferred to avoid deadlocks)
      if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN') && supaSession?.user) {
        setTimeout(async () => {
          setIsValidating(true);
          try {
            const { data: userData, error } = await supabase.auth.getUser();
            if (error || !userData?.user) {
              console.warn('[AuthContext] Session validation failed, clearing auth state');
              const { cleanupAuthState } = await import('@/utils/authCleanup');
              cleanupAuthState();
              try {
                await supabase.auth.signOut({ scope: 'global' });
              } catch (signOutError) {
                console.warn('Global signOut failed during validation cleanup:', signOutError);
              }
              setUser(null);
              setSession(null);
            }
          } catch (validationError) {
            console.error('Session validation error:', validationError);
          } finally {
            setIsValidating(false);
          }
        }, 0);
      }

      if (event === 'SIGNED_IN' && supaSession) {
        // Only check for pending email change if we suspect there might be one
        // Don't block the auth flow for every sign-in
        const hasEmailChangeHistory = localStorage.getItem('hasEmailChangeHistory');
        if (hasEmailChangeHistory === 'true') {
          
          // Defer the email check to avoid blocking the auth flow
          setTimeout(async () => {
            try {
              const emailCheckData = await checkForPendingEmailChange(
                supaSession.access_token, 
                supaSession.user.email || ''
              );
              

              if (emailCheckData?.status === 'pending') {
              } else {
              }
            } catch (error) {
            } finally {
            }
          }, 0);
        } else {
          // No email change history, skip the check entirely
        }
      }

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setSession(null);
        
        // Clear chat stores when user signs out (downstream cleanup)
        try {
          const { useMessageStore } = await import('@/stores/messageStore');
          const { useChatStore } = await import('@/core/store');
          useMessageStore.getState().setChatId(null);
          useChatStore.getState().clearAllData();
        } catch (error) {
          console.warn('Could not clear chat stores on sign out:', error);
        }
      }
      
      // Additional check for user deletion - validate user still exists
      if (event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
        if (supaSession?.user) {
          // Validate that the user still exists in the database
          validateUserExists(supaSession.user.id).catch(() => {
            // User doesn't exist anymore - clear auth state
            console.warn('[AuthContext] User no longer exists in database, clearing auth state');
            setUser(null);
            setSession(null);
          });
        }
      }
    });

    /* ────────────────────────────
     * Bootstrap existing session ONLY ONCE
     * ────────────────────────────*/
    if (typeof window !== 'undefined') (window as any).__authTrace.initialSessionChecks++;
    supabase.auth.getSession().then(async ({ data: { session: supaSession } }) => {
      log('debug', 'Initial session check', { hasSession: !!supaSession }, 'auth');
      
      // Set user and session state initially
      setUser(supaSession?.user ?? null);
      setSession(supaSession);
      setLoading(false);

      // Immediate validation if we have a session (deferred to avoid deadlocks)
      if (supaSession?.user) {
        setTimeout(async () => {
          setIsValidating(true);
          try {
            const { data: userData, error } = await supabase.auth.getUser();
            if (error || !userData?.user) {
              console.warn('[AuthContext] Initial session validation failed, clearing auth state');
              const { cleanupAuthState } = await import('@/utils/authCleanup');
              cleanupAuthState();
              try {
                await supabase.auth.signOut({ scope: 'global' });
              } catch (signOutError) {
                console.warn('Global signOut failed during initial validation cleanup:', signOutError);
              }
              setUser(null);
              setSession(null);
            }
          } catch (validationError) {
            console.error('Initial session validation error:', validationError);
          } finally {
            setIsValidating(false);
          }
        }, 0);
      }
    }).catch((error) => {
      console.error('Error getting initial session:', error);
      setLoading(false);
    });

    // Set up periodic user validation for deleted accounts
    const validationInterval = setInterval(async () => {
      if (user?.id) {
        const userExists = await validateUserExists(user.id);
        if (!userExists) {
          console.warn('[AuthContext] Periodic validation: User no longer exists, clearing auth state');
          setUser(null);
          setSession(null);
        }
      }
    }, 30000); // Check every 30 seconds

    return () => {
      log('debug', 'Cleaning up auth subscription', null, 'auth');
      subscription.unsubscribe();
      clearInterval(validationInterval);
    };
  }, [user?.id]);

  // clearPendingEmail function removed - handled by custom system

  // Validate that a user still exists in the database
  const validateUserExists = async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();
      
      if (error || !data) {
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
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
      
        // Email verification check removed - handled by custom verification system
        // Users will be redirected to verification page if needed

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
      // Create user first using admin API
      const { data: userData, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: false // Don't auto-confirm email
      });

      if (createError) {
        log('debug', 'User creation error', { error: createError }, 'auth');
        
        // Handle email already exists case specifically
        if (createError.message?.includes('already been registered') || createError.status === 422) {
          return { error: new Error('An account with this email already exists. Please sign in instead.') };
        }
        
        return { error: new Error(createError.message || 'Failed to create account') };
      }

      if (!userData.user) {
        return { error: new Error('Failed to create user account') };
      }

      log('debug', 'User created successfully', { userId: userData.user.id }, 'auth');

      // Generate signup verification link using admin API
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: "signup",
        email: email,
        password: password,
        options: { 
          redirectTo: "https://auth.therai.co/auth/email" // Same redirect as email-verification function
        }
      });

      if (linkError) {
        log('debug', 'Link generation error', { error: linkError }, 'auth');
        return { error: new Error('Failed to generate verification link') };
      }

      const tokenLink = linkData?.properties?.action_link || "";
      if (!tokenLink) {
        return { error: new Error('Failed to generate verification link') };
      }

      log('debug', 'Signup link generated', { hasLink: !!tokenLink }, 'auth');

      // Call email-verification edge function to send the email
      const { error: emailError } = await supabase.functions.invoke('email-verification', {
        body: {
          user_id: userData.user.id,
          token_link: tokenLink,
          template_type: "email_verification"
        }
      });

      if (emailError) {
        log('debug', 'Email sending error', { error: emailError }, 'auth');
        return { error: new Error('Failed to send verification email') };
      }

      // Success case - verification email sent
      return { 
        error: null, 
        data: { 
          message: 'Verification email sent. Please check your inbox and click the verification link to complete registration.' 
        } 
      };

    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unexpected sign-up error');
      return { error };
    }
  };

  const signInWithGoogle = async (): Promise<{ error: Error | null }> => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

    try {
      const { SUPABASE_URL } = await import('@/integrations/supabase/config');
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
      const { SUPABASE_URL } = await import('@/integrations/supabase/config');
      
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
      
      // Force page refresh to ensure clean state - this will naturally empty message store
      // when there's no logged user, rather than manually clearing it
      window.location.reload();
      
    } catch (error) {
      console.error('Sign out error:', error);
      // Force reload even on error to ensure clean state
      window.location.reload();
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
      // Get user ID for the email
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        return { error: new Error('User not found') };
      }

      // Use custom verification email function
      const { error } = await supabase.functions.invoke('email-verification', {
        body: {
          user_id: userData.user.id
        }
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
        isValidating,
        // Email verification state removed - handled by custom system
        signIn,
        signUp,
        signInWithGoogle,
        signInWithApple,
        signOut,
        resendVerificationEmail,
        resetPasswordForEmail,
        // clearPendingEmail removed
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    console.error('useAuth called outside AuthProvider - check component hierarchy');
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
