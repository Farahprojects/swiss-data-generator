import React, { useMemo, useState } from 'react';
import { useChatStore } from '@/core/store';
import { useAuth } from '@/contexts/AuthContext';
import { Trash2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReportModal } from '@/contexts/ReportModalContext';
import { getChatTokens } from '@/services/auth/chatTokens';
import { useReportReadyStore } from '@/services/report/reportReadyStore';

interface ChatThreadsSidebarProps {
  className?: string;
}

export const ChatThreadsSidebar: React.FC<ChatThreadsSidebarProps> = ({ className }) => {
  const { messages, chat_id, clearChat } = useChatStore();
  const { user } = useAuth();
  const { open: openReportModal } = useReportModal();
  const { uuid } = getChatTokens();
  const { isPolling, isReportReady } = useReportReadyStore();
  const [hoveredThread, setHoveredThread] = useState<string | null>(null);

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
        <div 
          className="relative group"
          onMouseEnter={() => setHoveredThread(chat_id)}
          onMouseLeave={() => setHoveredThread(null)}
        >
          <div className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg transition-colors">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate" title={threadTitle}>
                {threadTitle}
              </div>
            </div>
          </div>
          
          {/* Hover Actions */}
          {hoveredThread === chat_id && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-white border border-gray-200 rounded-lg shadow-lg p-1">
              {/* Astro Button */}
              <button
                onClick={() => uuid && openReportModal(uuid)}
                disabled={!isReportReady || !uuid}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors",
                  isReportReady && uuid
                    ? 'text-blue-600 hover:bg-blue-50' 
                    : 'text-gray-400 cursor-not-allowed'
                )}
                title="Generate Astro Report"
              >
                <Sparkles className="w-3 h-3" />
                Astro
              </button>
              
              {/* Delete Button */}
              {isGuest && (
                <button
                  onClick={handleClearSession}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Clear Session"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </button>
              )}
            </div>
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
