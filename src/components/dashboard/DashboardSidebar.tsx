
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Sidebar, 
  SidebarContent, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton,
  SidebarTrigger,
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
  Menu
} from 'lucide-react';
import { Button } from '@/components/ui/button';

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
      path: "/dashboard?tab=api-keys",
      icon: <Key size={20} />
    },
    {
      name: "Activity Logs",
      path: "/dashboard/activity-logs",
      icon: <Activity size={20} />
    },
    {
      name: "Pricing",
      path: "/dashboard?tab=pricing",
      icon: <DollarSign size={20} />
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

  // Mobile sidebar trigger for small screens
  const MobileSidebarTrigger = () => {
    const { toggleSidebar } = useSidebar();
    
    return (
      <Button 
        variant="ghost" 
        size="icon" 
        className="md:hidden fixed top-16 left-2 z-40 bg-white/80 backdrop-blur-sm shadow-sm rounded-full"
        onClick={toggleSidebar}
      >
        <Menu size={20} />
        <span className="sr-only">Toggle sidebar</span>
      </Button>
    );
  };

  return (
    <>
      <MobileSidebarTrigger />
      <Sidebar 
        variant="sidebar" 
        collapsible="icon" 
        className="border-r border-gray-200"
      >
        <SidebarContent className="pt-16">
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
    </>
  );
};

export default DashboardSidebar;
