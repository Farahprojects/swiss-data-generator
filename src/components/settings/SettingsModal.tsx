
import { useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  const handleTabChange = (value: string) => {
    setActivePanel(value as "account" | "notifications" | "delete" | "support");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) closeSettings();
    }}>
      <DialogContent className="sm:max-w-[900px] h-[80vh] p-0 flex flex-col">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-semibold">Settings</h2>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={closeSettings} 
            className="rounded-full hover:bg-gray-300 border-2 border-gray-400 transition-all duration-300"
          >
            <X size={20} className="text-gray-800 hover:text-gray-900" />
          </Button>
        </div>

        <div className="flex-1 overflow-auto">
          <Tabs 
            value={activePanel} 
            onValueChange={handleTabChange}
            className="flex flex-col h-full"
          >
            <div className="border-b px-6 py-2 bg-gray-50">
              <TabsList className="bg-transparent w-full flex justify-start space-x-4">
                <TabsTrigger value="account" className="data-[state=active]:bg-white">
                  Account
                </TabsTrigger>
                <TabsTrigger value="notifications" className="data-[state=active]:bg-white">
                  Notifications
                </TabsTrigger>
                <TabsTrigger value="support" className="data-[state=active]:bg-white">
                  Support
                </TabsTrigger>
                <TabsTrigger value="delete" className="data-[state=active]:bg-white text-red-500">
                  Delete Account
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
              <TabsContent value="account" className="mt-0">
                <AccountSettingsPanel />
              </TabsContent>
              <TabsContent value="notifications" className="mt-0">
                <NotificationsPanel />
              </TabsContent>
              <TabsContent value="support" className="mt-0">
                <ContactSupportPanel />
              </TabsContent>
              <TabsContent value="delete" className="mt-0">
                <DeleteAccountPanel />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
