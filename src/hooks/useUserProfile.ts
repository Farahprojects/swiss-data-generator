import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
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
          .select('id, email, display_name, email_verified')
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
    return profile.display_name || user?.email?.split('@')[0] || 'User';
  };

  const updateDisplayName = async (newDisplayName: string) => {
    if (!user?.id) return { error: 'No user' };

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: newDisplayName })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating display name:', error);
        return { error };
      }

      // Update local state
      setProfile(prev => prev ? { ...prev, display_name: newDisplayName } : null);
      return { error: null };
    } catch (err) {
      console.error('Error updating display name:', err);
      return { error: err };
    }
  };

  return {
    profile,
    loading,
    displayName: getDisplayName(),
    updateDisplayName,
  };
};
