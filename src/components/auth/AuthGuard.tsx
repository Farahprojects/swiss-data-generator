import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { UserData } from '@/types/subscription';

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
        
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, status, api_key')
          .eq('id', user.id)
          .maybeSingle();

        if (userError) {
          console.error("Error checking user status:", userError);
          throw userError;
        }

        console.log("User data:", userData);

        const hasValidAccess = Boolean(userData?.status === 'active' && userData?.api_key);
        
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
