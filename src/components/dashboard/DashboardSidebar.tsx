
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
    <div className="flex h-full w-full flex-col bg-sidebar">
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto p-2">
        <div className="relative flex w-full min-w-0 flex-col p-2">
          <div className="w-full text-sm">
            <ul className="flex w-full min-w-0 flex-col gap-1">
              {sidebarItems.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <li key={item.name} className="group/menu-item relative">
                    <Link
                      to={item.href}
                      className={`peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 ${
                        isActive 
                          ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground' 
                          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                      }`}
                    >
                      <item.icon />
                      <span>{item.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2 p-2">
        <div className="p-2 text-xs text-sidebar-foreground/70 text-center">
          <div>© {new Date().getFullYear()} Therai Astro.</div>
          <div>All rights reserved.</div>
        </div>
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
                      <Link to={item.href}>
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
        <div className="p-2 text-xs text-sidebar-foreground/70 text-center">
          <div>© {new Date().getFullYear()} Therai Astro.</div>
          <div>All rights reserved.</div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
