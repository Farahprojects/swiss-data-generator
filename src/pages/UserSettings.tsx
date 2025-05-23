
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSettingsModal } from "@/contexts/SettingsModalContext";
import { logToSupabase } from "@/utils/batchedLogManager";

const UserSettings = () => {
  const navigate = useNavigate();
  const { openSettings } = useSettingsModal();
  
  useEffect(() => {
    // Extract panel from URL if present
    const urlParams = new URLSearchParams(window.location.search);
    const panel = urlParams.get('panel') as "account" | "notifications" | "delete" | "support" || "account";
    
    logToSupabase("UserSettings legacy page accessed, redirecting to modal", {
      level: 'info',
      page: 'UserSettings',
      data: { panel }
    });
    
    // Open the settings modal with the panel from URL or default to account
    openSettings(panel);
    
    // Redirect to dashboard
    navigate('/dashboard', { replace: true });
  }, [navigate, openSettings]);
  
  // This component will not render anything as it immediately redirects
  return null;
};

export default UserSettings;
