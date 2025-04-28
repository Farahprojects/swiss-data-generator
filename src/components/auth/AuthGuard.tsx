
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { toast } = useToast();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [checkingAccess, setCheckingAccess] = useState(true);

  useEffect(() => {
    const checkUserAccess = async () => {
      if (!user) {
        setHasAccess(false);
        setCheckingAccess(false);
        return;
      }

      try {
        console.log("Checking user access for:", user.id);
        
        // Check if user has records in both users and app_users tables
        const [{ data: userData, error: userError }, { data: appUserData, error: appUserError }] = await Promise.all([
          supabase
            .from('users')
            .select('id, status, plan_type')
            .eq('id', user.id)
            .maybeSingle(),
          supabase
            .from('app_users')
            .select('id, api_key')
            .eq('id', user.id)
            .maybeSingle()
        ]);

        if (userError) {
          console.error("Error checking user status:", userError);
          throw userError;
        }
        if (appUserError) {
          console.error("Error checking app user status:", appUserError);
          throw appUserError;
        }

        console.log("User data:", userData);
        console.log("App user data:", appUserData);

        const hasValidAccess = userData?.status === 'active' && appUserData?.api_key;
        
        if (!hasValidAccess && location.pathname !== '/pricing') {
          toast({
            title: "Subscription Required",
            description: "Please subscribe to access this feature",
            variant: "destructive",
          });
        }

        setHasAccess(hasValidAccess);
      } catch (err) {
        console.error("Unexpected error checking access:", err);
        toast({
          title: "Error",
          description: "There was a problem verifying your access. Please try again.",
          variant: "destructive",
        });
        setHasAccess(false);
      } finally {
        setCheckingAccess(false);
      }
    };

    checkUserAccess();
  }, [user, location.pathname, toast]);

  if (loading || checkingAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-gray-500">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!hasAccess && location.pathname !== '/pricing') {
    return <Navigate to="/pricing" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
