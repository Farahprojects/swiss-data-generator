
import { UserSettingsLayout } from "@/components/settings/UserSettingsLayout";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HeaderNavigation from "@/components/HeaderNavigation";
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
      <HeaderNavigation />
      
      <main className="flex-grow bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-semibold">Settings</h1>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handleClose} 
              className="rounded-full hover:bg-gray-200 border-gray-300 shadow-sm hover:shadow-md transition-all"
            >
              <X size={20} />
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
