import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { cleanupAuthState, checkForAuthRemnants } from '@/utils/authCleanup';
import { useNavigationState } from '@/contexts/NavigationStateContext';
import { getAbsoluteUrl } from '@/utils/urlUtils';

/**
 * Utility – only logs outside production builds.
 */
const debug = (...args: any[]) => {
  if (process.env.NODE_ENV !== 'production') console.log(...args);
};

/**
 * Typed shape for the Auth context.
 */
export type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; data: any }>; // eslint-disable-line @typescript-eslint/no-explicit-any
  signUp: (email: string, password: string) => Promise<{ error: Error | null; user?: User | null }>; // eslint-disable-line @typescript-eslint/no-explicit-any
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<{ error: Error | null }>;
  resetPasswordForEmail: (email: string) => Promise<{ error: Error | null }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  const { clearNavigationState } = useNavigationState();

  /* ─────────────────────────────────────────────────────────────
   * Initial mount – scan for dangling auth state (localStorage)
   * ────────────────────────────────────────────────────────────*/
  useEffect(() => {
    debug('========== AUTH CONTEXT INITIALIZATION ==========', checkForAuthRemnants());
  }, []);

  /* ─────────────────────────────────────────────────────────────
   * Register Supabase auth listener *before* requesting session
   * ────────────────────────────────────────────────────────────*/
  useEffect(() => {
    debug('AuthProvider: Setting up auth state listener');

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, supaSession) => {
      debug('🔥 Auth state change:', event, 'session?', !!supaSession);
      setSession(supaSession);
      setUser(supaSession?.user ?? null);

      if (event === 'SIGNED_IN' && supaSession) {
        setTimeout(() => {
          // Check if we're on password reset route before suggesting redirect
          const isOnPasswordResetRoute = window.location.pathname.includes('/auth/password');
          const onAuthPage = ['/login', '/signup'].includes(window.location.pathname);
          
          if (onAuthPage && !isOnPasswordResetRoute) {
            debug('Signed‑in user still on auth page – consider redirect');
          }
          
          if (isOnPasswordResetRoute) {
            debug('On password reset route, NOT redirecting to dashboard');
          }
        }, 0);
      }

      if (event === 'SIGNED_OUT') {
        setTimeout(() => debug('Auth remnants after SIGNED_OUT:', checkForAuthRemnants()), 100);
      }
    });

    /* ────────────────────────────
     * Bootstrap existing session
     * ────────────────────────────*/
    supabase.auth.getSession().then(({ data: { session: supaSession } }) => {
      debug('Initial session check:', supaSession ? 'found' : 'none');
      setSession(supaSession);
      setUser(supaSession?.user ?? null);
      setLoading(false);
      setAuthInitialized(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  /* ──────────────────────────────────
   * Helpers exposed through context
   * ─────────────────────────────────*/
  const signIn = async (email: string, password: string) => {
    try {
      debug('Sign‑in attempt:', email);
      setLoading(true);
      cleanupAuthState();

      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (_) {/* ignore */}

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error, data: null };
      return { error: null, data };
    } catch (err: unknown) {
      return {
        error: err instanceof Error ? err : new Error('Unexpected sign‑in error'),
        data: null,
      };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      debug('Sign‑up attempt:', email);
      setLoading(true);
      cleanupAuthState();

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/dashboard` },
      });
      if (error) return { error };
      return { error: null, user: data.user };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err : new Error('Unexpected sign‑up error') };
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    cleanupAuthState();
    const baseUrl = window.location.origin;

    try {
      await supabase.auth.signOut({ scope: 'global' }).catch(() => {});
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${baseUrl}/dashboard` },
      });
      return { error };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err : new Error('Unexpected Google sign‑in error') };
    }
  };

  const signOut = async () => {
    try {
      debug('========== SIGN‑OUT ==========');
      setLoading(true);
      setUser(null);
      setSession(null);
      clearNavigationState();
      cleanupAuthState();

      await supabase.auth.signOut({ scope: 'global' }).catch(() => {});
      /* Clear any lingering sb‑ cookies */
      document.cookie.split(';').forEach((c) => {
        const n = c.split('=')[0].trim();
        if (n.match(/^(sb-|supabase)/i)) document.cookie = `${n}=; Max‑Age=0; path=/;`;
      });
      window.location.href = '/login';
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
        options: { emailRedirectTo: `${window.location.origin}/dashboard` },
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
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        resendVerificationEmail,
        resetPasswordForEmail,
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
