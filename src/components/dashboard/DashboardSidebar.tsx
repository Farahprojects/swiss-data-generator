
import { Link, useLocation } from "react-router-dom";
import { 
  Home, 
  Users, 
  FileText, 
  Globe,
  FilePlus
} from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { Sheet, SheetContent } from "@/components/ui/sheet";

const sidebarItems = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Clients", href: "/dashboard/clients", icon: Users },
  { name: "Reports", href: "/dashboard/reports", icon: FileText },
  { name: "Create Report", href: "/dashboard/reports/create", icon: FilePlus },
  { name: "Website Builder", href: "/dashboard/website-builder", icon: Globe },
];

export function DashboardSidebar() {
  const location = useLocation();
  const { openMobile, setOpenMobile } = useSidebar();

  const handleLinkClick = () => {
    setOpenMobile(false);
  };

  return (
    <Sheet open={openMobile} onOpenChange={setOpenMobile}>
      <SheetContent side="left" className="w-64 p-0">
        <div className="flex flex-col h-full bg-white">
          <div className="flex-1 py-4">
            <div className="px-3 py-2">
              <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
                Menu
              </h2>
              <div className="space-y-1">
                {sidebarItems.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={handleLinkClick}
                      className={`flex items-center rounded-lg px-3 py-2 text-sm font-medium hover:bg-gray-100 ${
                        isActive 
                          ? 'bg-gray-100 text-gray-900' 
                          : 'text-gray-700 hover:text-gray-900'
                      }`}
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="p-4 border-t">
            <div className="text-xs text-gray-600 text-center">
              <div>© {new Date().getFullYear()} Therai Astro.</div>
              <div>All rights reserved.</div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
