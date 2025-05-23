
import { useEffect } from "react";
import { Dialog, DialogContent, DialogClose, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { X, User, Bell, LifeBuoy, Settings as SettingsIcon, LogOut, Trash2 } from "lucide-react";
import { useSettingsModal } from "@/contexts/SettingsModalContext";
import { AccountSettingsPanel } from "./account/AccountSettingsPanel";
import { NotificationsPanel } from "./panels/NotificationsPanel";
import { DeleteAccountPanel } from "./panels/DeleteAccountPanel";
import { ContactSupportPanel } from "./panels/ContactSupportPanel";
import { logToSupabase } from "@/utils/batchedLogManager";
import { useAuth } from "@/contexts/AuthContext";

export const SettingsModal = () => {
  const { isOpen, closeSettings, activePanel, setActivePanel } = useSettingsModal();
  const { signOut } = useAuth();

  // Log when the active panel changes
  useEffect(() => {
    if (isOpen) {
      logToSupabase("Settings panel changed in modal", {
        level: 'info',
        page: 'SettingsModal',
        data: { panel: activePanel }
      });
    }
  }, [activePanel, isOpen]);

  const handleTabChange = (value: "general" | "account" | "notifications" | "delete" | "support") => {
    setActivePanel(value);
    
    logToSupabase("Settings tab changed via sidebar", {
      level: 'info',
      page: 'SettingsModal',
      data: { panel: value }
    });
  };

  const handleLogout = () => {
    logToSupabase("User logged out from settings modal", {
      level: 'info',
      page: 'SettingsModal'
    });
    
    signOut();
    closeSettings();
  };

  const tabs = [
    { id: "general", label: "General", icon: SettingsIcon },
    { id: "account", label: "Account", icon: User },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "support", label: "Support", icon: LifeBuoy },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) closeSettings();
    }}>
      <DialogContent className="sm:max-w-[800px] h-[80vh] p-0 flex flex-col" aria-describedby="settings-description">
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <div id="settings-description" className="sr-only">Manage your account settings, notifications, and other preferences</div>
        
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-semibold">Settings</h2>
          <DialogClose asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={closeSettings}
            >
              <X size={20} className="text-gray-800 hover:text-gray-900" />
            </Button>
          </DialogClose>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left sidebar */}
          <div className="w-[200px] border-r p-4">
            <nav>
              <ul className="space-y-1">
                {tabs.map((tab) => (
                  <li key={tab.id}>
                    <Button
                      variant={activePanel === tab.id ? "secondary" : "ghost"}
                      className={`w-full justify-start ${
                        activePanel === tab.id 
                          ? "bg-accent text-accent-foreground" 
                          : "text-gray-700 hover:bg-gray-200 hover:text-gray-900"
                      }`}
                      onClick={() => handleTabChange(tab.id as "general" | "account" | "notifications" | "support")}
                    >
                      <tab.icon className="mr-2 h-4 w-4" />
                      <span>{tab.label}</span>
                    </Button>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Main content area */}
          <div className="flex-1 overflow-y-auto p-6">
            <Tabs value={activePanel} className="h-full">
              <TabsContent value="general" className="mt-0 h-full">
                <div className="p-6 bg-white rounded-lg shadow">
                  <div className="space-y-4">
                    {/* Logout Button */}
                    <div>
                      <Button 
                        variant="outline" 
                        onClick={handleLogout}
                        className="w-full justify-start text-gray-700 hover:bg-gray-200 hover:text-gray-900 rounded-full border-gray-300"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Logout</span>
                      </Button>
                    </div>
                    
                    {/* Delete Account Section */}
                    <div className="pt-6 border-t">
                      <h3 className="text-lg font-medium text-red-600 mb-2 flex items-center">
                        <Trash2 className="h-5 w-5 mr-2" />
                        Danger Zone
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Permanently delete your account and all of your data.
                      </p>
                      <Button 
                        variant="destructive" 
                        onClick={() => handleTabChange("delete")}
                        className="bg-red-600 hover:bg-red-700 rounded-full w-full justify-start"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Account
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="account" className="mt-0 h-full">
                <AccountSettingsPanel />
              </TabsContent>
              
              <TabsContent value="notifications" className="mt-0 h-full">
                <NotificationsPanel />
              </TabsContent>
              
              <TabsContent value="support" className="mt-0 h-full">
                <ContactSupportPanel />
              </TabsContent>
              
              <TabsContent value="delete" className="mt-0 h-full">
                <DeleteAccountPanel />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
