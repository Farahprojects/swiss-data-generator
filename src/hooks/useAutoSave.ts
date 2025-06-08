
import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UseAutoSaveProps {
  customizationData: any;
  selectedTemplate: any;
  website: any;
  onWebsiteUpdate: (website: any) => void;
  debounceMs?: number;
}

export const useAutoSave = ({
  customizationData,
  selectedTemplate,
  website,
  onWebsiteUpdate,
  debounceMs = 2000
}: UseAutoSaveProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const isInitialLoad = useRef(true);

  useEffect(() => {
    // Skip auto-save on initial load
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }

    if (!user) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for auto-save
    timeoutRef.current = setTimeout(async () => {
      try {
        const slug = user.email?.split('@')[0]?.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'coach';
        
        if (website) {
          // Update existing website
          const { error } = await supabase
            .from('coach_websites')
            .update({
              template_id: selectedTemplate?.id || website.template_id,
              customization_data: customizationData
            })
            .eq('id', website.id);

          if (error) throw error;
        } else {
          // Create new website - no longer requires selectedTemplate
          const { data, error } = await supabase
            .from('coach_websites')
            .insert({
              coach_id: user.id,
              template_id: selectedTemplate?.id || null,
              site_slug: slug,
              customization_data: customizationData
            })
            .select()
            .single();

          if (error) throw error;
          onWebsiteUpdate(data);
        }

        console.log('Auto-saved website changes');
      } catch (error: any) {
        console.error('Auto-save failed:', error);
        // Don't show toast for auto-save failures to avoid spamming user
      }
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [customizationData, selectedTemplate, user, website]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
};
