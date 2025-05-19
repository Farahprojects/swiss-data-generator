
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { checkForAuthRemnants, cleanupAuthState } from '@/utils/authCleanup';
import { supabase } from '@/integrations/supabase/client';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [hasShownToast, setHasShownToast] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const location = useLocation();

  // Check if we're on the password reset route
  const isPasswordResetRoute = location.pathname === '/auth/password';

  // First check for direct session from Supabase
  useEffect(() => {
    console.log("🛡️ AuthGuard: Initial auth check for path:", location.pathname);
    
    async function checkAuth() {
      try {
        // First check for auth remnants
        const hasRemnants = checkForAuthRemnants();
        console.log("🛡️ AuthGuard: Auth remnants detected:", hasRemnants);
        
        // If we have remnants but no user from context, double-check with Supabase
        if (hasRemnants && !user && !loading) {
          console.log("🛡️ AuthGuard: Checking Supabase session directly");
          const { data } = await supabase.auth.getSession();
          
          if (!data.session) {
            console.log("🛡️ AuthGuard: No valid session found, cleaning up remnants");
            cleanupAuthState();
            setIsAuthenticated(false);
          } else {
            console.log("🛡️ AuthGuard: Valid session found from direct check");
            setIsAuthenticated(true);
          }
        } else {
          setIsAuthenticated(!!user);
        }
        
        setIsCheckingAuth(false);
      } catch (error) {
        console.error("🛡️ AuthGuard: Error checking auth:", error);
        setIsCheckingAuth(false);
        setIsAuthenticated(false);
      }
    }
    
    checkAuth();
  }, [user, loading, location.pathname]);

  // Show toast if not authenticated - but only once
  useEffect(() => {
    if (!loading && !isCheckingAuth && !isAuthenticated && !hasShownToast) {
      console.log("🛡️ AuthGuard: Authentication required, showing toast");
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please log in to access this page.",
      });
      setHasShownToast(true);
    }
  }, [loading, isCheckingAuth, isAuthenticated, toast, hasShownToast]);

  console.log(`🛡️ AuthGuard: Current path: ${location.pathname}, isLoading: ${loading || isCheckingAuth}, isAuthenticated: ${isAuthenticated}`);

  if (loading || isCheckingAuth) {
    console.log("🛡️ AuthGuard: Still loading, showing spinner");
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // If on password reset route, we'll always allow the route (no redirect)
  if (isPasswordResetRoute) {
    console.log("🛡️ AuthGuard: On password reset route - bypassing redirect");
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    console.log(`🛡️ AuthGuard: No user found, redirecting to login from ${location.pathname}`);
    // Save current location to redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  console.log("🛡️ AuthGuard: User authenticated, rendering protected content");
  return <>{children}</>;
}
