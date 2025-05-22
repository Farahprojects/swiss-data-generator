import { memo, useEffect, useState } from "react";
import { Switch as RadixSwitch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader, RefreshCw } from "lucide-react";
import { logToSupabase } from "@/utils/batchedLogManager";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { Button } from "@/components/ui/button";
import type { UserPreferences } from "@/hooks/useUserPreferences";

export type NotificationToggleKey =
  | "password_change_notifications"
  | "email_change_notifications"
  | "security_alert_notifications";

/**
 * Memo‑wrapped Switch so re‑renders triggered by unrelated state (e.g. `saving`)
 * do **not** cause Radix to momentarily reset its animation position.
 */
interface SwitchProps {
  id: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}
const Switch = memo<SwitchProps>(
  ({ id, checked, disabled, onCheckedChange }) => (
    <RadixSwitch
      id={id}
      checked={checked}
      disabled={disabled}
      onCheckedChange={onCheckedChange}
      className="focus:ring-2 focus:ring-primary"
    />
  ),
  (prev, next) =>
    prev.checked === next.checked &&
    prev.disabled === next.disabled // ignore other props
);

export const NotificationsPanel = () => {
  const {
    preferences,
    loading,
    error,
    updateMainNotificationsToggle,
    updateNotificationToggle,
  } = useUserPreferences();

  /** Optimistic local cache */
  const [localPrefs, setLocalPrefs] = useState<UserPreferences | null>(null);
  useEffect(() => {
    if (preferences) setLocalPrefs(preferences);
  }, [preferences]);

  // Debug
  useEffect(() => {
    logToSupabase("NotificationsPanel rendered", {
      level: "debug",
      page: "NotificationsPanel",
      data: { status: loading ? "loading" : "ready", error },
    });
  }, [loading, error]);

  const handleRefresh = () => window.location.reload();

  const handleMainToggleChange = (checked: boolean) => {
    setLocalPrefs((p) => (p ? { ...p, email_notifications_enabled: checked } : p));
    updateMainNotificationsToggle(checked, { showToast: false });
  };

  const handleNotificationToggleChange = (
    type: NotificationToggleKey,
    checked: boolean
  ) => {
    setLocalPrefs((p) => (p ? { ...p, [type]: checked } : p));
    updateNotificationToggle(type, checked, { showToast: false });
  };

  const isNotificationEnabled = (type: NotificationToggleKey) =>
    localPrefs ? localPrefs[type] === true : true;

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-semibold mb-6">Notification Settings</h2>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
          <p className="font-medium">Error loading preferences</p>
          <p className="text-sm">{error}</p>
          <div className="flex items-center mt-3 space-x-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} className="flex items-center space-x-1">
              <RefreshCw className="h-4 w-4 mr-1" />
              <span>Reload</span>
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Master toggle */}
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h3 className="text-lg font-medium">Email Notifications</h3>
            <p className="text-sm text-gray-500">Turn off all notifications</p>
          </div>

          {loading ? (
            <Loader className="h-4 w-4 animate-spin text-gray-400" />
          ) : (
            <div className="flex items-center space-x-2">
              <Switch
                id="email-notifications"
                checked={localPrefs?.email_notifications_enabled ?? false}
                disabled={loading}
                onCheckedChange={handleMainToggleChange}
              />
              <Label htmlFor="email-notifications">
                {localPrefs?.email_notifications_enabled ? "Enabled" : "Disabled"}
              </Label>
            </div>
          )}
        </div>

        {localPrefs?.email_notifications_enabled && (
          <div className="space-y-4 pt-2">
            <h4 className="font-medium text-gray-700">Notification Types</h4>

            {([
              {
                id: "password-change-notifications",
                type: "password_change_notifications",
                label: "Password Changes",
                desc: "Get notified when your password is changed",
              },
              {
                id: "email-change-notifications",
                type: "email_change_notifications",
                label: "Email Address Changes",
                desc: "Get notified when your email address is changed",
              },
              {
                id: "security-alert-notifications",
                type: "security_alert_notifications",
                label: "Security Alerts",
                desc: "Get notified about important security events",
              },
            ] as const).map(({ id, type, label, desc }) => (
              <div key={type} className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium text-sm">{label}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
                <Switch
                  id={id}
                  checked={isNotificationEnabled(type)}
                  disabled={loading}
                  onCheckedChange={(checked) => handleNotificationToggleChange(type, checked)}
                />
              </div>
            ))}
          </div>
        )}

        {localPrefs && !localPrefs.email_notifications_enabled && (
          <div className="bg-gray-50 p-4 rounded-md text-gray-500 text-sm">
            Email notifications are currently disabled. Enable the master switch to manage individual notification settings.
          </div>
        )}

        {loading && !error && (
          <div className="flex justify-center py-8">
            <div className="flex flex-col items-center space-y-2">
              <Loader className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm text-gray-500">Loading preferences...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPanel;
