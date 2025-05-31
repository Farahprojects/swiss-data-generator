
import { useLocation, Link } from 'react-router-dom';
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
  DollarSign,
  FilePlus
} from 'lucide-react';

const DashboardSidebar = () => {
  const location = useLocation();
  const { state } = useSidebar();
  
  // Define menu items with proper routes
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
      path: "/dashboard/pricing",
      icon: <DollarSign size={20} />
    },
    {
      name: "Reports",
      path: "/dashboard/reports",
      icon: <FileText size={20} />
    },
    {
      name: "Create Report",
      path: "/dashboard/create-report",
      icon: <FilePlus size={20} />
    },
    {
      name: "Documentation",
      path: "/dashboard/docs",
      icon: <FileQuestion size={20} />
    },
    {
      name: "Billing",
      path: "/dashboard/billing",
      icon: <CreditCard size={20} />
    }
  ];

  // Simple function to check if a route is active
  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return location.pathname === "/dashboard";
    }
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
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
                asChild
                isActive={isActive(item.path)}
                className="text-black hover:text-primary data-[active=true]:text-primary data-[active=true]:bg-accent/20 flex items-center gap-3 px-4 py-2 w-full"
                tooltip={state === "collapsed" ? item.name : undefined}
              >
                <Link to={item.path}>
                  {item.icon}
                  <span>{item.name}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
};

export default DashboardSidebar;
