import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type ProfileState = {
  hasProfileSetup: boolean | null; // null = unknown/loading
  profileId: string | null;
  setProfileSetupCompleted: (profileId?: string) => void;
  refresh: (opts?: { force?: boolean }) => Promise<void>;
};

const ProfileContext = createContext<ProfileState | undefined>(undefined);

const STORAGE_KEY = 'profile_state_v1';

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [hasProfileSetup, setHasProfileSetup] = useState<boolean | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  // Load from storage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setHasProfileSetup(parsed.hasProfileSetup ?? null);
        setProfileId(parsed.profileId ?? null);
      }
    } catch {}
  }, []);

  // Persist to storage
  useEffect(() => {
    const payload = JSON.stringify({ hasProfileSetup, profileId });
    localStorage.setItem(STORAGE_KEY, payload);
  }, [hasProfileSetup, profileId]);

  const refresh = useCallback(async (opts?: { force?: boolean }) => {
    if (!user?.id) {
      setHasProfileSetup(null);
      setProfileId(null);
      return;
    }
    // Check local/state first unless forced
    if (!opts?.force && hasProfileSetup !== null && profileId) {
      return; // trust cached values
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('id, has_profile_setup')
      .eq('id', user.id)
      .single();
    if (!error && data) {
      setHasProfileSetup(!!data.has_profile_setup);
      setProfileId(data.id);
    } else if (!error && !data) {
      // No row yet: treat as not set up
      setHasProfileSetup(false);
      setProfileId(user.id);
    }
  }, [user?.id, hasProfileSetup, profileId]);

  useEffect(() => {
    // When user changes, refresh from DB
    refresh();
  }, [refresh]);

  const setProfileSetupCompleted = useCallback((pid?: string) => {
    setHasProfileSetup(true);
    if (pid) setProfileId(pid);
  }, []);

  const value = useMemo<ProfileState>(() => ({
    hasProfileSetup,
    profileId,
    setProfileSetupCompleted,
    refresh,
  }), [hasProfileSetup, profileId, setProfileSetupCompleted, refresh]);

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
};

export const useProfileState = (): ProfileState => {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfileState must be used within ProfileProvider');
  return ctx;
};


