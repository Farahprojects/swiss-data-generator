import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logToSupabase } from "@/utils/batchedLogManager";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

// --------------------------------------------------
// Types
// --------------------------------------------------
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

// --------------------------------------------------
// Hook
// --------------------------------------------------
export function useUserPreferences() {
  // ----- state -----
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading]   = useState(true);
  const [saving,  setSaving]    = useState(false);
  const [error,   setError]     = useState<string | null>(null);

  // ----- context -----
  const { toast } = useToast();
  const { user }  = useAuth();

  // keep track of which fields are mid‑flight so we can ignore server echoes
  const pendingRef = useRef<Set<keyof UserPreferences>>(new Set());

  // --------------------------------------------------
  // Fetch helpers
  // --------------------------------------------------
  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    let cancel = false;               // local flag
    let interval: NodeJS.Timeout;     // background refetch timer

    const fetchPrefs = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from("user_preferences")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (cancel) return; // component unmounted

        if (fetchError) {
          if (fetchError.code === "PGRST116") {
            await createDefaultPreferences(user.id);
          } else {
            throw fetchError;
          }
        } else if (data) {
          setPreferences((prev) => {
            // Ignore if every pending field matches (optimistic echo)
            const isEcho = [...pendingRef.current].every(
              (k) => (data as any)[k] === (prev as any)?.[k]
            );
            return isEcho ? prev : (data as UserPreferences);
          });
        }
      } catch (err: any) {
        if (cancel) return;
        logToSupabase("useUserPreferences fetch error", {
          level: "warn",
          page: "useUserPreferences",
          data: { message: err.message || String(err) },
        });
        // surface once
        setError("Failed to load preferences – trying again soon.");
      }
    };

    // initial fetch
    (async () => {
      setLoading(true);
      await fetchPrefs();
      if (!cancel) setLoading(false);
    })();

    // background refresh every 30 s
    interval = setInterval(fetchPrefs, 30000);

    // cleanup
    return () => {
      cancel = true;
      clearInterval(interval);
    };
  }, [user]);

  // --------------------------------------------------
  // Create defaults if none exist
  // --------------------------------------------------
  const createDefaultPreferences = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_preferences")
        .insert({
          user_id: userId,
          email_notifications_enabled: true,
          password_change_notifications: true,
          email_change_notifications: true,
          security_alert_notifications: true,
        })
        .select()
        .single();

      if (error) throw error;
      setPreferences(data as UserPreferences);
    } catch (err: any) {
      logToSupabase("createDefaultPreferences failed", {
        level: "error",
        page: "useUserPreferences",
        data: { message: err.message || String(err) },
      });
    }
  };

  // --------------------------------------------------
  // Persist helpers (optimistic)
  // --------------------------------------------------
  const persist = async (
    patch: Partial<UserPreferences>,
    toastMsg?: string
  ) => {
    if (!user?.id) return false;

    Object.keys(patch).forEach((k) => pendingRef.current.add(k as any));
    setPreferences((prev) => (prev ? { ...prev, ...patch } : prev));
    setSaving(true);

    try {
      const { error: upError } = await supabase
        .from("user_preferences")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);

      if (upError) throw upError;
      if (toastMsg) toast({ title: "Preferences", description: toastMsg });
      return true;
    } catch (err: any) {
      toast({
        title: "Error",
        description: "Could not save preference.",
        variant: "destructive",
      });
      return false;
    } finally {
      setSaving(false);
      Object.keys(patch).forEach((k) => pendingRef.current.delete(k as any));
    }
  };

  // --------------------------------------------------
  // Public API
  // --------------------------------------------------
  const updateMainNotificationsToggle = (
    enabled: boolean,
    opts: UpdateOptions = {}
  ) =>
    persist(
      { email_notifications_enabled: enabled },
      opts.showToast === false ? undefined : `Email notifications ${enabled ? "enabled" : "disabled"}`
    );

  const updateNotificationToggle = (
    type: NotificationToggleType,
    enabled: boolean,
    opts: UpdateOptions = {}
  ) =>
    persist(
      { [type]: enabled } as Partial<UserPreferences>,
      opts.showToast === false ? undefined : `${formatNotificationTypeName(type)} ${enabled ? "enabled" : "disabled"}`
    );

  const formatNotificationTypeName = (type: string) =>
    type
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

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
