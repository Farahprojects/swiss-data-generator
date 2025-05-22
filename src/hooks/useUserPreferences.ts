
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logToSupabase } from "@/utils/batchedLogManager";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export interface UserPreferences {
  id: string;
  user_id: string;
  email_notifications_enabled: boolean;
  password_change_notifications: boolean;
  email_change_notifications: boolean;
  security_alert_notifications: boolean;
  created_at: string;
  updated_at: string;
}

export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Load initial preferences and set up real-time listener
  useEffect(() => {
    let loadTimeout: NodeJS.Timeout;
    let channel: any;

    const loadUserPreferences = async () => {
      if (!user?.id) {
        setLoading(false);
        setError("Authentication required");
        return;
      }

      try {
        // Set a timeout to prevent infinite loading state
        loadTimeout = setTimeout(() => {
          if (loading) {
            setLoading(false);
            setError("Request timed out. Please try again.");
            logToSupabase("Loading user preferences timed out", {
              level: 'error',
              page: 'useUserPreferences',
            });
          }
        }, 10000); // 10-second timeout

        // Get user preferences from database
        const { data, error } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') { // Not Found error
            await createDefaultPreferences(user.id);
          } else {
            throw error;
          }
        } else if (data) {
          setPreferences(data as UserPreferences);
          
          logToSupabase("User preferences loaded successfully", {
            level: 'info',
            page: 'useUserPreferences',
          });
        }
      } catch (err: any) {
        setError(err.message || "Failed to load preferences");
        logToSupabase("Error loading user preferences", {
          level: 'error',
          page: 'useUserPreferences',
          data: { error: err.message || String(err) }
        });
        
        toast({
          title: "Error Loading Preferences",
          description: "There was a problem loading your notification settings",
          variant: "destructive"
        });
      } finally {
        clearTimeout(loadTimeout);
        setLoading(false);
      }
    };

    // Set up real-time listeners for this user's preferences
    const setupRealtimeListener = () => {
      if (!user?.id) return;

      try {
        // Subscribe to realtime changes
        channel = supabase
          .channel('user_preferences_changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'user_preferences',
              filter: `user_id=eq.${user.id}`
            },
            (payload) => {
              logToSupabase("Received real-time update for user preferences", {
                level: 'debug',
                page: 'useUserPreferences',
                data: { event: payload.eventType }
              });

              // Update local state based on the database change
              if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
                setPreferences(payload.new as UserPreferences);
              } else if (payload.eventType === 'DELETE') {
                setPreferences(null);
              }
            }
          )
          .subscribe((status) => {
            if (status !== 'SUBSCRIBED') {
              logToSupabase("Failed to subscribe to real-time updates", {
                level: 'error',
                page: 'useUserPreferences',
                data: { status }
              });
            } else {
              logToSupabase("Subscribed to real-time user preference updates", {
                level: 'debug',
                page: 'useUserPreferences'
              });
            }
          });
      } catch (err: any) {
        logToSupabase("Error setting up real-time listener", {
          level: 'error',
          page: 'useUserPreferences',
          data: { error: err.message || String(err) }
        });
      }
    };

    // Load preferences and set up real-time
    loadUserPreferences();
    setupRealtimeListener();

    // Clean up
    return () => {
      clearTimeout(loadTimeout);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user, toast]);

  // Create default preferences if none exist
  const createDefaultPreferences = async (userId: string) => {
    try {
      const defaultPrefs = {
        user_id: userId,
        email_notifications_enabled: true,
        password_change_notifications: true,
        email_change_notifications: true,
        security_alert_notifications: true
      };
      
      const { data, error } = await supabase
        .from('user_preferences')
        .insert(defaultPrefs)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      setPreferences(data as UserPreferences);
      
      logToSupabase("Created default user preferences", {
        level: 'info',
        page: 'useUserPreferences'
      });
    } catch (err: any) {
      logToSupabase("Failed to create default preferences", {
        level: 'error',
        page: 'useUserPreferences',
        data: { error: err.message || String(err) }
      });
    }
  };

  // Update main notification toggle
  const updateMainNotificationsToggle = async (enabled: boolean) => {
    if (saving || !user?.id || !preferences) return false;
    setSaving(true);

    try {
      // Optimistically update the local state
      setPreferences(prev => prev ? {
        ...prev,
        email_notifications_enabled: enabled
      } : null);

      // Save to database
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          email_notifications_enabled: enabled,
          password_change_notifications: preferences.password_change_notifications,
          email_change_notifications: preferences.email_change_notifications,
          security_alert_notifications: preferences.security_alert_notifications,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });
      
      if (error) throw error;
      
      logToSupabase("Main notification preferences saved", {
        level: 'info',
        page: 'useUserPreferences',
        data: { enabled }
      });
      
      toast({
        title: "Preferences Saved",
        description: `Email notifications ${enabled ? 'enabled' : 'disabled'}`
      });
      
      return true;
    } catch (err: any) {
      // Revert the optimistic update on error
      setPreferences(prev => prev ? {
        ...prev,
        email_notifications_enabled: !enabled
      } : null);
      
      logToSupabase("Error updating main notification toggle", {
        level: 'error',
        page: 'useUserPreferences',
        data: { error: err.message || String(err) }
      });
      
      toast({
        title: "Error",
        description: "Failed to save notification preferences",
        variant: "destructive"
      });
      
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Update individual notification toggle
  const updateNotificationToggle = async (
    type: keyof Omit<UserPreferences, 'id' | 'user_id' | 'email_notifications_enabled' | 'created_at' | 'updated_at'>,
    enabled: boolean
  ) => {
    if (saving || !user?.id || !preferences || !preferences.email_notifications_enabled) return false;
    setSaving(true);
    
    try {
      // Optimistically update the local state
      setPreferences(prev => prev ? {
        ...prev,
        [type]: enabled
      } : null);

      // Save to database
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          email_notifications_enabled: preferences.email_notifications_enabled,
          password_change_notifications: type === 'password_change_notifications' 
            ? enabled : preferences.password_change_notifications,
          email_change_notifications: type === 'email_change_notifications' 
            ? enabled : preferences.email_change_notifications,
          security_alert_notifications: type === 'security_alert_notifications' 
            ? enabled : preferences.security_alert_notifications,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });
      
      if (error) throw error;
      
      logToSupabase(`${type} notification preference saved`, {
        level: 'info',
        page: 'useUserPreferences',
        data: { type, enabled }
      });
      
      toast({
        title: "Preference Saved",
        description: `${formatNotificationTypeName(type)} ${enabled ? 'enabled' : 'disabled'}`
      });
      
      return true;
    } catch (err: any) {
      // Revert the optimistic update on error
      setPreferences(prev => prev ? {
        ...prev,
        [type]: !enabled
      } : null);
      
      logToSupabase(`Error saving ${type} notification preference`, {
        level: 'error',
        page: 'useUserPreferences',
        data: { type, error: err.message || String(err) }
      });
      
      toast({
        title: "Error",
        description: "Failed to save notification preference",
        variant: "destructive"
      });
      
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Helper to format notification type names for display
  const formatNotificationTypeName = (type: string): string => {
    switch(type) {
      case 'password_change_notifications':
        return 'Password change notifications';
      case 'email_change_notifications':
        return 'Email change notifications';
      case 'security_alert_notifications':
        return 'Security alert notifications';
      default:
        return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }
  };

  return {
    preferences,
    loading,
    saving,
    error,
    updateMainNotificationsToggle,
    updateNotificationToggle,
    formatNotificationTypeName
  };
}
