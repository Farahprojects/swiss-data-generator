
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [hasSubscription, setHasSubscription] = useState<boolean | null>(null);
  const [checkingSubscription, setCheckingSubscription] = useState(true);

  useEffect(() => {
    const checkUserData = async () => {
      if (!user) {
        setCheckingSubscription(false);
        return;
      }

      try {
        // Check if user has an API key (indicating they've completed payment)
        const { data, error } = await supabase
          .from('api_keys')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error("Error checking user subscription:", error);
          setHasSubscription(false);
        } else {
          setHasSubscription(!!data);
        }
      } catch (err) {
        console.error("Unexpected error checking subscription:", err);
        setHasSubscription(false);
      } finally {
        setCheckingSubscription(false);
      }
    };

    checkUserData();
  }, [user]);

  if (loading || checkingSubscription) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user && hasSubscription === false && location.pathname !== '/pricing') {
    return <Navigate to="/pricing" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
