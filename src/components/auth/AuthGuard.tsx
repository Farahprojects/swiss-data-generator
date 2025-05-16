
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { checkForAuthRemnants } from '@/utils/authCleanup';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [hasShownToast, setHasShownToast] = useState(false);
  const location = useLocation();

  // Check for auth remnants on mount
  useEffect(() => {
    console.log("🛡️ AuthGuard: Mounting for path:", location.pathname);
    const hasRemnants = checkForAuthRemnants();
    console.log("🛡️ AuthGuard: Auth remnants detected on mount:", hasRemnants);
    
    return () => {
      console.log("🛡️ AuthGuard: Unmounting from path:", location.pathname);
    };
  }, [location.pathname]);

  // Show toast if not authenticated - but only once
  useEffect(() => {
    if (!loading && !user && !hasShownToast) {
      console.log("🛡️ AuthGuard: Authentication required, showing toast");
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please log in to access this page.",
      });
      setHasShownToast(true);
    }
  }, [loading, user, toast, hasShownToast]);

  console.log(`🛡️ AuthGuard: Current path: ${location.pathname}, isLoading: ${loading}, isAuthenticated: ${!!user}`);

  if (loading) {
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

  if (!user) {
    console.log(`🛡️ AuthGuard: No user found, redirecting to login from ${location.pathname}`);
    // Save current location to redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  console.log("🛡️ AuthGuard: User authenticated, rendering protected content");
  return <>{children}</>;
}
