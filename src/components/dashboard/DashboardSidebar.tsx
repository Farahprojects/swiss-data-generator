
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Sidebar, 
  SidebarContent, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton,
  useSidebar
} from "@/components/ui/sidebar";
import { 
  LayoutDashboard, 
  Key, 
  Activity, 
  FileText, 
  FileQuestion, 
  CreditCard,
  DollarSign
} from 'lucide-react';

const DashboardSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useSidebar();
  
  const menuItems = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: <LayoutDashboard size={20} />
    },
    {
      name: "API Keys",
      path: "/dashboard/api-keys",
      icon: <Key size={20} />
    },
    {
      name: "Activity Logs",
      path: "/dashboard/activity-logs",
      icon: <Activity size={20} />
    },
    {
      name: "Pricing",
      path: "/dashboard",
      tabParam: "pricing",
      icon: <DollarSign size={20} />
    },
    {
      name: "Reports",
      path: "/dashboard",
      tabParam: "usage",
      icon: <FileText size={20} />
    },
    {
      name: "Documentation",
      path: "/dashboard",
      tabParam: "docs",
      icon: <FileQuestion size={20} />
    },
    {
      name: "Billing",
      path: "/dashboard",
      tabParam: "billing",
      icon: <CreditCard size={20} />
    }
  ];

  const isPathActive = (path: string, tabParam?: string) => {
    // If it's a regular path (no tab parameter)
    if (!tabParam && path === location.pathname) {
      return !location.search; // Active only if no search params
    }
    
    // If this is a tab-based path
    if (tabParam && location.pathname === "/dashboard") {
      const searchParams = new URLSearchParams(location.search);
      return searchParams.get("tab") === tabParam;
    }
    
    return false;
  };

  const handleNavigation = (path: string, tabParam?: string) => {
    if (tabParam) {
      navigate(`${path}?tab=${tabParam}`, { replace: false });
    } else {
      navigate(path, { replace: false });
    }
  };

  return (
    <Sidebar 
      variant="sidebar" 
      collapsible="icon" 
      className="border-r border-gray-200"
    >
      <SidebarContent className="pt-6">
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.name}>
              <SidebarMenuButton 
                isActive={isPathActive(item.path, item.tabParam)}
                className="text-black hover:text-primary data-[active=true]:text-primary data-[active=true]:bg-accent/20 flex items-center gap-3 px-4 py-2 w-full"
                onClick={() => handleNavigation(item.path, item.tabParam)}
                tooltip={state === "collapsed" ? item.name : undefined}
              >
                {item.icon}
                <span>{item.name}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
};

export default DashboardSidebar;
