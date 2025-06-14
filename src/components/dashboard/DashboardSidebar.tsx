
import { Link, useLocation } from "react-router-dom";
import { 
  Home, 
  Users, 
  FileText, 
  Globe,
  FilePlus,
  Mail,
  Inbox,
  Send,
  Star,
  Archive,
  Trash
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

// Props for message filter
type MessageFilterType = "inbox" | "sent" | "starred" | "archive" | "trash";
interface MessageMenuProps {
  isMessagesPageMobile?: boolean;
  activeFilter?: MessageFilterType;
  unreadCount?: number;
  onFilterChange?: (filter: MessageFilterType) => void;
}

const sidebarItems = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Clients", href: "/dashboard/clients", icon: Users },
  { name: "Messages", href: "/dashboard/messages", icon: Mail },
  { name: "Reports", href: "/dashboard/reports", icon: FileText },
  { name: "Create Report", href: "/dashboard/reports/create", icon: FilePlus },
  { name: "Website Builder", href: "/dashboard/website-builder", icon: Globe },
];

const messageMenuItems = [
  { name: "Inbox", filter: "inbox", icon: Inbox },
  { name: "Sent", filter: "sent", icon: Send },
  { name: "Starred", filter: "starred", icon: Star },
  { name: "Archive", filter: "archive", icon: Archive },
  { name: "Trash", filter: "trash", icon: Trash },
];

// Combined navigation menu for mobile use (shows both dashboard & message filters if relevant)
export function SimpleSidebarMenu(props: MessageMenuProps) {
  const location = useLocation();

  return (
    <div className="flex h-full w-full flex-col bg-sidebar">
      <div className="flex flex-1 flex-col gap-2 overflow-auto p-2">
        {/* Dashboard navigation section */}
        <div className="relative flex w-full min-w-0 flex-col p-2">
          <div className="mb-2 text-xs font-semibold text-muted-foreground/80 tracking-wide select-none">Navigation</div>
          <div className="w-full text-sm">
            <ul className="flex w-full min-w-0 flex-col gap-1">
              {sidebarItems.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <li key={item.name} className="group/menu-item relative">
                    <Link
                      to={item.href}
                      className={`peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none transition-all duration-200 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 ${
                        isActive 
                          ? 'bg-accent text-accent-foreground font-medium' 
                          : 'text-foreground hover:bg-accent hover:text-accent-foreground'
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
        {/* Message filters section (visible only if messages page on mobile) */}
        {props.isMessagesPageMobile && (
          <>
            <hr className="my-3 border-t border-gray-300 opacity-60" />
            <div className="relative flex w-full min-w-0 flex-col p-2">
              <div className="mb-2 text-xs font-semibold text-muted-foreground/80 tracking-wide select-none">Message Filters</div>
              <div className="w-full text-sm">
                <ul className="flex w-full min-w-0 flex-col gap-1">
                  {messageMenuItems.map((item) => (
                    <li key={item.filter} className="group/menu-item relative">
                      <button
                        className={`flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none transition-all duration-200 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 ${
                          props.activeFilter === item.filter
                            ? 'bg-accent text-accent-foreground font-medium'
                            : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                        }`}
                        onClick={() => props.onFilterChange?.(item.filter as MessageFilterType)}
                        aria-current={props.activeFilter === item.filter ? "page" : undefined}
                        type="button"
                      >
                        <item.icon />
                        <span>{item.name}</span>
                        {/* Show unread badge only for Inbox */}
                        {item.filter === "inbox" && props.unreadCount && props.unreadCount > 0 && (
                          <span className="ml-auto bg-blue-500 text-white rounded-full px-2 py-0.5 text-xs">{props.unreadCount}</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        )}
      </div>
      <div className="flex flex-col gap-2 p-2">
        <div className="p-2 text-xs text-muted-foreground text-center">
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
                    <SidebarMenuButton asChild isActive={isActive} className="hover:bg-accent hover:text-accent-foreground data-[active=true]:bg-accent data-[active=true]:text-accent-foreground">
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
        <div className="p-2 text-xs text-muted-foreground text-center">
          <div>© {new Date().getFullYear()} Therai Astro.</div>
          <div>All rights reserved.</div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

