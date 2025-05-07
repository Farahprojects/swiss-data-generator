
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

  useEffect(() => {
    // If not loading and no user, show toast notification
    if (!loading && !user) {
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
      setLastRoute(location.pathname);
      if (location.search) {
        setLastRouteParams(location.search);
      } else {
        setLastRouteParams('');
      }
    }
  }, [location, user, setLastRoute, setLastRouteParams]);

  if (loading) {
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
    // Save the location they were trying to access
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
