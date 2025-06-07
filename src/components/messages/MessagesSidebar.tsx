
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Inbox, 
  Send, 
  Star, 
  Archive, 
  Trash2, 
  Settings, 
  Upload,
  FileText,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessagesSidebarProps {
  activeFilter: string;
  unreadCount: number;
  onFilterChange: (filter: string) => void;
  onCompose: () => void;
  onOpenBranding: () => void;
}

export const MessagesSidebar = ({
  activeFilter,
  unreadCount,
  onFilterChange,
  onCompose,
  onOpenBranding
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
    <div className="w-64 bg-white border-r flex flex-col">
      {/* Compose Button */}
      <div className="p-4 border-b">
        <Button onClick={onCompose} className="w-full flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Compose
        </Button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-auto">
        <div className="p-2">
          <div className="space-y-1">
            {navigationItems.map((item) => (
              <Button
                key={item.id}
                variant={activeFilter === item.id ? 'secondary' : 'ghost'}
                className={cn(
                  "w-full justify-start gap-3 h-10",
                  activeFilter === item.id && "bg-blue-50 text-blue-700 hover:bg-blue-100"
                )}
                onClick={() => onFilterChange(item.id)}
              >
                <item.icon className="w-4 h-4" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.count && item.count > 0 && (
                  <Badge variant="secondary" className="ml-auto bg-blue-100 text-blue-700">
                    {item.count}
                  </Badge>
                )}
              </Button>
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
                <Button
                  key={item.id}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2 h-8 text-sm"
                  onClick={() => onOpenBranding()}
                >
                  <item.icon className="w-3 h-3" />
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
