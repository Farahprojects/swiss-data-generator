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
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeSettings()}>
      <DialogContent className="sm:max-w-[800px] h-[80vh] p-0 flex flex-col">
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-semibold">Settings</h2>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" onClick={closeSettings}>
              <X size={20} className="text-gray-800 hover:text-gray-900" />
            </Button>
          </DialogClose>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
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
                      onClick={() => handleTabChange(tab.id as typeof activePanel)}
                    >
                      <tab.icon className="mr-2 h-4 w-4" />
                      {tab.label}
                    </Button>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Main Panel */}
          <div className="flex-1 overflow-y-auto p-6">
            <Tabs value={activePanel}>
              <TabsContent value="general" className="mt-0 space-y-6">
                {/* Logout */}
                <div className="border rounded-lg p-5 shadow-sm bg-white">
                  <h3 className="text-base font-medium mb-2">Session</h3>
                  <Button 
                    variant="outline" 
                    onClick={handleLogout}
                    className="w-full justify-start text-gray-700 hover:bg-gray-100 border-gray-300 rounded-md"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </Button>
                </div>

                {/* Danger Zone */}
                <div className="border rounded-lg p-5 shadow-sm bg-white">
                  <h3 className="text-base font-semibold text-red-600 mb-2 flex items-center">
                    <Trash2 className="mr-2 h-5 w-5" />
                    Danger Zone
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Permanently delete your account and all of your data. This action is irreversible.
                  </p>
                  <Button 
                    variant="destructive" 
                    onClick={() => handleTabChange("delete")}
                    className="w-full justify-start rounded-md"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Account
                  </Button>
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
