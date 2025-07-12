
const logToSupabase = () => {};
import { useEffect } from "react";
import { Dialog, DialogContent, DialogClose, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { X, User, Bell, LifeBuoy, Settings as SettingsIcon, LogOut, Trash2, CreditCard } from "lucide-react";
import { useSettingsModal } from "@/contexts/SettingsModalContext";
import { AccountSettingsPanel } from "./account/AccountSettingsPanel";
import { NotificationsPanel } from "./panels/NotificationsPanel";
import { DeleteAccountPanel } from "./panels/DeleteAccountPanel";
import { ContactSupportPanel } from "./panels/ContactSupportPanel";
import { BillingPanel } from "./panels/BillingPanel";

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

  const handleTabChange = (value) => {
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
    { id: "billing", label: "Billing", icon: CreditCard },
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
          <div className="w-[220px] border-r p-4">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <Button
                  key={tab.id}
                  variant="ghost"
                  className={`w-full justify-start ${
                    activePanel === tab.id ? "bg-muted font-semibold" : "text-gray-700 hover:bg-gray-100"
                  }`}
                  onClick={() => handleTabChange(tab.id)}
                >
                  <tab.icon className="mr-2 h-4 w-4" />
                  {tab.label}
                </Button>
              ))}
            </nav>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <Tabs value={activePanel} className="space-y-4">
              <TabsContent value="general">
                <div className="space-y-4 divide-y">
                  <div className="flex items-center justify-between py-3">
                    <span className="text-sm text-gray-800">Log out on this device</span>
                    <Button variant="outline" className="text-sm" onClick={handleLogout}>Log out</Button>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <span className="text-sm text-red-600">Delete account</span>
                    <Button variant="destructive" className="text-sm" onClick={() => handleTabChange("delete")}>Delete account</Button>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="account"><AccountSettingsPanel /></TabsContent>
              <TabsContent value="billing"><BillingPanel /></TabsContent>
              <TabsContent value="notifications"><NotificationsPanel /></TabsContent>
              <TabsContent value="support"><ContactSupportPanel /></TabsContent>
              <TabsContent value="delete"><DeleteAccountPanel /></TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
