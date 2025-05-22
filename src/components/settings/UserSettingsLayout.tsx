
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SettingsSidebar } from "./SettingsSidebar";
import { AccountSettingsPanel } from "./account/AccountSettingsPanel";
import { DeleteAccountPanel } from "./panels/DeleteAccountPanel";
import { ContactSupportPanel } from "./panels/ContactSupportPanel";
import { NotificationsPanel } from "./panels/NotificationsPanel";
import { logToSupabase } from "@/utils/batchedLogManager";

export const UserSettingsLayout = () => {
  const [activePanel, setActivePanel] = useState("account");
  const location = useLocation();
  const navigate = useNavigate();
  
  // Effect to sync URL parameters with the active panel
  useEffect(() => {
    // Get panel from URL query parameter
    const searchParams = new URLSearchParams(location.search);
    const panel = searchParams.get("panel");
    
    if (panel && ["account", "notifications", "delete", "support"].includes(panel)) {
      setActivePanel(panel);
      
      logToSupabase("Settings panel changed from URL", {
        level: 'info',
        page: 'UserSettingsLayout',
        data: { panel, pathname: location.pathname }
      });
    } else if (panel === "billing" || panel === "apikeys") {
      // If 'billing' or 'apikeys' is requested but no longer available, default to account
      setActivePanel("account");
      // Update URL to match
      navigate("/dashboard/settings?panel=account", { replace: true });
    } else if (!panel) {
      // If no panel is specified in URL, default to account and update URL
      setActivePanel("account");
      navigate("/dashboard/settings?panel=account", { replace: true });
    }
  }, [location.search, navigate]);
  
  // Handle panel changes from sidebar and update URL
  const handlePanelChange = (panelId: string) => {
    setActivePanel(panelId);
    
    // Update URL to reflect panel change (if not already matching)
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get("panel") !== panelId) {
      navigate(`/dashboard/settings?panel=${panelId}`, { replace: true });
      
      logToSupabase("Settings panel changed from sidebar", {
        level: 'info',
        page: 'UserSettingsLayout',
        data: { panel: panelId }
      });
    }
  };
  
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

  // If we're on the root path without /dashboard/settings, redirect to the settings page
  useEffect(() => {
    if (location.pathname === "/") {
      navigate("/dashboard/settings?panel=account", { replace: true });
    }
  }, [location.pathname, navigate]);

  return (
    <div className="flex">
      <SettingsSidebar 
        activeItem={activePanel} 
        onSelectItem={handlePanelChange} 
      />
      <div className="flex-1 p-6">
        {renderPanel()}
      </div>
    </div>
  );
};
