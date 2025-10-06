import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UserProfile {
  id: string;
  email: string;
  email_verified: boolean;
}

export const useUserProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, email_verified')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          setProfile(null);
        } else {
          setProfile(data);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user?.id]);

  const getDisplayName = () => {
    if (!profile) return user?.email?.split('@')[0] || 'User';
    // display_name column was dropped, use email
    return user?.email?.split('@')[0] || 'User';
  };

  const updateDisplayName = async (newDisplayName: string) => {
    if (!user?.id) return { error: 'No user' };

    // display_name column was dropped - this function is now a no-op
    console.warn('updateDisplayName: display_name column no longer exists in profiles table');
    return { error: 'Display name feature has been removed' };
  };

  return {
    profile,
    loading,
    displayName: getDisplayName(),
    updateDisplayName,
  };
};
