import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ProfileData {
  name: string;
  birthDate: string;
  birthTime: string;
  birthLocation: string;
  birthLatitude?: number;
  birthLongitude?: number;
  birthPlaceId?: string;
  profileName?: string;
}

export const useProfileSaver = () => {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  const saveProfile = async (data: ProfileData): Promise<boolean> => {
    if (!user) {
      toast.error('Please sign in to save profiles');
      return false;
    }

    // Validate required fields
    if (!data.name || !data.birthDate || !data.birthTime || !data.birthLocation) {
      toast.error('Please fill in all required fields before saving');
      return false;
    }

    if (!data.birthLatitude || !data.birthLongitude) {
      toast.error('Please select a valid location from the dropdown');
      return false;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('user_profile_list')
        .insert({
          user_id: user.id,
          profile_name: data.profileName?.trim() || data.name,
          name: data.name,
          birth_date: data.birthDate,
          birth_time: data.birthTime,
          birth_location: data.birthLocation,
          birth_latitude: data.birthLatitude,
          birth_longitude: data.birthLongitude,
          birth_place_id: data.birthPlaceId || null,
        });

      if (error) {
        console.error('[useProfileSaver] Failed to save profile:', error);
        toast.error('Failed to save profile');
        return false;
      }

      toast.success('Profile saved successfully');
      return true;
    } catch (err) {
      console.error('[useProfileSaver] Error saving profile:', err);
      toast.error('Failed to save profile');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return { saveProfile, isSaving };
};

