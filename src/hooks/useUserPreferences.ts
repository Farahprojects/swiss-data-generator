
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logToSupabase } from "@/utils/batchedLogManager";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { debounce } from "@/lib/utils";

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

interface UpdateOptions {
  showToast?: boolean;
}

export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Use a ref to track if component is mounted to avoid state updates after unmount
  const isMounted = useCallback(() => {
    return true; // This will be replaced with a ref in a full implementation
  }, []);

  // Load initial preferences and set up real-time listener
  useEffect(() => {
    let loadTimeout: NodeJS.Timeout;
    let channel: any;

    const loadUserPreferences = async () => {
      if (!user?.id) {
        if (isMounted()) {
          setLoading(false);
          setError("Authentication required");
        }
        return;
      }

      try {
        // Set a shorter timeout to prevent long waiting
        loadTimeout = setTimeout(() => {
          if (loading && isMounted()) {
            setLoading(false);
            setError("Request timed out. Please try again.");
            logToSupabase("Loading user preferences timed out", {
              level: 'error',
              page: 'useUserPreferences',
            });
          }
        }, 8000); // 8-second timeout, reduced from 10 seconds

        // Get user preferences from database
        const { data, error: fetchError } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', user.id)
          .single();

        // Clear the timeout as we got a response
        clearTimeout(loadTimeout);

        if (fetchError) {
          if (fetchError.code === 'PGRST116') { // Not Found error
            await createDefaultPreferences(user.id);
          } else {
            throw fetchError;
          }
        } else if (data && isMounted()) {
          setPreferences(data as UserPreferences);
          
          logToSupabase("User preferences loaded successfully", {
            level: 'info',
            page: 'useUserPreferences',
          });
        }
      } catch (err: any) {
        clearTimeout(loadTimeout);
        
        if (isMounted()) {
          const errorMessage = err.message || "Failed to load preferences";
          setError(errorMessage);
          
          logToSupabase("Error loading user preferences", {
            level: 'error',
            page: 'useUserPreferences',
            data: { error: errorMessage || String(err) }
          });
          
          // Only show toast for non-timeout errors
          if (!errorMessage.includes("timed out")) {
            toast({
              title: "Error Loading Preferences",
              description: "There was a problem loading your notification settings",
              variant: "destructive"
            });
          }
          
          // Implement retry logic - max 3 retries, with increasing delay
          if (retryCount < 3 && isMounted()) {
            const retryDelay = Math.min(2000 * (retryCount + 1), 6000);
            setTimeout(() => {
              setRetryCount(prev => prev + 1);
              loadUserPreferences();
            }, retryDelay);
          }
        }
      } finally {
        if (isMounted()) {
          setLoading(false);
        }
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

              // Only update if the change didn't come from this client to avoid UI bouncing
              if (!saving && isMounted()) {
                // Update local state based on the database change
                if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
                  setPreferences(payload.new as UserPreferences);
                } else if (payload.eventType === 'DELETE') {
                  setPreferences(null);
                }
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
  }, [user, toast, isMounted, retryCount]);

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
      
      if (isMounted()) {
        setPreferences(data as UserPreferences);
      }
      
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

  // Debounced update function to prevent rapid consecutive updates
  const debouncedUpdate = useCallback(
    debounce(async (
      updateFn: Function, 
      onSuccess: () => void, 
      onError: (error: any) => void
    ) => {
      try {
        const result = await updateFn();
        if (result.error) throw result.error;
        onSuccess();
      } catch (err) {
        onError(err);
      }
    }, 300),
    []
  );

  // Update main notification toggle with improved UI feedback
  const updateMainNotificationsToggle = async (enabled: boolean, options: UpdateOptions = {}) => {
    if (!user?.id || !preferences) return false;
    
    const { showToast = true } = options;
    
    // Set saving state for UI feedback
    setSaving(true);
    setError(null);
    
    // Optimistically update the local state for immediate UI feedback
    setPreferences(prev => prev ? {
      ...prev,
      email_notifications_enabled: enabled
    } : null);

    const updateOperation = async () => {
      return await supabase
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
    };

    try {
      await debouncedUpdate(
        updateOperation,
        () => {
          // Success handler
          logToSupabase("Main notification preferences saved", {
            level: 'info',
            page: 'useUserPreferences',
            data: { enabled }
          });
          
          if (showToast) {
            toast({
              title: "Preferences Saved",
              description: `Email notifications ${enabled ? 'enabled' : 'disabled'}`
            });
          }
        },
        (err: any) => {
          // Error handler
          // Revert the optimistic update on error
          setPreferences(prev => prev ? {
            ...prev,
            email_notifications_enabled: !enabled
          } : null);
          
          const errorMsg = err.message || "Failed to save notification preferences";
          setError(errorMsg);
          
          logToSupabase("Error updating main notification toggle", {
            level: 'error',
            page: 'useUserPreferences',
            data: { error: errorMsg }
          });
          
          if (showToast) {
            toast({
              title: "Error",
              description: "Failed to save notification preferences",
              variant: "destructive"
            });
          }
        }
      );
      
      return true;
    } finally {
      // Always reset saving state after operation completes
      setTimeout(() => {
        setSaving(false);
      }, 500); // Short delay to prevent UI flicker
    }
  };

  // Update individual notification toggle with improved error handling
  const updateNotificationToggle = async (
    type: keyof Omit<UserPreferences, 'id' | 'user_id' | 'email_notifications_enabled' | 'created_at' | 'updated_at'>,
    enabled: boolean,
    options: UpdateOptions = {}
  ) => {
    if (!user?.id || !preferences || !preferences.email_notifications_enabled) return false;
    const { showToast = true } = options;
    
    // Set saving state for UI feedback
    setSaving(true);
    setError(null);
    
    // Optimistically update the local state
    setPreferences(prev => prev ? {
      ...prev,
      [type]: enabled
    } : null);

    const updateOperation = async () => {
      return await supabase
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
    };
    
    try {
      await debouncedUpdate(
        updateOperation,
        () => {
          // Success handler
          logToSupabase(`${type} notification preference saved`, {
            level: 'info',
            page: 'useUserPreferences',
            data: { type, enabled }
          });
          
          if (showToast) {
            toast({
              title: "Preference Saved",
              description: `${formatNotificationTypeName(type)} ${enabled ? 'enabled' : 'disabled'}`
            });
          }
        },
        (err: any) => {
          // Error handler
          // Revert the optimistic update on error
          setPreferences(prev => prev ? {
            ...prev,
            [type]: !enabled
          } : null);
          
          const errorMsg = err.message || "Failed to save notification preference";
          setError(errorMsg);
          
          logToSupabase(`Error saving ${type} notification preference`, {
            level: 'error',
            page: 'useUserPreferences',
            data: { type, error: errorMsg }
          });
          
          if (showToast) {
            toast({
              title: "Error",
              description: "Failed to save notification preference",
              variant: "destructive"
            });
          }
        }
      );
      
      return true;
    } finally {
      // Always reset saving state after operation completes
      setTimeout(() => {
        setSaving(false);
      }, 500); // Short delay to prevent UI flicker
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
