
import { Link, useLocation } from "react-router-dom";
import { 
  Home, 
  Users, 
  FileText, 
  Globe,
  FilePlus,
  Mail
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";

const sidebarItems = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Clients", href: "/dashboard/clients", icon: Users },
  { name: "Messages", href: "/dashboard/messages", icon: Mail },
  { name: "Reports", href: "/dashboard/reports", icon: FileText },
  { name: "Create Report", href: "/dashboard/reports/create", icon: FilePlus },
  { name: "Website Builder", href: "/dashboard/website-builder", icon: Globe },
];

// Simple navigation menu for mobile use (without Sidebar context)
export function SimpleSidebarMenu() {
  const location = useLocation();

  return (
    <div className="p-4">
      <nav className="space-y-2">
        {sidebarItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
      
      <div className="mt-8 p-2 text-xs text-gray-600 text-center border-t">
        <div>© {new Date().getFullYear()} Therai Astro.</div>
        <div>All rights reserved.</div>
      </div>
    </div>
  );
}

// Full sidebar component for desktop use (with Sidebar context)
export function DashboardSidebar() {
  const location = useLocation();

  return (
    <Sidebar variant="inset">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {sidebarItems.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link to={item.href} className="text-black hover:text-white">
                        <item.icon />
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="p-2 text-xs text-gray-600 text-center">
          <div>© {new Date().getFullYear()} Therai Astro.</div>
          <div>All rights reserved.</div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
