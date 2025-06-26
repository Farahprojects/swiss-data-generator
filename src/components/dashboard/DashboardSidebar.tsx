
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
  Trash,
  Calendar,
  User,
  Image,
  Briefcase,
  Settings,
  Palette,
  ArrowLeft,
  Crown,
  Type,
  Grid3x3,
  MousePointer,
  Layout
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

// Props for website builder
interface WebsiteBuilderMenuProps {
  isWebsiteBuilderPageMobile?: boolean;
  onOpenModal?: (section: string) => void;
  onChangeTemplate?: () => void;
}

interface MessageMenuProps {
  isMessagesPageMobile?: boolean;
  activeFilter?: MessageFilterType;
  unreadCount?: number;
  onFilterChange?: (filter: MessageFilterType) => void;
}

interface SidebarMenuProps extends MessageMenuProps, WebsiteBuilderMenuProps {}

const sidebarItems = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Calendar", href: "/dashboard/calendar", icon: Calendar },
  { name: "Clients", href: "/dashboard/clients", icon: Users },
  { name: "Messages", href: "/dashboard/messages", icon: Mail },
  { name: "Reports", href: "/dashboard/reports", icon: FileText },
  { name: "Create Report", href: "/dashboard/reports/create", icon: FilePlus },
  { name: "Website Builder", href: "/dashboard/website-builder", icon: Globe },
];

// Filtered navigation for website builder mobile (only show key items)
const websiteBuilderMobileNav = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Clients", href: "/dashboard/clients", icon: Users },
  { name: "Messages", href: "/dashboard/messages", icon: Mail },
  { name: "Website Builder", href: "/dashboard/website-builder", icon: Globe },
];

const messageMenuItems = [
  { name: "Inbox", filter: "inbox", icon: Inbox },
  { name: "Sent", filter: "sent", icon: Send },
  { name: "Starred", filter: "starred", icon: Star },
  { name: "Archive", filter: "archive", icon: Archive },
  { name: "Trash", filter: "trash", icon: Trash },
];

const websiteBuilderSections = [
  { id: 'hero', label: 'Hero', icon: Crown },
  { id: 'intro', label: 'Intro', icon: Type },
  { id: 'images', label: 'Images', icon: Image },
  { id: 'services', label: 'Services', icon: Grid3x3 },
  { id: 'cta', label: 'CTA', icon: MousePointer },
  { id: 'footer', label: 'Footer', icon: Layout },
];

// Combined navigation menu for mobile use (shows both dashboard & message filters if relevant)
export function SimpleSidebarMenu(props: SidebarMenuProps) {
  const location = useLocation();

  // Use filtered navigation for website builder mobile view
  const navigationItems = props.isWebsiteBuilderPageMobile ? websiteBuilderMobileNav : sidebarItems;

  return (
    <div className="flex h-full w-full flex-col bg-sidebar">
      <div className="flex flex-1 flex-col gap-2 overflow-auto p-2">
        {/* Website Builder section editing (visible only if website builder page on mobile) */}
        {props.isWebsiteBuilderPageMobile && (
          <div className="relative flex w-full min-w-0 flex-col p-2">
            <div className="mb-2 text-xs font-semibold text-muted-foreground/80 tracking-wide select-none">Edit Sections</div>
            <div className="w-full text-sm">
              <ul className="flex w-full min-w-0 flex-col gap-1">
                {websiteBuilderSections.map((section) => (
                  <li key={section.id} className="group/menu-item relative">
                    <button
                      className="flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none transition-all duration-200 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 text-foreground hover:bg-accent hover:text-accent-foreground"
                      onClick={() => props.onOpenModal?.(section.id)}
                      type="button"
                    >
                      <section.icon />
                      <span>{section.label}</span>
                    </button>
                  </li>
                ))}
                
                {/* Templates Button */}
                <li className="group/menu-item relative mt-2 pt-2 border-t border-gray-200">
                  <button
                    className="flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none transition-all duration-200 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 text-foreground hover:bg-accent hover:text-accent-foreground"
                    onClick={() => props.onChangeTemplate?.()}
                    type="button"
                  >
                    <ArrowLeft />
                    <span>Change Template</span>
                  </button>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Add separator only if we have website builder section above */}
        {props.isWebsiteBuilderPageMobile && (
          <hr className="my-3 border-t border-gray-300 opacity-60" />
        )}

        {/* Dashboard navigation section */}
        <div className="relative flex w-full min-w-0 flex-col p-2">
          <div className="mb-2 text-xs font-semibold text-muted-foreground/80 tracking-wide select-none">Navigation</div>
          <div className="w-full text-sm">
            <ul className="flex w-full min-w-0 flex-col gap-1">
              {navigationItems.map((item) => {
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
