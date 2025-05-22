
import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { logToSupabase } from "@/utils/batchedLogManager";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "react-router-dom";

interface NotificationPreferences {
  email_notifications_enabled?: boolean;
  password_change_notifications: boolean;
  email_change_notifications: boolean;
  security_alert_notifications: boolean;
}

export const NotificationsPanel = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
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
          .select('password_change_notifications, email_change_notifications, security_alert_notifications')
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
  
  // Single unified handler for notification toggles
  const handleNotificationToggle = async (
    type: keyof NotificationPreferences,
    checked: boolean
  ) => {
    const timeoutId = setTimeout(() => {
      if (saving) {
        setSaving(false);
        logToSupabase(`Toggle operation timed out: ${type}`, {
          level: 'error',
          page: 'NotificationsPanel',
          data: { operation: 'toggle', type, newState: checked }
        });
        toast({
          title: "Timeout",
          description: "The request took too long. Please try again.",
          variant: "destructive"
        });
      }
    }, 5000);

    try {
      setSaving(true);
      
      // Get current user
      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError || !userData?.user) {
        throw new Error("User not authenticated");
      }
      
      // Log toggle attempt
      logToSupabase(`Notification toggle attempted: ${type}`, {
        level: 'debug',
        page: 'NotificationsPanel',
        data: { type, newValue: checked }
      });
      
      // Update UI state optimistically
      const updatedPreferences = {
        ...preferences,
        [type]: checked
      };
      
      setPreferences(updatedPreferences);
      
      // Save to database
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userData.user.id,
          ...updatedPreferences,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });
      
      if (error) throw error;
      
      logToSupabase(`${type} notification preference saved`, {
        level: 'info',
        page: 'NotificationsPanel',
        data: { type, enabled: checked }
      });
      
      toast({
        title: "Saved",
        description: `${formatNotificationTypeName(type)} ${checked ? 'enabled' : 'disabled'}`
      });
      
    } catch (error: any) {
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
        description: "Could not save your preferences.",
        variant: "destructive"
      });
    } finally {
      clearTimeout(timeoutId);
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
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Email Notifications</h3>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="h-8 w-8 animate-spin text-gray-400" />
              <span className="ml-3 text-gray-500">Loading your preferences...</span>
            </div>
          ) : (
            <div className="space-y-6 pt-2">
              <div className="space-y-4">
                {/* Password Change Notifications */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-medium text-sm">Password Changes</p>
                    <p className="text-xs text-gray-500">
                      Get notified when your password is changed
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="password-change-notifications"
                      checked={preferences.password_change_notifications}
                      onCheckedChange={(checked) => 
                        handleNotificationToggle('password_change_notifications', checked)
                      }
                      disabled={saving || loading}
                      className="focus:ring-2 focus:ring-primary"
                    />
                    {saving && <Loader className="h-3 w-3 animate-spin text-gray-400 ml-2" />}
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
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="email-change-notifications"
                      checked={preferences.email_change_notifications}
                      onCheckedChange={(checked) => 
                        handleNotificationToggle('email_change_notifications', checked)
                      }
                      disabled={saving || loading}
                      className="focus:ring-2 focus:ring-primary"
                    />
                    {saving && <Loader className="h-3 w-3 animate-spin text-gray-400 ml-2" />}
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
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="security-alert-notifications"
                      checked={preferences.security_alert_notifications}
                      onCheckedChange={(checked) => 
                        handleNotificationToggle('security_alert_notifications', checked)
                      }
                      disabled={saving || loading}
                      className="focus:ring-2 focus:ring-primary"
                    />
                    {saving && <Loader className="h-3 w-3 animate-spin text-gray-400 ml-2" />}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPanel;
