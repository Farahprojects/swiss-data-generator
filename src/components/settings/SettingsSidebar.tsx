
import { useAuth } from "@/contexts/AuthContext";
import { UserAvatar } from "./UserAvatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  CreditCard, 
  Key, 
  LogOut, 
  Settings, 
  Trash2
} from "lucide-react";

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

  const menuItems: MenuItem[] = [
    { id: 'account', label: 'Account Settings', icon: <Settings size={18} /> },
    { id: 'billing', label: 'Billing & Subscription', icon: <CreditCard size={18} /> },
    { id: 'apikeys', label: 'API Keys', icon: <Key size={18} /> },
    { id: 'support', label: 'Support', icon: null },
    { id: 'delete', label: 'Delete Account', icon: <Trash2 size={18} /> },
  ];

  const handleLogout = async () => {
    await signOut();
    window.location.href = '/login';
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
                onClick={() => onSelectItem(item.id)}
              >
                {item.icon && item.icon}
                <span className={`${item.icon ? "ml-3" : ""}`}>{item.label}</span>
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
