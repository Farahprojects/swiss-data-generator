
import React, { createContext, useContext } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { UserProfile } from '@/services/profileService';

interface ProfileContextType {
  profile: UserProfile | null;
  isLoading: boolean;
  isVerified: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  hasFeature: (featureName: string) => boolean;
  hasSubscriptionPlan: (planName: string) => boolean;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider = ({ children }: { children: React.ReactNode }) => {
  const profileData = useProfile();

  const hasFeature = (featureName: string): boolean => {
    if (!profileData.profile?.features) return false;
    return !!profileData.profile.features[featureName];
  };

  const hasSubscriptionPlan = (planName: string): boolean => {
    return profileData.profile?.subscription_plan === planName;
  };

  return (
    <ProfileContext.Provider value={{
      ...profileData,
      hasFeature,
      hasSubscriptionPlan
    }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfileContext = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfileContext must be used within a ProfileProvider');
  }
  return context;
};
