
import { useState, useEffect, useRef } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { logToSupabase } from "@/utils/batchedLogManager";
import { useToast } from "@/hooks/use-toast";
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
  
  // Refs to track component mount state and loading timeouts
  const isMounted = useRef(true);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const savingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Load user preferences - with proper cleanup
  useEffect(() => {
    // Reset loading state
    setLoading(true);
    
    // Set a safety timeout to prevent infinite loading
    loadingTimeoutRef.current = setTimeout(() => {
      if (isMounted.current) {
        setLoading(false);
        logToSupabase("Loading preferences timed out", {
          level: 'error',
          page: 'NotificationsPanel'
        });
        
        toast({
          title: "Loading Error",
          description: "Failed to load preferences within the expected time",
          variant: "destructive"
        });
      }
    }, 7000); // 7 second safety timeout
    
    const loadUserPreferences = async () => {
      try {
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
          
          if (isMounted.current) {
            setLoading(false);
            toast({
              title: "Authentication Error",
              description: "Please sign in to manage your notification preferences",
              variant: "destructive"
            });
          }
          return;
        }
        
        // Get user preferences
        const { data, error } = await supabase
          .from('user_preferences')
          .select('email_notifications_enabled, password_change_notifications, email_change_notifications, security_alert_notifications')
          .eq('user_id', userData.user.id)
          .single();
        
        logToSupabase("Loaded preferences response", {
          level: 'debug',
          page: 'NotificationsPanel',
          data: { hasData: !!data, hasError: !!error, dataType: typeof data }
        });
        
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
            
            if (isMounted.current) {
              toast({
                title: "Error",
                description: "Failed to load notification preferences",
                variant: "destructive"
              });
            }
          }
        } else if (data) {
          // If user has preferences set, use them
          if (isMounted.current) {
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
        } else {
          // Handle case when data is null or undefined but no error
          logToSupabase("No preferences data returned but no error", {
            level: 'warn',
            page: 'NotificationsPanel'
          });
          
          // Create default preferences as fallback
          await createDefaultPreferences(userData.user.id);
        }
      } catch (error: any) {
        logToSupabase("Error in loadUserPreferences", {
          level: 'error',
          page: 'NotificationsPanel',
          data: { error: error.message || String(error) }
        });
        
        if (isMounted.current) {
          toast({
            title: "Error Loading Preferences",
            description: "There was a problem loading your notification settings",
            variant: "destructive"
          });
        }
      } finally {
        // Clear the safety timeout
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = null;
        }
        
        if (isMounted.current) {
          setLoading(false);
        }
      }
    };
    
    loadUserPreferences();
    
    // Cleanup function to handle component unmount
    return () => {
      isMounted.current = false;
      
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      
      if (savingTimeoutRef.current) {
        clearTimeout(savingTimeoutRef.current);
        savingTimeoutRef.current = null;
      }
    };
  }, []); // No dependencies - only run once on mount
  
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
        .insert(defaultPrefs)
        .select();
      
      if (error) {
        throw error;
      }
      
      if (isMounted.current) {
        setPreferences(defaultPrefs);
        
        logToSupabase("Created default user preferences", {
          level: 'info',
          page: 'NotificationsPanel'
        });
      }
    } catch (error: any) {
      logToSupabase("Failed to create default preferences", {
        level: 'error',
        page: 'NotificationsPanel',
        data: { error: error.message || String(error) }
      });
    }
  };
  
  // Handle notification toggle change with robust error handling
  const handleNotificationToggle = async (type: keyof NotificationPreferences, checked: boolean) => {
    // Clear any existing saving timeout
    if (savingTimeoutRef.current) {
      clearTimeout(savingTimeoutRef.current);
      savingTimeoutRef.current = null;
    }
    
    // Set new saving timeout
    savingTimeoutRef.current = setTimeout(() => {
      if (isMounted.current && saving) {
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
      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError || !userData?.user) {
        throw new Error("User not authenticated");
      }
      
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
      if (savingTimeoutRef.current) {
        clearTimeout(savingTimeoutRef.current);
        savingTimeoutRef.current = null;
      }
      
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
      if (savingTimeoutRef.current) {
        clearTimeout(savingTimeoutRef.current);
        savingTimeoutRef.current = null;
      }
      
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
        {loading ? (
          <div className="flex justify-center p-4">
            <Loader className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-700">Notification Types</h4>
            
            <div className="space-y-4">
              {/* Email Notifications */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium text-sm">Email Notifications</p>
                  <p className="text-xs text-gray-500">
                    Master toggle for all email notifications
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="email-notifications"
                    checked={preferences.email_notifications_enabled}
                    onCheckedChange={(checked) => 
                      handleNotificationToggle('email_notifications_enabled', checked)
                    }
                    disabled={saving}
                    className="focus:ring-2 focus:ring-primary"
                  />
                  <Label htmlFor="email-notifications">
                    {preferences.email_notifications_enabled ? 'Enabled' : 'Disabled'}
                  </Label>
                  {saving && <Loader className="h-3 w-3 animate-spin text-gray-400 ml-2" />}
                </div>
              </div>
              
              {preferences.email_notifications_enabled && (
                <>
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
                      disabled={saving || !preferences.email_notifications_enabled}
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
                      disabled={saving || !preferences.email_notifications_enabled}
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
                      disabled={saving || !preferences.email_notifications_enabled}
                      className="focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </>
              )}
              
              {!preferences.email_notifications_enabled && (
                <div className="bg-gray-50 p-4 rounded-md text-gray-500 text-sm">
                  Email notifications are currently disabled. Enable email notifications to manage individual notification settings.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPanel;
