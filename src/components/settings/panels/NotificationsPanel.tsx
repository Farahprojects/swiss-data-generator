
import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { logToSupabase } from "@/utils/batchedLogManager";
import { useToast } from "@/hooks/use-toast";

export const NotificationsPanel = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true); // Default to true
  const { toast } = useToast();

  // Load user preferences
  useEffect(() => {
    const loadUserPreferences = async () => {
      try {
        setLoading(true);
        
        // Get current user
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) {
          setLoading(false);
          return;
        }
        
        // Get user preferences
        const { data: userPrefs, error } = await supabase
          .from('user_preferences')
          .select('email_notifications_enabled')
          .eq('user_id', userData.user.id)
          .single();
        
        if (error && error.code !== 'PGRST116') { // Not Found error is ok here
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
        } else if (userPrefs) {
          // If user has preferences set, use them
          setEmailNotificationsEnabled(userPrefs.email_notifications_enabled !== false);
        }
        
        setLoading(false);
      } catch (error: any) {
        logToSupabase("Error in loadUserPreferences", {
          level: 'error',
          page: 'NotificationsPanel',
          data: { error: error.message || String(error) }
        });
        
        setLoading(false);
      }
    };
    
    loadUserPreferences();
  }, [toast]);
  
  // Handle toggle change
  const handleToggleChange = async (checked: boolean) => {
    try {
      setSaving(true);
      setEmailNotificationsEnabled(checked);
      
      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        setSaving(false);
        return;
      }
      
      // Upsert user preferences
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userData.user.id,
          email_notifications_enabled: checked,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });
      
      if (error) {
        logToSupabase("Error saving notification preferences", {
          level: 'error',
          page: 'NotificationsPanel',
          data: { error: error.message }
        });
        
        toast({
          title: "Error",
          description: "Failed to save notification preferences",
          variant: "destructive"
        });
        
        // Revert the UI state if save failed
        setEmailNotificationsEnabled(!checked);
      } else {
        logToSupabase("Notification preferences saved", {
          level: 'info',
          page: 'NotificationsPanel',
          data: { enabled: checked }
        });
        
        toast({
          title: "Preferences Saved",
          description: `Email notifications ${checked ? 'enabled' : 'disabled'}`
        });
      }
      
      setSaving(false);
    } catch (error: any) {
      logToSupabase("Error in handleToggleChange", {
        level: 'error',
        page: 'NotificationsPanel',
        data: { error: error.message || String(error) }
      });
      
      setSaving(false);
      
      // Revert the UI state if save failed
      setEmailNotificationsEnabled(!checked);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-semibold mb-6">Notification Settings</h2>
      
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Email Notifications</h3>
            <p className="text-sm text-gray-500">
              Receive email notifications for important account changes
            </p>
          </div>
          
          {loading ? (
            <Loader className="h-4 w-4 animate-spin text-gray-400" />
          ) : (
            <div className="flex items-center space-x-2">
              <Switch 
                checked={emailNotificationsEnabled}
                onCheckedChange={handleToggleChange}
                disabled={saving}
                id="email-notifications"
              />
              <Label htmlFor="email-notifications">
                {emailNotificationsEnabled ? 'Enabled' : 'Disabled'}
              </Label>
              {saving && <Loader className="h-3 w-3 animate-spin text-gray-400 ml-2" />}
            </div>
          )}
        </div>
        
        <div className="bg-gray-50 p-4 rounded-md">
          <h4 className="font-medium mb-2">You will receive emails for:</h4>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
            <li>Password changes</li>
            <li>Email address changes</li>
            <li>Security alerts</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default NotificationsPanel;
