
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { profileService, UserProfile } from '@/services/profileService';
import { log } from '@/utils/logUtils';

interface UseProfileResult {
  profile: UserProfile | null;
  isLoading: boolean;
  isVerified: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
}

export const useProfile = (): UseProfileResult => {
  const { user, session } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshProfile = async () => {
    if (!user || !session) {
      setProfile(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const userProfile = await profileService.initializeProfile();
      setProfile(userProfile);
      log('debug', 'Profile refreshed', { hasProfile: !!userProfile }, 'useProfile');
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to load profile';
      setError(errorMessage);
      log('error', 'Profile refresh failed', err, 'useProfile');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && session) {
      refreshProfile();
    } else {
      setProfile(null);
      setError(null);
    }
  }, [user, session]);

  const isVerified = profile?.email_verified || false;

  return {
    profile,
    isLoading,
    isVerified,
    error,
    refreshProfile
  };
};
