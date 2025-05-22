
import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { logToSupabase } from "@/utils/batchedLogManager";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { useLocation } from "react-router-dom";

interface NotificationPreferences {
  email_notifications_enabled: boolean;
  password_change_notifications: boolean;
  email_change_notifications: boolean;
  security_alert_notifications: boolean;
}

export const NotificationsPanel = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email_notifications_enabled: true,
    password_change_notifications: true,
    email_change_notifications: true,
    security_alert_notifications: true
  });
  const { toast } = useToast();
  const location = useLocation();

  // Debug log for panel rendering
  useEffect(() => {
    logToSupabase("NotificationsPanel component rendered", {
      level: 'debug',
      page: 'NotificationsPanel',
      data: { currentURL: location.pathname + location.search }
    });
  }, [location]);

  // Load user preferences
  useEffect(() => {
    const loadUserPreferences = async () => {
      try {
        setLoading(true);
        
        // Get current user
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) {
          throw new Error(`Auth error: ${userError.message}`);
        }
        
        if (!userData?.user) {
          logToSupabase("No authenticated user found", {
            level: 'error',
            page: 'NotificationsPanel'
          });
          setLoading(false);
          toast({
            title: "Authentication Error",
            description: "Please sign in to manage your notification preferences",
            variant: "destructive"
          });
          return;
        }
        
        // Get user preferences
        const { data, error } = await supabase
          .from('user_preferences')
          .select('email_notifications_enabled, password_change_notifications, email_change_notifications, security_alert_notifications')
          .eq('user_id', userData.user.id)
          .single();
        
        if (error) {
          if (error.code === 'PGRST116') { // Not Found error
            // Create default preferences if none exist
            await createDefaultPreferences(userData.user.id);
          } else {
            logToSupabase("Error loading user preferences", {
              level: 'error',
              page: 'NotificationsPanel',
              data: { error: error.message }
            });
            
            toast({
              title: "Error",
              description: "Failed to load notification preferences",
              variant: "destructive"
            });
          }
        } else if (data) {
          // If user has preferences set, use them
          setPreferences({
            email_notifications_enabled: data.email_notifications_enabled !== false,
            password_change_notifications: data.password_change_notifications !== false,
            email_change_notifications: data.email_change_notifications !== false,
            security_alert_notifications: data.security_alert_notifications !== false
          });
          
          logToSupabase("User preferences loaded successfully", {
            level: 'info',
            page: 'NotificationsPanel'
          });
        }
        
        setLoading(false);
      } catch (error: any) {
        logToSupabase("Error in loadUserPreferences", {
          level: 'error',
          page: 'NotificationsPanel',
          data: { error: error.message || String(error) }
        });
        
        setLoading(false);
        toast({
          title: "Error Loading Preferences",
          description: "There was a problem loading your notification settings",
          variant: "destructive"
        });
      }
    };
    
    loadUserPreferences();
  }, [toast]);
  
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
      
      const { error } = await supabase
        .from('user_preferences')
        .insert(defaultPrefs);
      
      if (error) {
        throw error;
      }
      
      setPreferences(defaultPrefs);
      
      logToSupabase("Created default user preferences", {
        level: 'info',
        page: 'NotificationsPanel'
      });
      
    } catch (error: any) {
      logToSupabase("Failed to create default preferences", {
        level: 'error',
        page: 'NotificationsPanel',
        data: { error: error.message || String(error) }
      });
    }
  };
  
  // Handle main toggle change with timeout and better error handling
  const handleMainToggleChange = async (checked: boolean) => {
    // Add a timeout to prevent infinite spinner
    const timeoutId = setTimeout(() => {
      if (saving) {
        setSaving(false);
        logToSupabase("Main toggle operation timed out", {
          level: 'error',
          page: 'NotificationsPanel',
          data: { operation: 'toggle', newState: checked }
        });
        toast({
          title: "Operation Timed Out",
          description: "The request took too long. Please try again.",
          variant: "destructive"
        });
      }
    }, 5000); // 5 second timeout
    
    try {
      setSaving(true);
      
      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        throw new Error("User not authenticated");
      }
      
      // Log toggle attempt
      logToSupabase("Main notification toggle attempted", {
        level: 'debug',
        page: 'NotificationsPanel',
        data: { newValue: checked }
      });
      
      // Update UI state optimistically for better UX
      const newPreferences = {
        ...preferences,
        email_notifications_enabled: checked,
      };
      
      setPreferences(newPreferences);
      
      // Save to database
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userData.user.id,
          ...newPreferences,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });
      
      if (error) throw error;
      
      // Clear the timeout since operation completed successfully
      clearTimeout(timeoutId);
      
      logToSupabase("Main notification preferences saved", {
        level: 'info',
        page: 'NotificationsPanel',
        data: { enabled: checked }
      });
      
      toast({
        title: "Preferences Saved",
        description: `Email notifications ${checked ? 'enabled' : 'disabled'}`
      });
      
    } catch (error: any) {
      // Clear the timeout since operation completed (with error)
      clearTimeout(timeoutId);
      
      logToSupabase("Error in handleMainToggleChange", {
        level: 'error',
        page: 'NotificationsPanel',
        data: { error: error.message || String(error) }
      });
      
      // Revert the UI state if save failed
      setPreferences(prev => ({
        ...prev,
        email_notifications_enabled: !prev.email_notifications_enabled
      }));
      
      toast({
        title: "Error",
        description: "Failed to save notification preferences",
        variant: "destructive"
      });
    } finally {
      // Ensure saving state is always turned off
      setSaving(false);
    }
  };
  
  // Handle individual notification toggle change with timeout
  const handleNotificationToggle = async (type: keyof Omit<NotificationPreferences, 'email_notifications_enabled'>, checked: boolean) => {
    if (!preferences.email_notifications_enabled) {
      toast({
        title: "Notifications Disabled",
        description: "Enable email notifications first to manage individual settings",
      });
      return;
    }
    
    // Add a timeout to prevent infinite spinner
    const timeoutId = setTimeout(() => {
      if (saving) {
        setSaving(false);
        logToSupabase(`Individual toggle operation timed out: ${type}`, {
          level: 'error',
          page: 'NotificationsPanel',
          data: { operation: 'toggle', type, newState: checked }
        });
        toast({
          title: "Operation Timed Out",
          description: "The request took too long. Please try again.",
          variant: "destructive"
        });
      }
    }, 5000); // 5 second timeout
    
    try {
      setSaving(true);
      
      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        throw new Error("User not authenticated");
      }
      
      // Log toggle attempt
      logToSupabase(`Individual notification toggle attempted: ${type}`, {
        level: 'debug',
        page: 'NotificationsPanel',
        data: { type, newValue: checked }
      });
      
      // Update UI state optimistically
      const newPreferences = {
        ...preferences,
        [type]: checked
      };
      
      setPreferences(newPreferences);
      
      // Save to database
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userData.user.id,
          ...newPreferences,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });
      
      if (error) throw error;
      
      // Clear the timeout since operation completed successfully
      clearTimeout(timeoutId);
      
      logToSupabase(`${type} notification preference saved`, {
        level: 'info',
        page: 'NotificationsPanel',
        data: { type, enabled: checked }
      });
      
      toast({
        title: "Preference Saved",
        description: `${formatNotificationTypeName(type)} ${checked ? 'enabled' : 'disabled'}`
      });
      
    } catch (error: any) {
      // Clear the timeout since operation completed (with error)
      clearTimeout(timeoutId);
      
      logToSupabase(`Error saving ${type} notification preference`, {
        level: 'error',
        page: 'NotificationsPanel',
        data: { type, error: error.message || String(error) }
      });
      
      // Revert the UI state if save failed
      setPreferences(prev => ({
        ...prev,
        [type]: !checked
      }));
      
      toast({
        title: "Error",
        description: "Failed to save notification preference",
        variant: "destructive"
      });
    } finally {
      // Ensure saving state is always turned off
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

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-semibold mb-6">Notification Settings</h2>
      
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
                checked={preferences.email_notifications_enabled}
                onCheckedChange={handleMainToggleChange}
                disabled={saving}
                id="email-notifications"
                className="focus:ring-2 focus:ring-primary"
              />
              <Label htmlFor="email-notifications">
                {preferences.email_notifications_enabled ? 'Enabled' : 'Disabled'}
              </Label>
              {saving && <Loader className="h-3 w-3 animate-spin text-gray-400 ml-2" />}
            </div>
          )}
        </div>
        
        {preferences.email_notifications_enabled && (
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
                  checked={preferences.password_change_notifications}
                  onCheckedChange={(checked) => 
                    handleNotificationToggle('password_change_notifications', checked)
                  }
                  disabled={saving || loading || !preferences.email_notifications_enabled}
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
                  checked={preferences.email_change_notifications}
                  onCheckedChange={(checked) => 
                    handleNotificationToggle('email_change_notifications', checked)
                  }
                  disabled={saving || loading || !preferences.email_notifications_enabled}
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
                  checked={preferences.security_alert_notifications}
                  onCheckedChange={(checked) => 
                    handleNotificationToggle('security_alert_notifications', checked)
                  }
                  disabled={saving || loading || !preferences.email_notifications_enabled}
                  className="focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        )}
        
        {!preferences.email_notifications_enabled && (
          <div className="bg-gray-50 p-4 rounded-md text-gray-500 text-sm">
            Email notifications are currently disabled. Enable the master switch to manage individual notification settings.
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPanel;
