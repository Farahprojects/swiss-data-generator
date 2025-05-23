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
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { toast } = useToast();
  const { user } = useAuth();
  const lastUpdateRef = useRef<{ field: string; value: any } | null>(null);

  const isMounted = useCallback(() => true, []);

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
        loadTimeout = setTimeout(() => {
          if (loading && isMounted()) {
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
        } else if (data && isMounted()) {
          setPreferences(data as UserPreferences);
          logToSupabase("User preferences loaded successfully", {
            level: "info",
            page: "useUserPreferences",
          });
        }
      } catch (err: any) {
        clearTimeout(loadTimeout);
        const errorMessage = err.message || "Failed to load preferences";

        if (isMounted()) {
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
        if (isMounted()) {
          setLoading(false);
        }
      }
    };

    const setupRealtimeListener = () => {
      if (!user?.id) return;

      try {
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
              logToSupabase("Received real-time update for user preferences", {
                level: "debug",
                page: "useUserPreferences",
                data: { event: payload.eventType },
              });

              if (!saving && isMounted()) {
                const incoming = payload.new as UserPreferences;

                const lastField = lastUpdateRef.current?.field;
                const lastValue = lastUpdateRef.current?.value;

                const isRedundantUpdate =
                  lastField &&
                  incoming[lastField as keyof UserPreferences] === lastValue &&
                  preferences &&
                  Object.keys(incoming).every((key) => {
                    return (
                      key === "updated_at" ||
                      incoming[key as keyof UserPreferences] ===
                        preferences[key as keyof UserPreferences]
                    );
                  });

                if (isRedundantUpdate) {
                  return; // skip
                }

                if (
                  payload.eventType === "UPDATE" ||
                  payload.eventType === "INSERT"
                ) {
                  setPreferences(incoming);
                } else if (payload.eventType === "DELETE") {
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
      clearTimeout(loadTimeout);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user, toast, isMounted, retryCount]);

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
      if (isMounted()) setPreferences(data as UserPreferences);

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

  const updateMainNotificationsToggle = async (
    enabled: boolean,
    options: UpdateOptions = {}
  ) => {
    if (!user?.id || !preferences) return false;

    const { showToast = true } = options;
    lastUpdateRef.current = {
      field: "email_notifications_enabled",
      value: enabled,
    };

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
          password_change_notifications:
            preferences.password_change_notifications,
          email_change_notifications: preferences.email_change_notifications,
          security_alert_notifications:
            preferences.security_alert_notifications,
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

      return true;
    } catch (err: any) {
      console.error("Error updating main toggle:", err);
      if (showToast) {
        toast({
          title: "Error",
          description: "There was an issue saving your preference.",
          variant: "destructive",
        });
      }
      return false;
    } finally {
      setTimeout(() => {
        if (isMounted()) {
          setSaving(false);
          lastUpdateRef.current = null;
        }
      }, 500);
    }
  };

  const updateNotificationToggle = async (
    type: NotificationToggleType,
    enabled: boolean,
    options: UpdateOptions = {}
  ) => {
    if (!user?.id || !preferences || !preferences.email_notifications_enabled)
      return false;

    const { showToast = true } = options;

    lastUpdateRef.current = { field: type, value: enabled };

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
      const { error } = await supabase.from("user_preferences").upsert(
        {
          user_id: user.id,
          email_notifications_enabled: preferences.email_notifications_enabled,
          password_change_notifications:
            type === "password_change_notifications"
              ? enabled
              : preferences.password_change_notifications,
          email_change_notifications:
            type === "email_change_notifications"
              ? enabled
              : preferences.email_change_notifications,
          security_alert_notifications:
            type === "security_alert_notifications"
              ? enabled
              : preferences.security_alert_notifications,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

      if (error) throw error;

      if (showToast) {
        toast({
          title: "Preference Saved",
          description: `${formatNotificationTypeName(type)} ${
            enabled ? "enabled" : "disabled"
          }`,
        });
      }

      return true;
    } catch (err: any) {
      console.error("Error updating notification toggle:", err);
      if (showToast) {
        toast({
          title: "Error",
          description: "There was an issue saving your preference.",
          variant: "destructive",
        });
      }
      return false;
    } finally {
      setTimeout(() => {
        if (isMounted()) {
          setSaving(false);
          lastUpdateRef.current = null;
        }
      }, 500);
    }
  };

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
