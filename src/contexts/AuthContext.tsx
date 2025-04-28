
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Provider } from '@supabase/supabase-js';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null; user?: User | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for changes on auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      // If this is a new signup event and we have user data
      if (_event === 'SIGNED_IN' && currentUser) {
        try {
          // Check if the user came from Stripe checkout by checking if they have a stripe_users record
          const { data: stripeUserData } = await supabase
            .from('stripe_users')
            .select('email, plan_name')
            .eq('email', currentUser.email)
            .single();
          
          if (stripeUserData) {
            console.log('User signed in after payment, creating app_user record');
            // Call the RPC function to create user record
            const { error: rpcError } = await supabase.rpc('create_user_after_payment', {
              user_id: currentUser.id,
              plan_type: stripeUserData.plan_name || 'starter'
            });
            
            if (rpcError) {
              console.error('Failed to create user record:', rpcError);
            } else {
              console.log('Successfully created user records in app_users and users tables');
            }
          }
        } catch (err) {
          console.error('Error checking for stripe user or creating app_user:', err);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    try {
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
      
      return { error: null, user: data.user };
    } catch (err) {
      console.error("Unexpected signup error:", err);
      return { error: err instanceof Error ? err : new Error('An unexpected error occurred during signup') };
    }
  };

  const signInWithGoogle = async () => {
    // Get the current URL's base
    const baseUrl = window.location.origin;
    
    // Use redirectTo to ensure the auth happens in a full browser context
    const { error } = await supabase.auth.signInWithOAuth({ 
      provider: 'google',
      options: {
        redirectTo: `${baseUrl}/dashboard`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      }
    });
    
    console.log('Google sign-in initiated, redirecting...');
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signInWithGoogle, signOut }}>
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
