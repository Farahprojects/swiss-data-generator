
import { Link, useLocation } from "react-router-dom";
import { 
  Home, 
  Users, 
  FileText, 
  BarChart3, 
  Key,
  CreditCard,
  Book,
  Globe
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";

const sidebarItems = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Clients", href: "/dashboard/clients", icon: Users },
  { name: "Reports", href: "/dashboard/reports", icon: FileText },
  { name: "Website Builder", href: "/dashboard/website-builder", icon: Globe },
  { name: "Usage", href: "/dashboard/usage", icon: BarChart3 },
  { name: "API Keys", href: "/dashboard/api-keys", icon: Key },
  { name: "Billing", href: "/dashboard/billing", icon: CreditCard },
  { name: "Documentation", href: "/dashboard/api-docs", icon: Book },
];

export function DashboardSidebar() {
  const location = useLocation();

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <div className="px-2 py-2">
          <h2 className="text-lg font-semibold tracking-tight">Dashboard</h2>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
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
        <div className="px-2 py-2">
          <p className="text-xs text-muted-foreground">
            Professional Dashboard v1.0
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
