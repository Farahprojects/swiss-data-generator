
import { useEffect } from "react";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useSettingsModal } from "@/contexts/SettingsModalContext";
import { AccountSettingsPanel } from "./account/AccountSettingsPanel";
import { NotificationsPanel } from "./panels/NotificationsPanel";
import { DeleteAccountPanel } from "./panels/DeleteAccountPanel";
import { ContactSupportPanel } from "./panels/ContactSupportPanel";
import { logToSupabase } from "@/utils/batchedLogManager";

export const SettingsModal = () => {
  const { isOpen, closeSettings, activePanel, setActivePanel } = useSettingsModal();

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

  const handleTabChange = (value: "account" | "notifications" | "delete" | "support") => {
    setActivePanel(value);
  };

  const tabs = [
    { id: "account", label: "Account" },
    { id: "notifications", label: "Notifications" },
    { id: "support", label: "Support" },
    { id: "delete", label: "Delete Account" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) closeSettings();
    }}>
      <DialogContent className="sm:max-w-[800px] h-[80vh] p-0 flex flex-col">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-semibold">Settings</h2>
          <DialogClose asChild>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={closeSettings} 
              className="rounded-full hover:bg-gray-300 border-2 border-gray-400 transition-all duration-300"
            >
              <X size={20} className="text-gray-800 hover:text-gray-900" />
            </Button>
          </DialogClose>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left sidebar - removed box styling */}
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
                      onClick={() => handleTabChange(tab.id as "account" | "notifications" | "delete" | "support")}
                    >
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
