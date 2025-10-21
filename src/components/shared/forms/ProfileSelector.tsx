import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SavedProfile {
  id: string;
  profile_name: string;
  name: string;
  birth_date: string;
  birth_time: string;
  birth_location: string;
  birth_latitude?: number;
  birth_longitude?: number;
  birth_place_id?: string;
}

interface ProfileSelectorProps {
  onProfileSelect: (profile: SavedProfile) => void;
  currentValue?: string;
}

export const ProfileSelector: React.FC<ProfileSelectorProps> = ({
  onProfileSelect,
  currentValue = '',
}) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [profiles, setProfiles] = useState<SavedProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user && open) {
      loadProfiles();
    }
  }, [user, open]);

  const loadProfiles = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profile_list')
        .select('id, profile_name, name, birth_date, birth_time, birth_location, birth_latitude, birth_longitude, birth_place_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[ProfileSelector] Failed to load profiles:', error);
      } else {
        setProfiles(data || []);
      }
    } catch (err) {
      console.error('[ProfileSelector] Error loading profiles:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (profile: SavedProfile) => {
    onProfileSelect(profile);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-12 rounded-full border-gray-200 font-light text-base text-gray-600 hover:text-gray-900 hover:bg-gray-50 mt-1"
        >
          {currentValue ? currentValue : "Load saved profile..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandEmpty>
            {isLoading ? 'Loading profiles...' : 'No saved profiles found.'}
          </CommandEmpty>
          <CommandGroup className="max-h-[300px] overflow-auto">
            {profiles.map((profile) => (
              <CommandItem
                key={profile.id}
                value={profile.profile_name}
                onSelect={() => handleSelect(profile)}
                className="cursor-pointer"
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    currentValue === profile.name ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{profile.profile_name}</div>
                  <div className="text-xs text-gray-500 truncate">
                    {profile.birth_date} • {profile.birth_location}
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

