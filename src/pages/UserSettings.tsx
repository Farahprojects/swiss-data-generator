
import { UserSettingsLayout } from "@/components/settings/UserSettingsLayout";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { logToSupabase } from "@/utils/batchedLogManager";
import { useEffect } from "react";

const UserSettings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Ensure we have the proper query parameter on initial render
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const panel = searchParams.get("panel");
    
    if (!panel) {
      // If there's no panel parameter, add it and redirect
      navigate("/dashboard/settings?panel=account", { replace: true });
      
      logToSupabase("Redirected to settings with default panel", {
        level: 'debug',
        page: 'UserSettings',
        data: { originalUrl: location.pathname + location.search }
      });
    }
  }, [location.pathname, location.search, navigate]);
  
  const handleClose = () => {
    logToSupabase("Closed settings page", {
      level: 'info',
      page: 'UserSettings'
    });
    navigate('/dashboard');
  };
  
  // Log current route for debugging
  useEffect(() => {
    logToSupabase("Settings page rendered", {
      level: 'debug',
      page: 'UserSettings',
      data: { url: location.pathname + location.search }
    });
  }, [location]);
  
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <Button 
          variant="outline" 
          size="icon" 
          onClick={handleClose} 
          className="rounded-full hover:bg-gray-300 shadow-md hover:shadow-lg border-2 border-gray-400 transition-all duration-300"
        >
          <X size={20} className="text-gray-800 hover:text-gray-900" />
        </Button>
      </div>
      <UserSettingsLayout />
    </div>
  );
};

export default UserSettings;
