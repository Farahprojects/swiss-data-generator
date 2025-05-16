
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { cleanupAuthState, checkForAuthRemnants } from '@/utils/authCleanup';
import { useNavigationState } from '@/contexts/NavigationStateContext';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null; user?: User | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { clearNavigationState } = useNavigationState();

  // Check for auth remnants on mount
  useEffect(() => {
    console.log("========== AUTH CONTEXT INITIALIZATION ==========");
    const hasRemnants = checkForAuthRemnants();
    console.log("Auth remnants detected on mount:", hasRemnants);
  }, []);

  useEffect(() => {
    console.log("AuthProvider: Setting up auth state listener");
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("🔥 Auth state change event:", event, "With session:", !!session);
      console.log("Auth state user email:", session?.user?.email || "no user");
      console.log("Current path on auth change:", window.location.pathname);
      
      setSession(session);
      setUser(session?.user ?? null);
      
      // If signed in, defer any data fetching to prevent potential deadlocks
      if (event === 'SIGNED_IN' && session) {
        // Use setTimeout to defer execution to next event loop
        setTimeout(() => {
          console.log("User authenticated:", session.user.email);
          // Only redirect if on a public route
          const isAuthPage = window.location.pathname === '/login' || window.location.pathname === '/signup';
          if (isAuthPage) {
            console.log("On auth page with authenticated user - should redirect to safe path");
          }
        }, 0);
      }
      
      if (event === 'SIGNED_OUT') {
        console.log("User signed out - auth event triggered");
        console.log("Current localStorage after SIGNED_OUT event:", Object.keys(localStorage));
        
        // Check if there are any auth remnants after the event
        setTimeout(() => {
          console.log("Checking for auth remnants after SIGNED_OUT event");
          const hasRemnants = checkForAuthRemnants();
          console.log("Auth remnants after SIGNED_OUT:", hasRemnants);
        }, 100);
      }
    });

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("Initial session check:", session ? "Session found" : "No session");
      if (session) {
        console.log("Session user email:", session.user.email);
      }
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      console.log("AuthProvider: Unsubscribing from auth state changes");
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log("Sign in attempt for:", email);
      setLoading(true);
      
      // Clean up existing auth state to prevent conflicts
      cleanupAuthState();
      console.log("Auth state cleaned up before sign in");
      
      // Try to sign out globally first to clear any existing sessions
      try {
        await supabase.auth.signOut({ scope: 'global' });
        console.log("Global sign out completed before sign in");
      } catch (err) {
        console.log("Global sign out failed, continuing anyway:", err);
        // Continue even if this fails
      }
      
      // Sign in with email/password
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        console.error("Sign in error:", error.message);
        return { error };
      }
      
      console.log("Sign in successful");
      return { error: null };
    } catch (error) {
      console.error("Unexpected sign in error:", error);
      return { error: error instanceof Error ? error : new Error('An unexpected error occurred') };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      console.log("Sign up attempt for:", email);
      setLoading(true);
      
      // Clean up existing auth state
      cleanupAuthState();
      console.log("Auth state cleaned up before sign up");
      
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`
        }
      });
      
      if (error) {
        console.error("Signup error:", error.message);
        return { error, user: null };
      }
      
      console.log("Sign up successful, user created:", data.user?.id);
      return { error: null, user: data.user };
    } catch (err) {
      console.error("Unexpected signup error:", err);
      return { error: err instanceof Error ? err : new Error('An unexpected error occurred during signup') };
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    // Clean up existing auth state
    cleanupAuthState();
    console.log("Auth state cleaned up before Google sign-in");
    
    // Get the current URL's base
    const baseUrl = window.location.origin;
    
    try {
      console.log("Initiating Google sign-in");
      
      // Try to sign out globally first
      try {
        await supabase.auth.signOut({ scope: 'global' });
        console.log("Global sign out completed before Google sign-in");
      } catch (err) {
        console.log("Global sign out failed, continuing anyway");
        // Continue even if this fails
      }
      
      const { error } = await supabase.auth.signInWithOAuth({ 
        provider: 'google',
        options: {
          redirectTo: `${baseUrl}/dashboard`
        }
      });
      
      return { error };
    } catch (error) {
      console.error("Google sign in error:", error);
      return { error: error instanceof Error ? error : new Error('An unexpected error occurred') };
    }
  };

  const signOut = async () => {
    try {
      console.log("========== SIGN OUT PROCESS STARTED ==========");
      console.log("Current path on sign out:", window.location.pathname);
      console.log("Current localStorage before sign out:", Object.keys(localStorage));
      console.log("Is user authenticated before sign out:", !!user);
      setLoading(true);
      
      // Clear navigation state first to prevent redirect loops
      clearNavigationState();
      console.log("Navigation state cleared during sign out");
      
      // Clean up auth state
      cleanupAuthState();
      console.log("Auth state cleaned up during sign out");
      
      // Try global sign out (more thorough)
      try {
        const { error } = await supabase.auth.signOut({ scope: 'global' });
        if (error) {
          console.error("Sign out API error:", error);
        } else {
          console.log("Global sign out API call successful");
        }
      } catch (error) {
        console.error("Sign out error:", error);
        // Continue even if this fails
      }
      
      // Double check if auth state is really gone
      setTimeout(() => {
        console.log("Checking for auth remnants after signOut");
        const hasRemnants = checkForAuthRemnants();
        console.log("Auth remnants after signOut:", hasRemnants);
        
        // Force redirect to login page
        console.log("Redirecting to login page after sign out using window.location");
        window.location.href = '/login';
      }, 200);
    } catch (error) {
      console.error("Sign out unexpected error:", error);
    } finally {
      setLoading(false);
      console.log("========== SIGN OUT PROCESS COMPLETED ==========");
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
