
import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { 
  Star, 
  StarOff, 
  Archive, 
  Trash2,
  MoreHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmailMessage {
  id: string;
  subject: string;
  body: string;
  from_address: string;
  to_address: string;
  direction: 'incoming' | 'outgoing';
  created_at: string;
  client_id?: string;
  sent_via: string;
  read?: boolean;
  starred?: boolean;
}

interface GmailMessageListProps {
  messages: EmailMessage[];
  selectedMessages: Set<string>;
  selectedMessage: EmailMessage | null;
  onSelectMessage: (message: EmailMessage) => void;
  onSelectMessageCheckbox: (messageId: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
}

export const GmailMessageList = ({
  messages,
  selectedMessages,
  selectedMessage,
  onSelectMessage,
  onSelectMessageCheckbox,
  onSelectAll
}: GmailMessageListProps) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
      });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const truncateText = (text: string, maxLength: number = 120) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const allSelected = messages.length > 0 && messages.every(m => selectedMessages.has(m.id));

  return (
    <div className="w-96 border-r bg-white flex flex-col h-[calc(100vh-180px)]">
      {/* Toolbar */}
      <div className="px-4 py-2 border-b bg-gray-50/50 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={allSelected}
              onCheckedChange={onSelectAll}
              className="rounded"
            />
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Archive className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
          
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Message List - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <div className="text-lg mb-2">No messages found</div>
            <p className="text-sm">Your messages will appear here</p>
          </div>
        ) : (
          <div>
            {messages.map((message) => (
              <MessageRow
                key={message.id}
                message={message}
                isSelected={selectedMessages.has(message.id)}
                isActive={selectedMessage?.id === message.id}
                onSelect={() => onSelectMessage(message)}
                onCheckboxChange={(checked) => onSelectMessageCheckbox(message.id, checked)}
                formatDate={formatDate}
                truncateText={truncateText}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface MessageRowProps {
  message: EmailMessage;
  isSelected: boolean;
  isActive: boolean;
  onSelect: () => void;
  onCheckboxChange: (checked: boolean) => void;
  formatDate: (date: string) => string;
  truncateText: (text: string, length?: number) => string;
}

const MessageRow = ({
  message,
  isSelected,
  isActive,
  onSelect,
  onCheckboxChange,
  formatDate,
  truncateText
}: MessageRowProps) => {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 cursor-pointer hover:shadow-sm transition-all group border-b border-gray-100",
        isActive && "bg-blue-50 shadow-sm",
        !message.read && "bg-white shadow-sm"
      )}
      onClick={onSelect}
    >
      {/* Selection and Star */}
      <div className="flex items-center gap-2">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onCheckboxChange}
          onClick={(e) => e.stopPropagation()}
          className="opacity-0 group-hover:opacity-100 transition-opacity rounded"
        />
        
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {message.starred ? (
            <Star className="h-4 w-4 text-yellow-400 fill-current" />
          ) : (
            <StarOff className="h-4 w-4 text-gray-400" />
          )}
        </Button>
      </div>

      {/* Message Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between mb-1">
          <div className={cn(
            "text-sm truncate",
            !message.read ? "font-medium text-gray-900" : "text-gray-700"
          )}>
            {message.direction === 'incoming' ? message.from_address : message.to_address}
          </div>
          <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
            {formatDate(message.created_at)}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-sm truncate",
            !message.read ? "font-medium text-gray-900" : "text-gray-600"
          )}>
            {message.subject || 'No Subject'}
          </span>
          <span className="text-xs text-gray-500">-</span>
          <span className="text-xs text-gray-500 truncate flex-1">
            {truncateText(message.body)}
          </span>
        </div>
      </div>
    </div>
  );
};
