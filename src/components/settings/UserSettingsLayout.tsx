
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { SettingsSidebar } from "./SettingsSidebar";
import { AccountSettingsPanel } from "./account/AccountSettingsPanel";
import { DeleteAccountPanel } from "./panels/DeleteAccountPanel";
import { ContactSupportPanel } from "./panels/ContactSupportPanel";
import { NotificationsPanel } from "./panels/NotificationsPanel";

export const UserSettingsLayout = () => {
  const [activePanel, setActivePanel] = useState("account");
  const location = useLocation();
  
  useEffect(() => {
    // Get panel from URL query parameter
    const searchParams = new URLSearchParams(location.search);
    const panel = searchParams.get("panel");
    
    if (panel && ["account", "notifications", "delete", "support"].includes(panel)) {
      setActivePanel(panel);
    } else if (panel === "billing" || panel === "apikeys") {
      // If 'billing' or 'apikeys' is requested but no longer available, default to account
      setActivePanel("account");
    }
  }, [location]);
  
  const renderPanel = () => {
    switch (activePanel) {
      case "account":
        return <AccountSettingsPanel />;
      case "notifications":
        return <NotificationsPanel />;
      case "delete":
        return <DeleteAccountPanel />;
      case "support":
        return <ContactSupportPanel />;
      default:
        return <AccountSettingsPanel />;
    }
  };

  return (
    <div className="flex">
      <SettingsSidebar 
        activeItem={activePanel} 
        onSelectItem={setActivePanel} 
      />
      <div className="flex-1 p-6">
        {renderPanel()}
      </div>
    </div>
  );
};
