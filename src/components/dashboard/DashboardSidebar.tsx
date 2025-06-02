
import { useLocation, Link } from 'react-router-dom';
import { 
  Sidebar, 
  SidebarContent, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupContent,
  useSidebar
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { 
  LayoutDashboard, 
  Key, 
  Activity, 
  FileText, 
  FileQuestion, 
  CreditCard,
  DollarSign,
  FilePlus,
  User,
  Code,
  LifeBuoy,
  ChevronDown
} from 'lucide-react';
import { useState } from 'react';

const DashboardSidebar = () => {
  const location = useLocation();
  const { state } = useSidebar();
  const [isDeveloperOpen, setIsDeveloperOpen] = useState(true);
  const [isAccountOpen, setIsAccountOpen] = useState(true);
  
  // Always visible menu items
  const mainItems = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: <LayoutDashboard size={20} />
    },
    {
      name: "Create Report",
      path: "/dashboard/create-report",
      icon: <FilePlus size={20} />
    },
    {
      name: "Reports",
      path: "/dashboard/reports",
      icon: <FileText size={20} />
    },
    {
      name: "Activity Logs",
      path: "/dashboard/activity-logs",
      icon: <Activity size={20} />
    },
    {
      name: "Support",
      path: "/dashboard/support",
      icon: <LifeBuoy size={20} />
    }
  ];

  // Developer section items
  const developerItems = [
    {
      name: "API Keys",
      path: "/dashboard/api-keys",
      icon: <Key size={20} />
    },
    {
      name: "Documentation",
      path: "/dashboard/docs",
      icon: <FileQuestion size={20} />
    }
  ];

  // Account section items
  const accountItems = [
    {
      name: "Billing",
      path: "/dashboard/billing",
      icon: <CreditCard size={20} />
    },
    {
      name: "Pricing",
      path: "/dashboard/pricing",
      icon: <DollarSign size={20} />
    }
  ];

  // Simple function to check if a route is active
  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return location.pathname === "/dashboard";
    }
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const MenuItems = ({ items }: { items: typeof mainItems }) => (
    <>
      {items.map((item) => (
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
    </>
  );

  return (
    <Sidebar 
      variant="sidebar" 
      collapsible="icon" 
      className="border-r border-gray-200"
    >
      <SidebarContent className="pt-6">
        {/* Main always-visible items */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <MenuItems items={mainItems} />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Developer Section - Direct collapsible without SidebarGroup wrapper */}
        <div className="px-2">
          <Collapsible open={isDeveloperOpen} onOpenChange={setIsDeveloperOpen}>
            <SidebarMenu>
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    className="text-black hover:text-primary flex items-center gap-3 px-4 py-2 w-full data-[state=open]:bg-accent/10"
                    tooltip={state === "collapsed" ? "Developer" : undefined}
                  >
                    <Code size={20} />
                    <span>Developer</span>
                    <ChevronDown className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[collapsible=icon]:hidden data-[state=open]:rotate-180" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
              </SidebarMenuItem>
            </SidebarMenu>
            <CollapsibleContent>
              <SidebarMenu>
                <MenuItems items={developerItems} />
              </SidebarMenu>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Account Section - Direct collapsible without SidebarGroup wrapper */}
        <div className="px-2">
          <Collapsible open={isAccountOpen} onOpenChange={setIsAccountOpen}>
            <SidebarMenu>
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    className="text-black hover:text-primary flex items-center gap-3 px-4 py-2 w-full data-[state=open]:bg-accent/10"
                    tooltip={state === "collapsed" ? "Account" : undefined}
                  >
                    <User size={20} />
                    <span>Account</span>
                    <ChevronDown className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[collapsible=icon]:hidden data-[state=open]:rotate-180" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
              </SidebarMenuItem>
            </SidebarMenu>
            <CollapsibleContent>
              <SidebarMenu>
                <MenuItems items={accountItems} />
              </SidebarMenu>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </SidebarContent>
    </Sidebar>
  );
};

export default DashboardSidebar;
