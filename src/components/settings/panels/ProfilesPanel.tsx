import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, User, Trash2, Calendar, MapPin, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SavedProfile {
  id: string;
  user_id: string;
  profile_name: string;
  name: string;
  birth_date: string;
  birth_time: string;
  birth_location: string;
  birth_latitude?: number;
  birth_longitude?: number;
  birth_place_id?: string;
  timezone?: string;
  house_system?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export const ProfilesPanel = () => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<SavedProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadProfiles();
    }
  }, [user]);

  const loadProfiles = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profile_list')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[ProfilesPanel] Failed to load profiles:', error);
      } else {
        setProfiles(data || []);
      }
    } catch (err) {
      console.error('[ProfilesPanel] Error loading profiles:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (profileId: string) => {
    if (!confirm('Are you sure you want to delete this saved profile?')) {
      return;
    }

    setDeletingId(profileId);
    try {
      const { error } = await supabase
        .from('user_profile_list')
        .delete()
        .eq('id', profileId)
        .eq('user_id', user?.id);

      if (error) {
        console.error('[ProfilesPanel] Failed to delete profile:', error);
        alert('Failed to delete profile');
      } else {
        setProfiles(profiles.filter(p => p.id !== profileId));
      }
    } catch (err) {
      console.error('[ProfilesPanel] Error deleting profile:', err);
      alert('Failed to delete profile');
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-light text-gray-900">Saved Profiles</h3>
          <p className="text-sm text-gray-600 mt-1">
            Quick access to saved birth data for yourself or others
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full"
          disabled
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Profile
        </Button>
      </div>

      {profiles.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
          <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h4 className="text-base font-light text-gray-900 mb-1">No saved profiles yet</h4>
          <p className="text-sm text-gray-600">
            Saved birth data will appear here for quick reuse
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <h4 className="font-medium text-gray-900 truncate">
                      {profile.profile_name}
                    </h4>
                  </div>
                  
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Name:</span>
                      <span>{profile.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3" />
                      <span>{profile.birth_date} at {profile.birth_time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{profile.birth_location}</span>
                    </div>
                  </div>

                  {profile.notes && (
                    <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                      {profile.notes}
                    </p>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full flex-shrink-0"
                  onClick={() => handleDelete(profile.id)}
                  disabled={deletingId === profile.id}
                >
                  {deletingId === profile.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          Saved profiles are automatically created when you submit birth data in forms. 
          They can be reused for quick access.
        </p>
      </div>
    </div>
  );
};

