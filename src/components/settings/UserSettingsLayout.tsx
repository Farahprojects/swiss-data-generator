// UserSettingsLayout.tsx  (drop-in replacement)
import { useMemo, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SettingsSidebar } from "./SettingsSidebar";
import { AccountSettingsPanel } from "./account/AccountSettingsPanel";
import { DeleteAccountPanel } from "./panels/DeleteAccountPanel";
import { ContactSupportPanel } from "./panels/ContactSupportPanel";
import { NotificationsPanel } from "./panels/NotificationsPanel";
import { logToSupabase } from "@/utils/batchedLogManager";

type Panel = "account" | "notifications" | "delete" | "support";

const ALLOWED: Panel[] = ["account", "notifications", "delete", "support"];

export const UserSettingsLayout = () => {
  const location  = useLocation();
  const navigate  = useNavigate();

  // 1️⃣ read it **once** per render
  const panelFromURL = useMemo<Panel>(() => {
    const p = new URLSearchParams(location.search).get("panel") as Panel | null;
    return ALLOWED.includes(p as Panel) ? (p as Panel) : "account";
  }, [location.search]);

  // 2️⃣ only *correct* the URL if it’s invalid
  useEffect(() => {
    if (!location.search.includes("panel=")) {
      navigate(`/dashboard/settings?panel=${panelFromURL}`, { replace: true });
    }
  }, [location.search, navigate, panelFromURL]);

  const renderPanel = () => {
    switch (panelFromURL) {
      case "account":       return <AccountSettingsPanel />;
      case "notifications": return <NotificationsPanel   />;
      case "delete":        return <DeleteAccountPanel   />;
      case "support":       return <ContactSupportPanel  />;
      default:              return <AccountSettingsPanel />;
    }
  };

  return (
    <div className="flex">
      <SettingsSidebar
        activeItem={panelFromURL}
        onSelectItem={(p: Panel) =>
          navigate(`/dashboard/settings?panel=${p}`, { replace: true })
        }
      />
      <div className="flex-1 p-6">{renderPanel()}</div>
    </div>
  );
};
