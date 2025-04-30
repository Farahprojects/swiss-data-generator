
import { UserSettingsLayout } from "@/components/settings/UserSettingsLayout";
import UnifiedNavigation from "@/components/UnifiedNavigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";

const UserSettings = () => {
  const navigate = useNavigate();
  
  const handleClose = () => {
    navigate('/dashboard');
  };
  
  return (
    <div className="flex flex-col min-h-screen">
      <UnifiedNavigation />
      
      <main className="flex-grow bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-semibold">Settings</h1>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handleClose} 
              className="rounded-full hover:bg-gray-300 shadow-md hover:shadow-lg border-2 border-gray-400 transition-all duration-300"
            >
              <X size={20} className="text-gray-800 hover:text-gray-900" />
            </Button>
          </div>
        </div>
        <UserSettingsLayout />
      </main>
      
      <Footer />
    </div>
  );
};

export default UserSettings;
