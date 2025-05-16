
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { cleanupAuthState } from '@/utils/authCleanup';
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

  useEffect(() => {
    console.log("AuthProvider: Setting up auth state listener");
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state change event:", event);
      setSession(session);
      setUser(session?.user ?? null);
      
      // If signed in, defer any data fetching to prevent potential deadlocks
      if (event === 'SIGNED_IN' && session) {
        // Use setTimeout to defer execution to next event loop
        setTimeout(() => {
          console.log("User authenticated:", session.user.email);
        }, 0);
      }
      
      if (event === 'SIGNED_OUT') {
        console.log("User signed out");
      }
    });

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("Initial session check:", session ? "Session found" : "No session");
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
      console.log("Signing out...");
      setLoading(true);
      
      // Clear navigation state first to prevent redirect loops
      clearNavigationState();
      console.log("Navigation state cleared during sign out");
      
      // Clean up auth state
      cleanupAuthState();
      console.log("Auth state cleaned up during sign out");
      
      // Try global sign out (more thorough)
      try {
        await supabase.auth.signOut({ scope: 'global' });
        console.log("Global sign out successful");
      } catch (error) {
        console.error("Sign out error:", error);
        // Continue even if this fails
      }
      
      console.log("Redirecting to login page after sign out");
      // Force navigation to login page instead of home
      window.location.href = '/login';
    } catch (error) {
      console.error("Sign out unexpected error:", error);
    } finally {
      setLoading(false);
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
