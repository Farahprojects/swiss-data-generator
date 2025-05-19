
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
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
  const [searchParams] = useSearchParams();
  
  // Extract token and type from URL for password reset detection
  const token = searchParams.get('token');
  const type = searchParams.get('type');
  
  // Check if we're on the password reset route or have reset token parameters
  const isPasswordResetRoute = location.pathname.includes('/auth/password');
  const hasPasswordResetParams = token && type === 'recovery';
  const passwordResetRequired = localStorage.getItem('password_reset_required') === 'true';
  
  // Combine conditions to determine if this is a password reset case
  const isPasswordResetCase = isPasswordResetRoute || hasPasswordResetParams || passwordResetRequired;
  
  console.log(`🛡️ AuthGuard: Checking route ${location.pathname}, isPasswordResetRoute: ${isPasswordResetRoute}, hasPasswordResetParams: ${hasPasswordResetParams}, passwordResetRequired: ${passwordResetRequired}`);

  // First check for direct session from Supabase
  useEffect(() => {
    console.log("🛡️ AuthGuard: Initial auth check for path:", location.pathname);
    
    async function checkAuth() {
      try {
        // Always bypass auth check for password reset routes
        if (isPasswordResetCase) {
          console.log("🛡️ AuthGuard: Bypassing auth check for password reset case");
          setIsCheckingAuth(false);
          return;
        }
        
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
  }, [user, loading, location.pathname, isPasswordResetCase]);

  // Show toast if not authenticated - but only once
  useEffect(() => {
    if (!loading && !isCheckingAuth && !isAuthenticated && !hasShownToast && !isPasswordResetCase) {
      console.log("🛡️ AuthGuard: Authentication required, showing toast");
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please log in to access this page.",
      });
      setHasShownToast(true);
    }
  }, [loading, isCheckingAuth, isAuthenticated, toast, hasShownToast, isPasswordResetCase]);

  console.log(`🛡️ AuthGuard: Current path: ${location.pathname}, isLoading: ${loading || isCheckingAuth}, isAuthenticated: ${isAuthenticated}, isPasswordResetCase: ${isPasswordResetCase}`);

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

  // If on password reset route or has params, we'll always allow the route (no redirect)
  if (isPasswordResetCase) {
    console.log("🛡️ AuthGuard: Password reset case detected - bypassing redirect");
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
