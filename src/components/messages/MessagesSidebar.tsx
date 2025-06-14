
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Inbox, 
  Send, 
  Star, 
  Archive, 
  Trash2, 
  Settings, 
  Upload,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessagesSidebarProps {
  activeFilter: string;
  unreadCount: number;
  onFilterChange: (filter: string) => void;
  onOpenBranding: () => void;
  headerHeight?: number;
}

export const MessagesSidebar = ({
  activeFilter,
  unreadCount,
  onFilterChange,
  onOpenBranding,
  headerHeight = 72
}: MessagesSidebarProps) => {
  const navigationItems = [
    { id: 'inbox', label: 'Inbox', icon: Inbox, count: unreadCount },
    { id: 'sent', label: 'Sent', icon: Send },
    { id: 'starred', label: 'Starred', icon: Star },
    { id: 'archive', label: 'Archive', icon: Archive },
    { id: 'trash', label: 'Trash', icon: Trash2 },
  ];

  const brandingItems = [
    { id: 'signatures', label: 'Email Signatures', icon: FileText },
    { id: 'logo', label: 'Logo & Branding', icon: Upload },
    { id: 'templates', label: 'Email Templates', icon: FileText },
  ];

  return (
    <div
      className="w-64 bg-white border-r flex flex-col h-[calc(100vh-4rem)] fixed left-0 z-5"
      style={{ top: `calc(4rem + ${headerHeight}px)` }}
    >
      {/* Navigation - Scrollable content */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          <div className="space-y-1">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                className={cn(
                  "w-full flex items-center gap-3 h-10 rounded text-left px-3 py-2 transition-colors",
                  activeFilter === item.id
                    ? "bg-blue-50 text-blue-700 hover:bg-blue-100"
                    : "bg-transparent text-gray-700 hover:bg-gray-100"
                )}
                onClick={() => onFilterChange(item.id)}
                type="button"
              >
                <item.icon className="w-4 h-4" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.count && item.count > 0 && (
                  <Badge variant="secondary" className="ml-auto bg-blue-100 text-blue-700">
                    {item.count}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Branding Section */}
        <div className="border-t mt-4">
          <div className="p-3">
            <h3 className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Email Branding
            </h3>
            <div className="space-y-1">
              {brandingItems.map((item) => (
                <button
                  key={item.id}
                  className="w-full flex items-center gap-2 h-8 text-sm rounded hover:bg-gray-100 px-2 transition-colors"
                  type="button"
                  onClick={() => onOpenBranding()}
                >
                  <item.icon className="w-3 h-3" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

