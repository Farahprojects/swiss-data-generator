import React, { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useChatStore } from '@/core/store';
import { useAuth } from '@/contexts/AuthContext';
import { Trash2, Sparkles, AlertTriangle, MoreHorizontal, UserPlus, Plus, Search, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReportModal } from '@/contexts/ReportModalContext';
import { getChatTokens, clearChatTokens } from '@/services/auth/chatTokens';
import { useReportReadyStore } from '@/services/report/reportReadyStore';
import { AuthModal } from '@/components/auth/AuthModal';
import { useUserType, getUserTypeConfig, useUserPermissions } from '@/hooks/useUserType';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';


interface ChatThreadsSidebarProps {
  className?: string;
}

export const ChatThreadsSidebar: React.FC<ChatThreadsSidebarProps> = ({ className }) => {
  // Use centralized user type detection
  const userType = useUserType();
  const userPermissions = useUserPermissions();
  const uiConfig = getUserTypeConfig(userType.type);
  
  const { 
    messages, 
    chat_id, 
    clearChat,
    // Thread management from single source of truth
    threads,
    isLoadingThreads,
    threadsError,
    loadThreads,
    addThread,
    removeThread
  } = useChatStore();
  const { user } = useAuth();
  
  const { open: openReportModal } = useReportModal();
  const { uuid } = getChatTokens();
  const { isPolling, isReportReady } = useReportReadyStore();

  const [hoveredThread, setHoveredThread] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);

  // Load threads for authenticated users
  useEffect(() => {
    if (userType.isAuthenticated) {
      loadThreads();
    }
  }, [userType.isAuthenticated, loadThreads]);

  // Handle new chat creation for authenticated users  
  const handleNewChat = async () => {
    if (!user) return;
    
    try {
      // Use the unified store method
      const store = useChatStore.getState();
      const newChatId = await store.startNewConversation(user.id);
      
      // Load threads to update the list
      await loadThreads();
      
      // Optionally open astro modal (user can close it)
      openReportModal('new');
      
      console.log('[ChatThreadsSidebar] New chat created:', newChatId);
    } catch (error) {
      console.error('[ChatThreadsSidebar] Failed to create new chat:', error);
    }
  };

  // Handle switching to a different conversation
  const handleSwitchToChat = (conversationId: string) => {
    // Use the unified store method - auth users don't have guest_id
    const store = useChatStore.getState();
    store.startConversation(conversationId);
    
    console.log('[ChatThreadsSidebar] Switched to chat:', conversationId);
  };

  // Handle deleting/clearing based on user type
  const handleDeleteOrClearChat = async () => {
    if (userType.isAuthenticated && conversationToDelete) {
      // Authenticated user: Delete specific conversation
      try {
        await removeThread(conversationToDelete);
        console.log('[ChatThreadsSidebar] Conversation deleted:', conversationToDelete);
      } catch (error) {
        console.error('[ChatThreadsSidebar] Failed to delete conversation:', error);
      }
    } else if (userType.isGuest) {
      // Guest user: Clear session and redirect to main page for clean slate
      try {
        // Clear store state immediately for instant UI feedback
        const { clearChat } = useChatStore.getState();
        clearChat();
        
        // Clear session storage AND database
        const { streamlinedSessionReset } = await import('@/utils/streamlinedSessionReset');
        await streamlinedSessionReset({ redirectTo: '/', cleanDatabase: true });
      } catch (error) {
        console.error('[ChatThreadsSidebar] ❌ Session cleanup failed:', error);
        // Fallback: Force navigation anyway
        window.location.href = '/';
      }
    }
  };


  // Generate thread title from first user message (same for both guest and signed-in users)
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





  return (
    <div className={cn("w-full flex flex-col gap-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">Chats</h3>
      </div>

      {/* Current Chat - Show for auth users always, guests when they have a chat_id */}
      {(chat_id && (userType.isAuthenticated || userType.isGuest)) && (
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
            
            {/* Three dots menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1 hover:bg-gray-200 rounded transition-colors">
                  <MoreHorizontal className="w-4 h-4 text-gray-600" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white border border-gray-200 shadow-lg min-w-fit">
                <DropdownMenuItem
                  onClick={() => {
                    // Always use chat_id if available, otherwise 'new'
                    if (chat_id) {
                      // Use the specific chat_id for this thread
                      openReportModal(chat_id);
                    } else {
                      // Fresh thread - create new report
                      openReportModal('new');
                    }
                  }}
                  className="px-3 py-2 text-sm text-black hover:bg-gray-200 hover:text-black focus:bg-gray-200 focus:text-black cursor-pointer"
                >
                  Astro
                </DropdownMenuItem>
                
                {/* Delete/Clear option - shown for both auth and guest users */}
                {userPermissions.canDeleteCurrentChat && uiConfig.chatMenuActions.delete && (
                  <DropdownMenuItem
                    onClick={() => {
                      if (userType.isAuthenticated) {
                        setConversationToDelete(chat_id);
                      }
                      setShowDeleteConfirm(true);
                    }}
                    className="px-3 py-2 text-sm text-black hover:bg-gray-200 hover:text-black focus:bg-gray-200 focus:text-black cursor-pointer"
                  >
                    {uiConfig.chatMenuActions.delete.label}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}

      {/* Authenticated user controls */}
      {userType.isAuthenticated && uiConfig.showThreadHistory && (
        <div className="space-y-2">
          {uiConfig.newChatLabel && (
            <button
              onClick={handleNewChat}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-black hover:bg-gray-100 rounded-lg transition-colors font-light"
            >
              <Plus className="w-4 h-4" />
              {uiConfig.newChatLabel}
            </button>
          )}
          
          {uiConfig.showSearchChat && (
            <button
              onClick={() => {
                // TODO: Implement search chat functionality
                console.log('Search chat clicked');
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-black hover:bg-gray-100 rounded-lg transition-colors font-light"
            >
              <Search className="w-4 h-4" />
              Search chat
            </button>
          )}
          
          {uiConfig.showAstroData && (
            <button
              onClick={() => {
                // Open astro data form for current chat
                openReportModal('new');
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-black hover:bg-gray-100 rounded-lg transition-colors font-light"
            >
              <User className="w-4 h-4" />
              Astro data
            </button>
          )}
          
          {/* Dark gray line separator */}
          <div className="border-t border-gray-400 my-3"></div>
          
          {/* Chat history section */}
          <div className="space-y-1">
            <div className="text-xs text-gray-600 font-medium px-3 py-1">{uiConfig.threadSectionLabel}</div>
            {isLoadingThreads ? (
              <div className="text-xs text-gray-500 px-3 py-1">Loading...</div>
            ) : threads.length === 0 ? (
              <div className="text-xs text-gray-500 px-3 py-1">No previous chats</div>
            ) : (
              <div className="space-y-1">
                {threads.map((conversation) => (
                  <div
                    key={conversation.id}
                    className="relative group"
                    onMouseEnter={() => setHoveredThread(conversation.id)}
                    onMouseLeave={() => setHoveredThread(null)}
                  >
                    <div className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                      <div 
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => handleSwitchToChat(conversation.id)}
                      >
                        <div className="text-sm font-medium text-gray-900 truncate" title={conversation.title || 'New Chat'}>
                          {conversation.title || 'New Chat'}
                        </div>
                      </div>
                      
                      {/* Three dots menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1 hover:bg-gray-200 rounded transition-colors">
                            <MoreHorizontal className="w-4 h-4 text-gray-600" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-white border border-gray-200 shadow-lg min-w-fit">
                          <DropdownMenuItem
                            onClick={() => {
                              // Open astro data form for this specific conversation
                              openReportModal(conversation.id);
                            }}
                            className="px-3 py-2 text-sm text-black hover:bg-gray-200 hover:text-black focus:bg-gray-200 focus:text-black cursor-pointer"
                          >
                            Astro
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem
                            onClick={() => {
                              setConversationToDelete(conversation.id);
                              setShowDeleteConfirm(true);
                            }}
                            className="px-3 py-2 text-sm text-black hover:bg-gray-200 hover:text-black focus:bg-gray-200 focus:text-black cursor-pointer"
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Guest/Unauthenticated user sign in */}
      {uiConfig.authButtonLabel && (
        <div className="mt-auto pt-4 border-t border-gray-200">
          <button
            onClick={() => setShowAuthModal(true)}
            className="w-full px-3 py-2 text-sm bg-gray-900 text-white hover:bg-gray-800 rounded-lg transition-colors font-light"
          >
            {uiConfig.authButtonLabel}
          </button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && uiConfig.chatMenuActions.delete && (
        <div className="fixed inset-0 bg-white/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  {uiConfig.chatMenuActions.delete.confirmTitle}
                </h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>
            
            <p className="text-gray-700 mb-6">
              {uiConfig.chatMenuActions.delete.confirmMessage}
            </p>
            
            <div className="flex gap-3 justify-between">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await handleDeleteOrClearChat();
                  setShowDeleteConfirm(false);
                  setConversationToDelete(null);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                {uiConfig.chatMenuActions.delete.confirmButton}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultMode="login"
      />
    </div>
  );
};
