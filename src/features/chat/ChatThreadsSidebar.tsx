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
import { useUserConversationsStore } from '@/stores/userConversationsStore';
import { chatController } from './ChatController';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';


interface ChatThreadsSidebarProps {
  className?: string;
  isGuestThreadReady?: boolean;
}

export const ChatThreadsSidebar: React.FC<ChatThreadsSidebarProps> = ({ className, isGuestThreadReady = false }) => {
  // Get user type from URL parameters and auth context
  const [searchParams] = useSearchParams();
  const guestReportId = searchParams.get('guest_id');
  const userId = searchParams.get('user_id');
  
  const { messages, chat_id, clearChat } = useChatStore();
  const { user } = useAuth();
  
  // Determine user type - use both auth state and URL for consistency
  const isAuthenticated = !!user && !!userId; // Both auth state and URL must match
  const isGuest = !!guestReportId;
  const { open: openReportModal } = useReportModal();
  const { uuid } = getChatTokens();
  const { isPolling, isReportReady } = useReportReadyStore();
  
  // Conversation management for authenticated users
  const { 
    conversations, 
    isLoading: conversationsLoading, 
    loadConversations, 
    addConversation, 
    removeConversation 
  } = useUserConversationsStore();

  const [hoveredThread, setHoveredThread] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  
  // For guest users, show current thread
  // For signed-in users, this will be replaced with conversations list later
  // Use actual auth state and URL parameters to determine user type
  const isGuestUser = isGuest;
  const isUnauthenticated = !isAuthenticated && !isGuest;

  // Load conversations for authenticated users
  useEffect(() => {
    if (isAuthenticated) {
      loadConversations();
    }
  }, [isAuthenticated, loadConversations]);

  // Handle new chat creation for authenticated users
  const handleNewChat = async () => {
    if (!user) return;
    
    try {
      const newChatId = await addConversation(user.id, 'New Chat');
      
      // Store chat_id in sessionStorage
      sessionStorage.setItem('therai_chat_id', newChatId);
      
      // Initialize the conversation in chatController
      chatController.initializeConversation(newChatId);
      
      // Optionally open astro modal (user can close it)
      openReportModal('new');
      
      console.log('[ChatThreadsSidebar] New chat created:', newChatId);
    } catch (error) {
      console.error('[ChatThreadsSidebar] Failed to create new chat:', error);
    }
  };

  // Handle switching to a different conversation
  const handleSwitchToChat = (conversationId: string) => {
    // Store chat_id in sessionStorage
    sessionStorage.setItem('therai_chat_id', conversationId);
    
    // Initialize the conversation in chatController
    chatController.initializeConversation(conversationId);
    
    console.log('[ChatThreadsSidebar] Switched to chat:', conversationId);
  };

  // Handle deleting a conversation
  const handleDeleteConversation = async (conversationId: string) => {
    try {
      await removeConversation(conversationId);
      
      // If this was the current chat, clear the session
      if (chat_id === conversationId) {
        const { streamlinedSessionReset } = await import('@/utils/streamlinedSessionReset');
        await streamlinedSessionReset({ preserveNavigation: true });
      }
      
      console.log('[ChatThreadsSidebar] Conversation deleted:', conversationId);
    } catch (error) {
      console.error('[ChatThreadsSidebar] Failed to delete conversation:', error);
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



  const handleClearSession = async () => {
    
    try {
      // Use the streamlined reset function
      const { streamlinedSessionReset } = await import('@/utils/streamlinedSessionReset');
      await streamlinedSessionReset({ redirectTo: '/' });
      
    } catch (error) {
      console.error('[ChatThreadsSidebar] ❌ Session cleanup failed:', error);
      // Fallback: Force navigation anyway
      window.location.href = '/';
    }
  };


  return (
    <div className={cn("w-full flex flex-col gap-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">Chats</h3>
      </div>

      {/* Current Chat - Show for both signed-in and guest users */}
      {(chat_id || (isGuest && isGuestThreadReady)) && (
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
                    if (isGuest) {
                      // For guest users, always allow opening report modal
                      if (guestReportId) {
                        // Existing guest with report - view astro data
                        openReportModal(guestReportId);
                      } else {
                        // Fresh guest - create new report
                        openReportModal('new');
                      }
                    } else if (uuid) {
                      // For signed-in users, use the uuid
                      openReportModal(uuid);
                    }
                  }}
                  className="px-3 py-2 text-sm text-black hover:bg-gray-200 hover:text-black focus:bg-gray-200 focus:text-black cursor-pointer"
                >
                  Astro
                </DropdownMenuItem>
                
                {/* Delete option only for guest users */}
                {isGuest && (
                  <DropdownMenuItem
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-3 py-2 text-sm text-black hover:bg-gray-200 hover:text-black focus:bg-gray-200 focus:text-black cursor-pointer"
                  >
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}

      {/* Authenticated user buttons */}
      {isAuthenticated && (
        <div className="space-y-2">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-black hover:bg-gray-100 rounded-lg transition-colors font-light"
          >
            <Plus className="w-4 h-4" />
            New chat
          </button>
          
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
          
          <button
            onClick={() => {
              // TODO: Implement astro data functionality
              console.log('Astro data clicked');
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-black hover:bg-gray-100 rounded-lg transition-colors font-light"
          >
            <User className="w-4 h-4" />
            Astro data
          </button>
          
          {/* Dark gray line separator */}
          <div className="border-t border-gray-400 my-3"></div>
          
          {/* Chat history section */}
          <div className="space-y-1">
            <div className="text-xs text-gray-600 font-medium px-3 py-1">Chat history</div>
            {conversationsLoading ? (
              <div className="text-xs text-gray-500 px-3 py-1">Loading...</div>
            ) : conversations.length === 0 ? (
              <div className="text-xs text-gray-500 px-3 py-1">No previous chats</div>
            ) : (
              <div className="space-y-1">
                {conversations.map((conversation) => (
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
                              if (uuid) {
                                openReportModal(uuid);
                              }
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

      {/* Guest user info */}
      {isGuestUser && (
        <div className="mt-auto pt-4 border-t border-gray-200">
          <button
            onClick={() => setShowAuthModal(true)}
            className="w-full px-3 py-2 text-sm bg-gray-900 text-white hover:bg-gray-800 rounded-lg transition-colors font-light"
          >
            Sign in
          </button>
        </div>
      )}


      {/* Unauthenticated user info (no URL parameters) */}
      {isUnauthenticated && (
        <div className="mt-auto pt-4 border-t border-gray-200 space-y-3">
          <button
            onClick={() => setShowAuthModal(true)}
            className="w-full px-3 py-2 text-sm bg-gray-900 text-white hover:bg-gray-800 rounded-lg transition-colors font-light"
          >
            Sign in
          </button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-white/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  {isAuthenticated ? 'Delete Conversation' : 'Delete Chat Session'}
                </h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>
            
            <p className="text-gray-700 mb-6">
              {isAuthenticated 
                ? 'Are you sure you want to delete this conversation? All messages and data will be permanently removed.'
                : 'Are you sure you want to delete this chat session? All messages and data will be permanently removed.'
              }
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
                  if (isAuthenticated && conversationToDelete) {
                    // Delete specific conversation for authenticated users
                    await handleDeleteConversation(conversationToDelete);
                  } else {
                    // Clear session for guest users
                    handleClearSession();
                  }
                  setShowDeleteConfirm(false);
                  setConversationToDelete(null);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                {isAuthenticated ? 'Delete Conversation' : 'Delete Session'}
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
