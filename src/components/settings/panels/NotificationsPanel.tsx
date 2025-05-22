
import React, { memo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { AlertTriangle, Info } from "lucide-react";

export const NotificationsPanel = memo(function NotificationsPanel() {
  const {
    preferences,
    loading,
    saving,
    error,
    updateMainNotificationsToggle,
    updateNotificationToggle,
    formatNotificationTypeName,
  } = useUserPreferences();

  const handleMainToggleChange = useCallback(
    (checked: boolean) => {
      updateMainNotificationsToggle(checked);
    },
    [updateMainNotificationsToggle]
  );

  const handleToggleChange = useCallback(
    (type: any, checked: boolean) => {
      updateNotificationToggle(type, checked);
    },
    [updateNotificationToggle]
  );

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-24 bg-gray-200 rounded"></div>
          <div className="h-24 bg-gray-200 rounded"></div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="flex items-start gap-3 text-amber-600">
          <AlertTriangle className="w-5 h-5 mt-0.5" />
          <div>
            <h3 className="font-medium">Could not load notification settings</h3>
            <p className="text-sm text-gray-600 mt-1">{error}</p>
            <p className="text-sm text-gray-500 mt-3">
              Please try refreshing the page. If the problem persists, contact
              support.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium">Email Notifications</h3>
          <p className="text-sm text-gray-500 mt-1">
            Configure which emails you receive from the system.
          </p>
        </div>

        {/* Main notifications toggle */}
        <div className="flex justify-between items-center">
          <div>
            <h4 className="font-medium">Email Notifications</h4>
            <p className="text-sm text-gray-500">
              Enable or disable all email notifications
            </p>
          </div>
          <Switch
            checked={preferences?.email_notifications_enabled || false}
            onCheckedChange={handleMainToggleChange}
            disabled={saving}
          />
        </div>

        <Separator />

        {/* Individual notification settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Info size={16} className="text-blue-500" />
            <p className="text-sm text-gray-500">
              Individual settings below are only applied when email
              notifications are enabled.
            </p>
          </div>

          {preferences &&
            [
              "password_change_notifications",
              "email_change_notifications",
              "security_alert_notifications",
            ].map((type) => (
              <div
                key={type}
                className="flex justify-between items-center py-2"
              >
                <div>
                  <h4 className="font-medium">
                    {formatNotificationTypeName(type)}
                  </h4>
                </div>
                <Switch
                  checked={(preferences as any)[type] || false}
                  onCheckedChange={(checked) =>
                    handleToggleChange(type, checked)
                  }
                  disabled={
                    saving || !preferences.email_notifications_enabled
                  }
                />
              </div>
            ))}
        </div>
      </div>
    </Card>
  );
});
