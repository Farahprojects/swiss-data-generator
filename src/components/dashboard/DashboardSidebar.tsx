
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Sidebar, 
  SidebarContent, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton
} from "@/components/ui/sidebar";
import { 
  LayoutDashboard, 
  Key, 
  Activity, 
  FileText, 
  FileQuestion, 
  CreditCard 
} from 'lucide-react';

const DashboardSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const menuItems = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: <LayoutDashboard size={20} />
    },
    {
      name: "API Keys",
      path: "/dashboard?tab=api-keys",
      icon: <Key size={20} />
    },
    {
      name: "Activity Logs",
      path: "/dashboard/activity-logs",
      icon: <Activity size={20} />
    },
    {
      name: "Reports",
      path: "/dashboard?tab=usage",
      icon: <FileText size={20} />
    },
    {
      name: "Documentation",
      path: "/dashboard?tab=docs",
      icon: <FileQuestion size={20} />
    },
    {
      name: "Billing",
      path: "/dashboard?tab=billing",
      icon: <CreditCard size={20} />
    }
  ];

  const isPathActive = (path: string) => {
    if (path === "/dashboard" && location.pathname === "/dashboard" && !location.search) {
      return true;
    }
    
    if (path.includes('?tab=') && location.search.includes(path.split('?tab=')[1])) {
      return true;
    }
    
    return location.pathname === path;
  };

  return (
    <Sidebar variant="sidebar" collapsible="icon" className="border-r border-gray-200">
      <SidebarContent className="pt-16"> {/* Increased padding-top from pt-4 to pt-16 */}
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.name}>
              <SidebarMenuButton 
                isActive={isPathActive(item.path)}
                className="text-black hover:text-primary data-[active=true]:text-primary data-[active=true]:bg-accent/20 flex items-center gap-3 px-4 py-2 w-full"
                onClick={() => {
                  if (item.path.includes('?tab=')) {
                    const [path, params] = item.path.split('?tab=');
                    navigate(`${path}?tab=${params}`);
                  } else {
                    navigate(item.path);
                  }
                }}
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
