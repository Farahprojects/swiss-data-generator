
import { useState, useEffect, useRef } from "react";
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
  const isInitialMount = useRef(true);
  const validPanels = ["account", "notifications", "delete", "support"];
  
  // Effect to sync URL parameters with the active panel once on initial mount
  useEffect(() => {
    // Get panel from URL query parameter
    const searchParams = new URLSearchParams(location.search);
    const panel = searchParams.get("panel");
    
    // Initial mount - set panel from URL or default to account
    if (isInitialMount.current) {
      if (panel && validPanels.includes(panel)) {
        setActivePanel(panel);
        
        logToSupabase("Settings panel initialized from URL", {
          level: 'info',
          page: 'UserSettingsLayout',
          data: { panel, pathname: location.pathname }
        });
      } else {
        // If invalid or missing panel parameter, set to account and update URL
        setActivePanel("account");
        
        // Only navigate if we need to change the URL
        if (panel !== "account") {
          navigate("/dashboard/settings?panel=account", { replace: true });
          
          logToSupabase("Initialized settings with default panel", {
            level: 'info',
            page: 'UserSettingsLayout',
            data: { originalPanel: panel }
          });
        }
      }
      
      isInitialMount.current = false;
    }
    // After initial mount - respond to URL changes
    else if (panel && validPanels.includes(panel) && panel !== activePanel) {
      setActivePanel(panel);
      
      logToSupabase("Settings panel changed from URL", {
        level: 'info',
        page: 'UserSettingsLayout',
        data: { panel, pathname: location.pathname }
      });
    }
  }, [location.search, navigate]);
  
  // Handle panel changes from sidebar and update URL
  const handlePanelChange = (panelId: string) => {
    if (panelId !== activePanel) {
      setActivePanel(panelId);
    
      // Update URL to reflect panel change
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
