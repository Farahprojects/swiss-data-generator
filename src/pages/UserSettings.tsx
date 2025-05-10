
import { UserSettingsLayout } from "@/components/settings/UserSettingsLayout";
import UnifiedNavigation from "@/components/UnifiedNavigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

const UserSettings = () => {
  const navigate = useNavigate();
  
  const handleClose = () => {
    navigate('/dashboard');
  };
  
  return (
    <div className="flex flex-col min-h-screen">
      <UnifiedNavigation />
      
      <div className="flex flex-grow bg-gray-50">
        <SidebarProvider>
          <div className="flex w-full">
            <DashboardSidebar />
            
            <div className="flex-1 p-6">
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
          </div>
        </SidebarProvider>
      </div>
      
      <Footer />
    </div>
  );
};

export default UserSettings;
