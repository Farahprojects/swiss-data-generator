
import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader, RefreshCw } from "lucide-react";
import { logToSupabase } from "@/utils/batchedLogManager";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { Button } from "@/components/ui/button";

// Define the specific notification toggle keys type
type NotificationToggleKey = 'password_change_notifications' | 'email_change_notifications' | 'security_alert_notifications';

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

  // Track which toggles are currently being saved to prevent UI flicker
  const [pendingToggles, setPendingToggles] = useState<Record<string, boolean>>({});

  // Debug log for panel rendering
  useEffect(() => {
    logToSupabase("NotificationsPanel component rendered", {
      level: 'debug',
      page: 'NotificationsPanel',
      data: { status: loading ? 'loading' : 'loaded', error }
    });
  }, [loading, error]);

  // Helper function to determine if individual notification is enabled
  const isNotificationEnabled = (type: string): boolean => {
    if (!preferences) return true; // Default to true
    
    // If this toggle is pending an update, return its pending state
    if (type in pendingToggles) {
      return pendingToggles[type];
    }
    
    return preferences[type as keyof typeof preferences] === true;
  };
  
  // Handle refresh on timeout errors
  const handleRefresh = () => {
    window.location.reload();
  };

  // Handle toggle changes with visual feedback and debouncing
  const handleMainToggleChange = (checked: boolean) => {
    // Set visual state immediately for a responsive feel
    setPendingToggles(prev => ({
      ...prev,
      'email_notifications_enabled': checked
    }));
    
    // Update server state
    updateMainNotificationsToggle(checked, { showToast: false });
    
    // Log action for analytics
    logToSupabase("Main notification toggle changed", {
      level: 'info',
      page: 'NotificationsPanel',
      data: { enabled: checked }
    });
    
    // Clear pending state after a delay
    setTimeout(() => {
      setPendingToggles(prev => {
        const newState = {...prev};
        delete newState['email_notifications_enabled'];
        return newState;
      });
    }, 1000);
  };

  // Handle individual notification toggle changes with visual feedback
  const handleNotificationToggleChange = (type: NotificationToggleKey, checked: boolean) => {
    // Set pending state to provide immediate visual feedback
    setPendingToggles(prev => ({
      ...prev,
      [type]: checked
    }));
    
    // Update server state
    updateNotificationToggle(
      type,
      checked,
      { showToast: false }
    );
    
    // Log action for analytics
    logToSupabase(`${type} notification toggle changed`, {
      level: 'info',
      page: 'NotificationsPanel',
      data: { type, enabled: checked }
    });
    
    // Clear pending state after a delay
    setTimeout(() => {
      setPendingToggles(prev => {
        const newState = {...prev};
        delete newState[type];
        return newState;
      });
    }, 1000);
  };
  
  // Determine if the main toggle is in a pending state
  const isMainTogglePending = 'email_notifications_enabled' in pendingToggles;
  
  // Get the current or pending state of the main toggle
  const mainToggleEnabled = isMainTogglePending 
    ? pendingToggles['email_notifications_enabled'] 
    : preferences?.email_notifications_enabled;

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-semibold mb-6">Notification Settings</h2>
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
          <p className="font-medium">Error loading preferences</p>
          <p className="text-sm">{error}</p>
          <div className="flex items-center mt-3 space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center space-x-1"
              onClick={handleRefresh}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              <span>Reload</span>
            </Button>
          </div>
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
                checked={mainToggleEnabled ?? false}
                onCheckedChange={handleMainToggleChange}
                disabled={loading || saving || isMainTogglePending}
                id="email-notifications"
                className="focus:ring-2 focus:ring-primary"
              />
              <Label htmlFor="email-notifications">
                {isMainTogglePending ? (
                  <span className="flex items-center">
                    <Loader className="h-3 w-3 animate-spin text-gray-400 mr-1" />
                    Saving...
                  </span>
                ) : (
                  mainToggleEnabled ? 'Enabled' : 'Disabled'
                )}
              </Label>
            </div>
          )}
        </div>
        
        {(mainToggleEnabled || isMainTogglePending) && (
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
                <div className="flex items-center">
                  <Switch 
                    id="password-change-notifications"
                    checked={isNotificationEnabled('password_change_notifications')}
                    onCheckedChange={(checked) => 
                      handleNotificationToggleChange('password_change_notifications', checked)
                    }
                    disabled={loading || saving || !mainToggleEnabled || 'password_change_notifications' in pendingToggles}
                    className="focus:ring-2 focus:ring-primary"
                  />
                  {'password_change_notifications' in pendingToggles && (
                    <Loader className="h-3 w-3 animate-spin text-gray-400 ml-2" />
                  )}
                </div>
              </div>
              
              {/* Email Change Notifications */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium text-sm">Email Address Changes</p>
                  <p className="text-xs text-gray-500">
                    Get notified when your email address is changed
                  </p>
                </div>
                <div className="flex items-center">
                  <Switch 
                    id="email-change-notifications"
                    checked={isNotificationEnabled('email_change_notifications')}
                    onCheckedChange={(checked) => 
                      handleNotificationToggleChange('email_change_notifications', checked)
                    }
                    disabled={loading || saving || !mainToggleEnabled || 'email_change_notifications' in pendingToggles}
                    className="focus:ring-2 focus:ring-primary"
                  />
                  {'email_change_notifications' in pendingToggles && (
                    <Loader className="h-3 w-3 animate-spin text-gray-400 ml-2" />
                  )}
                </div>
              </div>
              
              {/* Security Alert Notifications */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium text-sm">Security Alerts</p>
                  <p className="text-xs text-gray-500">
                    Get notified about important security events
                  </p>
                </div>
                <div className="flex items-center">
                  <Switch 
                    id="security-alert-notifications"
                    checked={isNotificationEnabled('security_alert_notifications')}
                    onCheckedChange={(checked) => 
                      handleNotificationToggleChange('security_alert_notifications', checked)
                    }
                    disabled={loading || saving || !mainToggleEnabled || 'security_alert_notifications' in pendingToggles}
                    className="focus:ring-2 focus:ring-primary"
                  />
                  {'security_alert_notifications' in pendingToggles && (
                    <Loader className="h-3 w-3 animate-spin text-gray-400 ml-2" />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {preferences && !mainToggleEnabled && !isMainTogglePending && (
          <div className="bg-gray-50 p-4 rounded-md text-gray-500 text-sm">
            Email notifications are currently disabled. Enable the master switch to manage individual notification settings.
          </div>
        )}
        
        {/* Loading indicator for initial load */}
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
