import React, { useMemo, useState } from 'react';
import { useChatStore } from '@/core/store';
import { useAuth } from '@/contexts/AuthContext';
import { Trash2, Sparkles, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReportModal } from '@/contexts/ReportModalContext';
import { getChatTokens } from '@/services/auth/chatTokens';
import { useReportReadyStore } from '@/services/report/reportReadyStore';
import { useSettingsModal } from '@/contexts/SettingsModalContext';

interface ChatThreadsSidebarProps {
  className?: string;
}

export const ChatThreadsSidebar: React.FC<ChatThreadsSidebarProps> = ({ className }) => {
  const { messages, chat_id, clearChat } = useChatStore();
  const { user } = useAuth();
  const { open: openReportModal } = useReportModal();
  const { uuid } = getChatTokens();
  const { isPolling, isReportReady } = useReportReadyStore();
  const { setShowSignInPrompt } = useSettingsModal();
  const [hoveredThread, setHoveredThread] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
                  onClick={() => setShowDeleteConfirm(true)}
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
          <button
            onClick={() => setShowSignInPrompt(true)}
            className="w-full px-3 py-2 text-sm bg-gray-900 text-white hover:bg-gray-800 rounded-lg transition-colors font-light"
          >
            Sign in to save chat history
          </button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Delete Chat Session</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>
            
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete this chat session? All messages and data will be permanently removed.
            </p>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleClearSession();
                  setShowDeleteConfirm(false);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Delete Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
