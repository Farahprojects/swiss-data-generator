import { useState, useEffect, useCallback, useRef } from "react";
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

export type NotificationToggleType =
  | "password_change_notifications"
  | "email_change_notifications"
  | "security_alert_notifications";

interface UpdateOptions {
  showToast?: boolean;
}

export function useUserPreferences() {
  // State management
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // Context and refs
  const { toast } = useToast();
  const { user } = useAuth();
  const pendingUpdates = useRef<Record<string, any>>({});
  
  // Flag to track component mount status
  const isMounted = useRef(true);

  // Initial data loading
  useEffect(() => {
    let loadTimeout: NodeJS.Timeout;
    let channel: any;

    const loadUserPreferences = async () => {
      if (!user?.id || !isMounted.current) {
        return;
      }

      try {
        loadTimeout = setTimeout(() => {
          if (loading && isMounted.current) {
            setLoading(false);
            setError("Request timed out. Please try again.");
            logToSupabase("Loading user preferences timed out", {
              level: "error",
              page: "useUserPreferences",
            });
          }
        }, 8000);

        const { data, error: fetchError } = await supabase
          .from("user_preferences")
          .select("*")
          .eq("user_id", user.id)
          .single();

        clearTimeout(loadTimeout);

        if (fetchError) {
          if (fetchError.code === "PGRST116") {
            await createDefaultPreferences(user.id);
          } else {
            throw fetchError;
          }
        } else if (data && isMounted.current) {
          // Only update non-pending fields
          setPreferences((prev) => {
            if (!prev) return data as UserPreferences;
            
            // Create a copy of the incoming data
            const updatedData = { ...data } as UserPreferences;
            
            // For each pending update, keep our optimistic value
            Object.keys(pendingUpdates.current).forEach(key => {
              (updatedData as any)[key] = (prev as any)[key];
            });
            
            return updatedData;
          });
          
          logToSupabase("User preferences loaded successfully", {
            level: "info",
            page: "useUserPreferences",
          });
        }
      } catch (err: any) {
        clearTimeout(loadTimeout);
        const errorMessage = err.message || "Failed to load preferences";

        if (isMounted.current) {
          setError(errorMessage);
          logToSupabase("Error loading user preferences", {
            level: "error",
            page: "useUserPreferences",
            data: { error: errorMessage },
          });

          if (!errorMessage.includes("timed out")) {
            toast({
              title: "Error Loading Preferences",
              description:
                "There was a problem loading your notification settings",
              variant: "destructive",
            });
          }

          if (retryCount < 3) {
            const retryDelay = Math.min(2000 * (retryCount + 1), 6000);
            setTimeout(() => {
              setRetryCount((prev) => prev + 1);
              loadUserPreferences();
            }, retryDelay);
          }
        }
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    };

    const setupRealtimeListener = () => {
      if (!user?.id) return;

      try {
        // Listen for changes, but ignore our own changes
        channel = supabase
          .channel("user_preferences_changes")
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "user_preferences",
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              // Only process server updates if not in the middle of optimistic update
              const incomingData = payload.new as UserPreferences;
              const pendingKeys = Object.keys(pendingUpdates.current);
              
              // Log real-time update for debugging
              logToSupabase("Received real-time update for user preferences", {
                level: "debug",
                page: "useUserPreferences",
                data: { 
                  event: payload.eventType,
                  hasPendingUpdates: pendingKeys.length > 0
                },
              });
              
              // If no pending updates, or if changes to fields we're not updating
              if (pendingKeys.length === 0) {
                if (isMounted.current && (payload.eventType === "UPDATE" || payload.eventType === "INSERT")) {
                  setPreferences(incomingData);
                } else if (isMounted.current && payload.eventType === "DELETE") {
                  setPreferences(null);
                }
              }
            }
          )
          .subscribe((status) => {
            if (status !== "SUBSCRIBED") {
              logToSupabase("Failed to subscribe to real-time updates", {
                level: "error",
                page: "useUserPreferences",
                data: { status },
              });
            }
          });
      } catch (err: any) {
        logToSupabase("Error setting up real-time listener", {
          level: "error",
          page: "useUserPreferences",
          data: { error: err.message || String(err) },
        });
      }
    };

    loadUserPreferences();
    setupRealtimeListener();

    return () => {
      isMounted.current = false;
      clearTimeout(loadTimeout);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user, toast, retryCount]);

  // Create default preferences if none exist
  const createDefaultPreferences = async (userId: string) => {
    try {
      const defaultPrefs = {
        user_id: userId,
        email_notifications_enabled: true,
        password_change_notifications: true,
        email_change_notifications: true,
        security_alert_notifications: true,
      };

      const { data, error } = await supabase
        .from("user_preferences")
        .insert(defaultPrefs)
        .select()
        .single();

      if (error) throw error;
      if (isMounted.current) setPreferences(data as UserPreferences);

      logToSupabase("Created default user preferences", {
        level: "info",
        page: "useUserPreferences",
      });
    } catch (err: any) {
      logToSupabase("Failed to create default preferences", {
        level: "error",
        page: "useUserPreferences",
        data: { error: err.message || String(err) },
      });
    }
  };

  // Optimistic update for main notifications toggle
  const updateMainNotificationsToggle = async (
    enabled: boolean,
    options: UpdateOptions = {}
  ) => {
    if (!user?.id || !preferences) return false;

    const { showToast = true } = options;
    const fieldName = "email_notifications_enabled";
    
    // Track this update as pending
    pendingUpdates.current[fieldName] = enabled;
    
    // Optimistically update UI immediately
    setPreferences((prev) =>
      prev
        ? {
            ...prev,
            email_notifications_enabled: enabled,
          }
        : null
    );

    setSaving(true);
    setError(null);

    try {
      const { error } = await supabase.from("user_preferences").upsert(
        {
          user_id: user.id,
          email_notifications_enabled: enabled,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

      if (error) throw error;

      if (showToast) {
        toast({
          title: "Preferences Saved",
          description: `Email notifications ${
            enabled ? "enabled" : "disabled"
          }`,
        });
      }

      logToSupabase("Main notification toggle updated", {
        level: "info",
        page: "useUserPreferences",
        data: { enabled }
      });
      
      return true;
    } catch (err: any) {
      console.error("Error updating main toggle:", err);
      
      // Revert optimistic update on error
      setPreferences((prev) =>
        prev
          ? {
              ...prev,
              email_notifications_enabled: !enabled,
            }
          : null
      );
      
      if (showToast) {
        toast({
          title: "Error",
          description: "There was an issue saving your preference.",
          variant: "destructive",
        });
      }
      
      logToSupabase("Error updating main notification toggle", {
        level: "error",
        page: "useUserPreferences",
        data: { error: err.message || String(err) }
      });
      
      return false;
    } finally {
      // Remove from pending updates
      delete pendingUpdates.current[fieldName];
      
      if (isMounted.current) {
        setSaving(false);
      }
    }
  };

  // Optimistic update for individual notification toggles
  const updateNotificationToggle = async (
    type: NotificationToggleType,
    enabled: boolean,
    options: UpdateOptions = {}
  ) => {
    if (!user?.id || !preferences || !preferences.email_notifications_enabled)
      return false;

    const { showToast = true } = options;
    
    // Track this update as pending
    pendingUpdates.current[type] = enabled;

    // Optimistically update UI immediately
    setPreferences((prev) =>
      prev
        ? {
            ...prev,
            [type]: enabled,
          }
        : null
    );

    setSaving(true);
    setError(null);

    try {
      // Create update object with just the changed field
      const updateData: Record<string, any> = {
        user_id: user.id,
        [type]: enabled,
        updated_at: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from("user_preferences")
        .update(updateData)
        .eq("user_id", user.id);

      if (error) throw error;

      if (showToast) {
        toast({
          title: "Preference Saved",
          description: `${formatNotificationTypeName(type)} ${
            enabled ? "enabled" : "disabled"
          }`,
        });
      }
      
      logToSupabase("Notification toggle updated", {
        level: "info",
        page: "useUserPreferences",
        data: { type, enabled }
      });

      return true;
    } catch (err: any) {
      console.error("Error updating notification toggle:", err);
      
      // Revert optimistic update on error
      setPreferences((prev) =>
        prev
          ? {
              ...prev,
              [type]: !enabled,
            }
          : null
      );
      
      if (showToast) {
        toast({
          title: "Error",
          description: "There was an issue saving your preference.",
          variant: "destructive",
        });
      }
      
      logToSupabase("Error updating notification toggle", {
        level: "error",
        page: "useUserPreferences",
        data: { type, error: err.message || String(err) }
      });
      
      return false;
    } finally {
      // Remove from pending updates
      delete pendingUpdates.current[type];
      
      if (isMounted.current) {
        setSaving(false);
      }
    }
  };

  // Helper to format notification type names
  const formatNotificationTypeName = (type: string): string => {
    switch (type) {
      case "password_change_notifications":
        return "Password change notifications";
      case "email_change_notifications":
        return "Email change notifications";
      case "security_alert_notifications":
        return "Security alert notifications";
      default:
        return type
          .split("_")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
    }
  };

  return {
    preferences,
    loading,
    saving,
    error,
    updateMainNotificationsToggle,
    updateNotificationToggle,
    formatNotificationTypeName,
  };
}
