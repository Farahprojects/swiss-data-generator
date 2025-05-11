
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { SettingsSidebar } from "./SettingsSidebar";
import { AccountSettingsPanel } from "./panels/AccountSettingsPanel";
import { ApiKeysPanel } from "./panels/ApiKeysPanel";
import { DeleteAccountPanel } from "./panels/DeleteAccountPanel";
import { ContactSupportPanel } from "./panels/ContactSupportPanel";

export const UserSettingsLayout = () => {
  const [activePanel, setActivePanel] = useState("account");
  const location = useLocation();
  
  useEffect(() => {
    // Get panel from URL query parameter
    const searchParams = new URLSearchParams(location.search);
    const panel = searchParams.get("panel");
    
    if (panel && ["account", "apikeys", "delete", "support"].includes(panel)) {
      setActivePanel(panel);
    } else if (panel === "billing") {
      // If 'billing' is requested but no longer available, default to account
      setActivePanel("account");
    }
  }, [location]);
  
  const renderPanel = () => {
    switch (activePanel) {
      case "account":
        return <AccountSettingsPanel />;
      case "apikeys":
        return <ApiKeysPanel />;
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
