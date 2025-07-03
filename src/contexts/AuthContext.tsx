import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigationState } from '@/contexts/NavigationStateContext';
import { getAbsoluteUrl } from '@/utils/urlUtils';
import { logToSupabase } from '@/utils/batchedLogManager';

/*
───────────────────────────────────────────────────────────────────────────
  CONFIG & HELPERS
───────────────────────────────────────────────────────────────────────────*/
const SUPABASE_URL = 'https://wrvqqvqvwqmfdqvqmaar.supabase.co';
const SUPABASE_PUBLISHABLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndydnFxdnF2d3FtZmRxdnFtYWFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1ODA0NjIsImV4cCI6MjA2MTE1NjQ2Mn0.u9P-SY4kSo7e16I29TXXSOJou5tErfYuldrr_CITWX0';

const debug = (...args: unknown[]) => {
  if (process.env.NODE_ENV !== 'production') console.log('[AuthContext]', ...args);
};

/*
───────────────────────────────────────────────────────────────────────────
  EDGE‑FUNCTION → email‑check
───────────────────────────────────────────────────────────────────────────*/
const checkForPendingEmailChange = async (sessionToken: string, userEmail: string) => {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/email-check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ email: userEmail }),
    });

    if (!res.ok) return null;
    return (await res.json()) as { status: string; pending_to: string } | null;
  } catch (err) {
    logToSupabase('email-check failed', {
      level: 'warn',
      page: 'AuthContext',
      data: { error: err instanceof Error ? err.message : String(err) },
    });
    return null;
  }
};

/*
───────────────────────────────────────────────────────────────────────────
  CONTEXT TYPES
───────────────────────────────────────────────────────────────────────────*/
export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  /* pending‑email flow */
  pendingEmailAddress: string | null;
  isPendingEmailCheck: boolean;
  /* auth helpers */
  signIn: (email: string, password: string) => Promise<{ error: Error | null; data: any }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null; user?: User | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signInWithApple: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<{ error: Error | null }>;
  resetPasswordForEmail: (email: string) => Promise<{ error: Error | null }>;
  clearPendingEmail: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/*
───────────────────────────────────────────────────────────────────────────
  PROVIDER
───────────────────────────────────────────────────────────────────────────*/
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const [pendingEmailAddress, setPendingEmailAddress] = useState<string | null>(null);
  const [isPendingEmailCheck, setIsPendingEmailCheck] = useState(false);

  const { clearNavigationState } = useNavigationState();
  const initializedRef = useRef(false);

  /* ─────────────────────────────────────────────────────────────── */
  /* Lifecycle — init listener & bootstrap session                  */
  /* ─────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }
    if (initializedRef.current) return;
    initializedRef.current = true;

    debug('initialising');

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, supaSession) => {
      debug('onAuthStateChange →', event, supaSession?.user?.id);

      setUser(supaSession?.user ?? null);
      setSession(supaSession);
      setLoading(false);

      if (event === 'SIGNED_IN' && supaSession) {
        /* run pending‑email check without blocking UI */
        setIsPendingEmailCheck(true);
        try {
          const emailCheckData = await checkForPendingEmailChange(
            supaSession.access_token,
            supaSession.user.email ?? ''
          );

          if (emailCheckData?.status === 'pending') {
            setPendingEmailAddress(emailCheckData.pending_to);
          } else {
            setPendingEmailAddress(null);
          }
        } finally {
          setIsPendingEmailCheck(false);
        }
      }

      if (event === 'SIGNED_OUT') {
        setPendingEmailAddress(null);
        setIsPendingEmailCheck(false);
      }
    });

    // bootstrap current session (first render)
    supabase.auth.getSession().then(({ data: { session: supaSession } }) => {
      debug('initial session →', !!supaSession);
      setUser(supaSession?.user ?? null);
      setSession(supaSession);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  /* ─────────────────────────────────────────────────────────────── */
  /* Auth helpers                                                   */
  /* ─────────────────────────────────────────────────────────────── */
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error ?? null, data };
    } catch (err: any) {
      return { error: err instanceof Error ? err : new Error('Unexpected sign‑in error'), data: null };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo:
            typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : '/dashboard',
        },
      });
      return { error: error ?? null, user: data.user };
    } catch (err: any) {
      return { error: err instanceof Error ? err : new Error('Unexpected sign‑up error') };
    }
  };

  const signInWithGoogle = async () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${baseUrl}/dashboard` } });
    return { error };
  };

  const signInWithApple = async () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'apple', options: { redirectTo: `${baseUrl}/dashboard` } });
    return { error };
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut({ scope: 'global' });
      clearNavigationState();
      setUser(null);
      setSession(null);
      setPendingEmailAddress(null);
      setIsPendingEmailCheck(false);
    } finally {
      setLoading(false);
    }
  };

  const resendVerificationEmail = async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : '/dashboard',
      },
    });
    return { error };
  };

  const resetPasswordForEmail = async (email: string) => {
    const redirectUrl = getAbsoluteUrl('auth/password');
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl });
    return { error };
  };

  const clearPendingEmail = () => setPendingEmailAddress(null);

  /* ─────────────────────────────────────────────────────────────── */
  /* Provider value                                                 */
  /* ─────────────────────────────────────────────────────────────── */
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
};

/*
───────────────────────────────────────────────────────────────────────────
  HOOK
───────────────────────────────────────────────────────────────────────────*/
export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
