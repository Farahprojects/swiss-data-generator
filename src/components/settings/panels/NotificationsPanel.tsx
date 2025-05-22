import { useState, useEffect, useRef } from "react";
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

/**
 * useUserPreferences – simplified: removed realtime subscription because it clashes with optimistic updates
 * in single‑tab UX. Instead, rely on the optimistic cache (local state) and background refetch every ~30 s.
 */
export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const pendingRef = useRef<Set<string>>(new Set());

  // helper
  const isMounted = () => Boolean(user); // basic – component unmount means user context gone.

  /** Initial + periodic fetch (30 s) */
  useEffect(() => {
    let interval: NodeJS.Timeout;

    const fetchPrefs = async () => {
      if (!user?.id) return;
      try {
        const { data, error: fetchError } = await supabase
          .from("user_preferences")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (fetchError && fetchError.code === "PGRST116") {
          await createDefaultPreferences(user.id);
        } else if (fetchError) {
          throw fetchError;
        } else if (data) {
          setPreferences((prev) => {
            // Ignore server echoes that are exactly what's already pending
            const ignores = [...pendingRef.current].every(
              (k) => (data as any)[k] === (prev as any)?.[k]
            );
            return ignores ? prev : (data as UserPreferences);
          });
        }
      } catch (err: any) {
        logToSupabase("Periodic fetch failed", {
          level: "warn",
          page: "useUserPreferences",
          data: { err: err.message },
        });
      }
    };

    // initial load
    (async () => {
      setLoading(true);
      await fetchPrefs();
      setLoading(false);
    })();

    // background refresh
    interval = setInterval(fetchPrefs, 30000);
    return () => clearInterval(interval);
  }, [user]);

  /** Default row */
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
      logToSupabase("Failed to create default preferences", {
        level: "error",
        page: "useUserPreferences",
        data: { error: err.message },
      });
    }
  };

  /** ------------------------ Update helpers ----------------------- */
  const persist = async (patch: Partial<UserPreferences>, toastMsg?: string) => {
    if (!user?.id) return false;

    pendingRef.current = new Set([
      ...pendingRef.current,
      ...Object.keys(patch),
    ]);

    setPreferences((prev) => (prev ? { ...prev, ...patch } : prev));
    setSaving(true);

    try {
      const { error } = await supabase
        .from("user_preferences")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
      if (error) throw error;
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
      Object.keys(patch).forEach((k) => pendingRef.current.delete(k));
    }
  };

  const updateMainNotificationsToggle = (enabled: boolean, opts: UpdateOptions = {}) =>
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
      .map((w) => w[0].toUpperCase() + w.slice(1))
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
