
import { useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader } from "lucide-react";
import { logToSupabase } from "@/utils/batchedLogManager";
import { useUserPreferences } from "@/hooks/useUserPreferences";

export const NotificationsPanel = () => {
  const {
    preferences,
    loading,
    saving,
    error,
    updateMainNotificationsToggle,
    updateNotificationToggle,
    formatNotificationTypeName
  } = useUserPreferences();

  // Debug log for panel rendering
  useEffect(() => {
    logToSupabase("NotificationsPanel component rendered with Realtime support", {
      level: 'debug',
      page: 'NotificationsPanel',
      data: { status: loading ? 'loading' : 'loaded', error }
    });
  }, [loading, error]);

  // Helper function to determine if individual notification is enabled
  const isNotificationEnabled = (type: string): boolean => {
    if (!preferences) return true; // Default to true
    return preferences[type as keyof typeof preferences] === true;
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-semibold mb-6">Notification Settings</h2>
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
          <p className="font-medium">Error loading preferences</p>
          <p className="text-sm">{error}</p>
          <p className="text-sm mt-2">Please reload the page to try again.</p>
        </div>
      )}
      
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h3 className="text-lg font-medium">Email Notifications</h3>
            <p className="text-sm text-gray-500">
              Turn off all notifications
            </p>
          </div>
          
          {loading ? (
            <Loader className="h-4 w-4 animate-spin text-gray-400" />
          ) : (
            <div className="flex items-center space-x-2">
              <Switch 
                checked={preferences?.email_notifications_enabled ?? false}
                onCheckedChange={(checked) => updateMainNotificationsToggle(checked)}
                disabled={saving}
                id="email-notifications"
                className="focus:ring-2 focus:ring-primary"
              />
              <Label htmlFor="email-notifications">
                {preferences?.email_notifications_enabled ? 'Enabled' : 'Disabled'}
              </Label>
              {saving && <Loader className="h-3 w-3 animate-spin text-gray-400 ml-2" />}
            </div>
          )}
        </div>
        
        {preferences?.email_notifications_enabled && (
          <div className="space-y-4 pt-2">
            <h4 className="font-medium text-gray-700">Notification Types</h4>
            
            <div className="space-y-4">
              {/* Password Change Notifications */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium text-sm">Password Changes</p>
                  <p className="text-xs text-gray-500">
                    Get notified when your password is changed
                  </p>
                </div>
                <Switch 
                  id="password-change-notifications"
                  checked={isNotificationEnabled('password_change_notifications')}
                  onCheckedChange={(checked) => 
                    updateNotificationToggle('password_change_notifications', checked)
                  }
                  disabled={saving || loading || !preferences?.email_notifications_enabled}
                  className="focus:ring-2 focus:ring-primary"
                />
              </div>
              
              {/* Email Change Notifications */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium text-sm">Email Address Changes</p>
                  <p className="text-xs text-gray-500">
                    Get notified when your email address is changed
                  </p>
                </div>
                <Switch 
                  id="email-change-notifications"
                  checked={isNotificationEnabled('email_change_notifications')}
                  onCheckedChange={(checked) => 
                    updateNotificationToggle('email_change_notifications', checked)
                  }
                  disabled={saving || loading || !preferences?.email_notifications_enabled}
                  className="focus:ring-2 focus:ring-primary"
                />
              </div>
              
              {/* Security Alert Notifications */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium text-sm">Security Alerts</p>
                  <p className="text-xs text-gray-500">
                    Get notified about important security events
                  </p>
                </div>
                <Switch 
                  id="security-alert-notifications"
                  checked={isNotificationEnabled('security_alert_notifications')}
                  onCheckedChange={(checked) => 
                    updateNotificationToggle('security_alert_notifications', checked)
                  }
                  disabled={saving || loading || !preferences?.email_notifications_enabled}
                  className="focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        )}
        
        {preferences && !preferences.email_notifications_enabled && (
          <div className="bg-gray-50 p-4 rounded-md text-gray-500 text-sm">
            Email notifications are currently disabled. Enable the master switch to manage individual notification settings.
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPanel;
