import React, { useMemo } from 'react';
import { useChatStore } from '@/core/store';
import { useAuth } from '@/contexts/AuthContext';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatThreadsSidebarProps {
  className?: string;
}

export const ChatThreadsSidebar: React.FC<ChatThreadsSidebarProps> = ({ className }) => {
  const { messages, chat_id, clearChat } = useChatStore();
  const { user } = useAuth();

  // Generate thread title from first user message
  const threadTitle = useMemo(() => {
    if (messages.length === 0) return 'New Chat';
    
    // Find first user message
    const firstUserMessage = messages.find(msg => msg.role === 'user');
    if (!firstUserMessage?.text) return 'New Chat';
    
    // Get first few words (max 6 words, max 30 chars)
    const words = firstUserMessage.text.trim().split(/\s+/);
    const firstWords = words.slice(0, 6).join(' ');
    
    if (firstWords.length <= 30) {
      return firstWords;
    }
    
    // Truncate to 30 chars and add ellipsis
    return firstWords.substring(0, 27) + '...';
  }, [messages]);

  // For guest users, show current thread
  // For signed-in users, this will be replaced with conversations list later
  const isGuest = !user;



  const handleClearSession = () => {
    clearChat();
  };

  return (
    <div className={cn("w-full flex flex-col gap-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">Chats</h3>
      </div>

      {/* Current Chat */}
      {chat_id && (
        <div className="flex items-center gap-2 p-2">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate" title={threadTitle}>
              {threadTitle}
            </div>
          </div>
          {isGuest && (
            <button
              onClick={handleClearSession}
              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
              title="Clear Session"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* Placeholder for future conversations list */}
      {!isGuest && (
        <div className="text-center py-8 text-gray-500">
          <div className="text-sm">Conversations coming soon</div>
          <div className="text-xs mt-1">Your chat history will appear here</div>
        </div>
      )}

      {/* Guest user info */}
      {isGuest && (
        <div className="mt-auto pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 text-center">
            Sign in to save chat history
          </div>
        </div>
      )}
    </div>
  );
};
