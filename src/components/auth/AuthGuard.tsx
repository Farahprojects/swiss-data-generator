
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useNavigationState } from '@/contexts/NavigationStateContext';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { toast } = useToast();
  const { setLastRoute, setLastRouteParams } = useNavigationState();

  // Log authentication status for debugging
  useEffect(() => {
    console.log('AuthGuard: User status:', user ? 'authenticated' : 'not authenticated');
    console.log('AuthGuard: Loading status:', loading ? 'loading' : 'not loading');
    console.log('AuthGuard: Current location:', location.pathname);
  }, [user, loading, location]);

  useEffect(() => {
    // If not loading and no user, show toast notification
    if (!loading && !user) {
      console.log('AuthGuard: Authentication required, showing toast');
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please log in to access this page.",
      });
    }
  }, [loading, user, toast]);

  // Save the current route for future redirects if user is authenticated
  useEffect(() => {
    if (user) {
      console.log('AuthGuard: Saving current route for authenticated user:', location.pathname);
      setLastRoute(location.pathname);
      if (location.search) {
        setLastRouteParams(location.search);
      } else {
        setLastRouteParams('');
      }
    }
  }, [location, user, setLastRoute, setLastRouteParams]);

  if (loading) {
    console.log('AuthGuard: Authentication loading...');
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
    console.log('AuthGuard: No user found, redirecting to login');
    // Save the location they were trying to access
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  console.log('AuthGuard: User authenticated, rendering protected content');
  return <>{children}</>;
}
