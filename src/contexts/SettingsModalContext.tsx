
import React, { createContext, useContext, useState } from "react";
import { logToSupabase } from "@/utils/batchedLogManager";

type SettingsPanelType = "account" | "notifications" | "delete" | "support";

interface SettingsModalContextProps {
  isOpen: boolean;
  activePanel: SettingsPanelType;
  openSettings: (panel?: SettingsPanelType) => void;
  closeSettings: () => void;
  setActivePanel: (panel: SettingsPanelType) => void;
}

const SettingsModalContext = createContext<SettingsModalContextProps | undefined>(undefined);

export const SettingsModalProvider = ({ children }: { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<SettingsPanelType>("account");

  const openSettings = (panel?: SettingsPanelType) => {
    if (panel) {
      setActivePanel(panel);
      
      logToSupabase("Settings modal opened with panel", {
        level: 'info',
        page: 'SettingsModalContext',
        data: { panel }
      });
    }
    
    setIsOpen(true);
  };

  const closeSettings = () => {
    setIsOpen(false);
    
    logToSupabase("Settings modal closed", {
      level: 'info',
      page: 'SettingsModalContext'
    });
  };

  return (
    <SettingsModalContext.Provider 
      value={{ 
        isOpen, 
        activePanel, 
        openSettings, 
        closeSettings, 
        setActivePanel 
      }}
    >
      {children}
    </SettingsModalContext.Provider>
  );
};

export const useSettingsModal = () => {
  const context = useContext(SettingsModalContext);
  
  if (context === undefined) {
    throw new Error("useSettingsModal must be used within a SettingsModalProvider");
  }
  
  return context;
};
