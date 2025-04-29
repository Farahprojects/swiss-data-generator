
import { useState } from "react";
import { SettingsSidebar } from "./SettingsSidebar";
import { AccountSettingsPanel } from "./panels/AccountSettingsPanel";
import { BillingPanel } from "./panels/BillingPanel";
import { ApiKeysPanel } from "./panels/ApiKeysPanel";
import { DeleteAccountPanel } from "./panels/DeleteAccountPanel";

export const UserSettingsLayout = () => {
  const [activePanel, setActivePanel] = useState("account");
  
  const renderPanel = () => {
    switch (activePanel) {
      case "account":
        return <AccountSettingsPanel />;
      case "billing":
        return <BillingPanel />;
      case "apikeys":
        return <ApiKeysPanel />;
      case "delete":
        return <DeleteAccountPanel />;
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
