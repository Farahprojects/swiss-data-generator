
import { UserSettingsLayout } from "@/components/settings/UserSettingsLayout";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { logToSupabase } from "@/utils/batchedLogManager";

const UserSettings = () => {
  const navigate = useNavigate();
  
  const handleClose = () => {
    logToSupabase("Closed settings page", {
      level: 'info',
      page: 'UserSettings'
    });
    navigate('/dashboard');
  };
  
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
