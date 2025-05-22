
import { useAuth } from "@/contexts/AuthContext";
import { UserAvatar } from "./UserAvatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  LogOut, 
  Settings, 
  Trash2,
  HelpCircle,
  Bell
} from "lucide-react";
import { logToSupabase } from "@/utils/batchedLogManager";
import { useNavigate, useLocation } from "react-router-dom";

type MenuItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
};

type SettingsSidebarProps = {
  activeItem: string;
  onSelectItem: (id: string) => void;
};

export const SettingsSidebar = ({ activeItem, onSelectItem }: SettingsSidebarProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems: MenuItem[] = [
    { id: 'account', label: 'Account Settings', icon: <Settings size={18} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
    { id: 'support', label: 'Support', icon: <HelpCircle size={18} /> },
    { id: 'delete', label: 'Delete Account', icon: <Trash2 size={18} /> },
  ];

  const handleLogout = async () => {
    logToSupabase("User logged out from settings", {
      level: 'info',
      page: 'SettingsSidebar'
    });
    
    await signOut();
    window.location.href = '/login';
  };

  const handleMenuItemClick = (id: string) => {
    logToSupabase("Settings menu item clicked", {
      level: 'info',
      page: 'SettingsSidebar',
      data: { item: id }
    });
    
    // Update URL with the panel parameter
    navigate(`/dashboard/settings?panel=${id}`);
    
    // Also update the local state for immediate UI feedback
    onSelectItem(id);
  };

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 min-h-[calc(100vh-64px)] p-5 flex flex-col">
      <div className="flex flex-col items-center py-6">
        <UserAvatar size="lg" />
        <p className="mt-4 font-medium text-sm">{user?.email}</p>
      </div>
      
      <Separator className="my-4" />
      
      <nav className="flex-1">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.id}>
              <Button
                variant={activeItem === item.id ? "secondary" : "ghost"}
                className={`w-full justify-start ${
                  activeItem === item.id 
                    ? "bg-accent text-accent-foreground" 
                    : "text-gray-700 hover:bg-gray-200 hover:text-gray-900"
                }`}
                onClick={() => handleMenuItemClick(item.id)}
              >
                {item.icon}
                <span className="ml-3">{item.label}</span>
              </Button>
            </li>
          ))}
        </ul>
      </nav>
      
      <Separator className="my-4" />
      
      <Button 
        variant="ghost"
        className="w-full justify-start text-gray-700 hover:bg-gray-200 hover:text-gray-900"
        onClick={handleLogout}
      >
        <LogOut size={18} />
        <span className="ml-3">Logout</span>
      </Button>
    </div>
  );
};
