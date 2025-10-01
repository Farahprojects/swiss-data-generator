import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import { useChatStore } from '@/core/store';
import { useMessageStore } from '@/stores/messageStore';
import { useAuth } from '@/contexts/AuthContext';
import { useThreads } from '@/contexts/ThreadsContext';
import { Trash2, Sparkles, AlertTriangle, MoreHorizontal, UserPlus, Plus, Search, User, Settings, Bell, CreditCard, LifeBuoy, LogOut, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReportModal } from '@/contexts/ReportModalContext';
import { getChatTokens, clearChatTokens } from '@/services/auth/chatTokens';
import { AuthModal } from '@/components/auth/AuthModal';
import { getUserTypeConfig, useUserPermissions } from '@/hooks/useUserType';
import { useSettingsModal } from '@/contexts/SettingsModalContext';
import { UserAvatar } from '@/components/settings/UserAvatar';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { updateConversationTitle } from '@/services/conversations';
import { InsightsModal } from '@/components/insights/InsightsModal';
import { unifiedWebSocketService } from '@/services/websocket/UnifiedWebSocketService';
import { supabase } from '@/integrations/supabase/client';


interface ChatThreadsSidebarProps {
  className?: string;
  onDelete?: () => void;
}

export const ChatThreadsSidebar: React.FC<ChatThreadsSidebarProps> = ({ className, onDelete }) => {
  // Use single source of truth for auth state
  const { isAuthenticated } = useAuth();
  const userPermissions = useUserPermissions();
  const uiConfig = getUserTypeConfig(isAuthenticated ? 'authenticated' : 'unauthenticated');
  
  // Get chat_id directly from URL (most reliable source)
  const { threadId } = useParams<{ threadId?: string }>();
  const storeChatId = useChatStore((state) => state.chat_id);
  const navigate = useNavigate();
  
  // Use URL threadId as primary source, fallback to store
  const chat_id = threadId || storeChatId;
  
  const { 
    clearChat,
    clearAllData
  } = useChatStore();
  
  // Use centralized thread management with broadcast support
  const {
    threads,
    isLoadingThreads,
    threadsError,
    addThread,
    removeThread
  } = useChatStore();
  
  // Get messages from message store
  const { messages } = useMessageStore();

  const { user } = useAuth();
  
  const { open: openReportModal } = useReportModal();
  const { uuid } = getChatTokens();
  const { openSettings } = useSettingsModal();
  const isMobile = useIsMobile();

  // Settings handler
  const handleOpenSettings = (panel: string) => {
    openSettings(panel as "general" | "account" | "notifications" | "support" | "billing");
  };

  const [hoveredThread, setHoveredThread] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const [showEditTitle, setShowEditTitle] = useState(false);
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [showInsightsModal, setShowInsightsModal] = useState(false);
  const [reportChannel, setReportChannel] = useState<any>(null);
  const [userReports, setUserReports] = useState<any[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  
  // Lazy loading state
  const [visibleThreads, setVisibleThreads] = useState(10); // Show first 10 threads initially
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Thread loading is now handled by ThreadsProvider
  // No need for manual loadThreads() calls

  // Fetch user reports - query insights table to get report_ids for this user
  const fetchUserReports = async (userId: string) => {
    if (!userId) return;
    
    setIsLoadingReports(true);
    try {
      // Get all report_ids from insights table for this user
      const { data: insights, error: insightsError } = await supabase
        .from('insights')
        .select('id, report_type, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10); // Limit to recent 10 insights

      if (insightsError) {
        console.error('[ChatThreadsSidebar] Error fetching insights:', insightsError);
        return;
      }
      
      // Transform insights into UI format (lightweight metadata only)
      const reports = insights?.map(insight => ({
        id: insight.id,
        report_type: insight.report_type,
        created_at: insight.created_at,
      })) || [];
      
      setUserReports(reports);
    } catch (error) {
      console.error('[ChatThreadsSidebar] Failed to fetch reports:', error);
    } finally {
      setIsLoadingReports(false);
    }
  };

  // Helper function to format report type for display
  const formatReportType = (reportType: string) => {
    const typeMap: Record<string, string> = {
      'essence_personal': 'Personal',
      'essence_professional': 'Professional', 
      'essence_relationship': 'Relationship',
      'sync_personal': 'Compatibility',
      'sync_professional': 'Co-working'
    };
    return typeMap[reportType] || reportType;
  };

  // Helper function to format date
  const formatReportDate = (createdAt: string) => {
    const date = new Date(createdAt);
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    return `${month} ${day}`;
  };

  // Set up report completion listener for authenticated users
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      console.log('[ChatThreadsSidebar] Setting up report completion listener for user:', user.id);
      
      const setupReportListener = async () => {
        try {
          // Initialize the WebSocket service with report completion callback
          // (Actual subscription happens when form is submitted)
          await unifiedWebSocketService.initializeCallbacks({
            onReportCompleted: (reportData: any) => {
              console.log('[ChatThreadsSidebar] Report completed!', reportData);
              // Refresh the reports list when a new report is completed
              if (user?.id) {
                fetchUserReports(user.id);
              }
            }
          });
        } catch (error) {
          console.error('[ChatThreadsSidebar] Failed to setup report listener:', error);
        }
      };

      setupReportListener();

      // Cleanup on unmount or user change
      return () => {
        if (reportChannel) {
          console.log('[ChatThreadsSidebar] Cleaning up report listener');
          // Note: Supabase channels are automatically cleaned up, but we can remove our reference
          setReportChannel(null);
        }
      };
    }
  }, [isAuthenticated, user?.id]);

  // Fetch reports when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      fetchUserReports(user.id);
    } else {
      setUserReports([]);
    }
  }, [isAuthenticated, user?.id]);

  // Handle new chat creation - create new chat_id immediately
  const handleNewChat = async () => {
    if (!user) {
      console.error('[ChatThreadsSidebar] Cannot create new chat: user not authenticated');
      return;
    }

    try {
      console.log('[ChatThreadsSidebar] Creating new conversation for authenticated user');
      
      // Create new conversation immediately
      const newChatId = await addThread(user.id, 'New Chat');
      
      // DIRECT FLOW: Immediately set chat_id and fetch messages (same as handleSwitchToChat)
      const { setChatId } = useMessageStore.getState();
      setChatId(newChatId);
      
      // Also update the main chat store
      const { startConversation } = useChatStore.getState();
      startConversation(newChatId);
      
      // Switch WebSocket subscription to new chat_id
      const { chatController } = await import('@/features/chat/ChatController');
      await chatController.switchToChat(newChatId);
      
      // Navigate to the new conversation
      navigate(`/c/${newChatId}`, { replace: true });
      
      console.log('[ChatThreadsSidebar] New conversation created and navigated to:', newChatId);
    } catch (error) {
      console.error('[ChatThreadsSidebar] Failed to create new conversation:', error);
    }
  };

  // Handle switching to a different conversation
  const handleSwitchToChat = async (conversationId: string) => {
    // DIRECT FLOW: Immediately set chat_id and fetch messages
    const { setChatId } = useMessageStore.getState();
    setChatId(conversationId);
    
    // Also update the main chat store
    const { startConversation } = useChatStore.getState();
    startConversation(conversationId);
    
    // Switch WebSocket subscription to new chat_id
    const { chatController } = await import('@/features/chat/ChatController');
    await chatController.switchToChat(conversationId);
    
    // Navigate to auth route
    navigate(`/c/${conversationId}`, { replace: true });
  };

  // Handle deleting/clearing based on user type
  const handleDeleteOrClearChat = async () => {
    if (isAuthenticated && conversationToDelete) {
      // Check if this is an insight report (exists in userReports)
      const isInsightReport = userReports.some(r => r.id === conversationToDelete);
      
      if (isInsightReport) {
        // Delete insight report from all tables
        try {
          // Delete from insights table (report_id)
          const { error: insightsError } = await supabase
            .from('insights')
            .delete()
            .eq('id', conversationToDelete);
          
          if (insightsError) {
            console.error('[ChatThreadsSidebar] Failed to delete from insights:', insightsError);
          }
          
          // Delete from report_logs where user_id = report_id
          const { error: reportLogsError } = await supabase
            .from('report_logs')
            .delete()
            .eq('user_id', conversationToDelete);
          
          if (reportLogsError) {
            console.error('[ChatThreadsSidebar] Failed to delete from report_logs:', reportLogsError);
          }
          
          // Delete from translator_logs where user_id = report_id
          const { error: translatorLogsError } = await supabase
            .from('translator_logs')
            .delete()
            .eq('user_id', conversationToDelete);
          
          if (translatorLogsError) {
            console.error('[ChatThreadsSidebar] Failed to delete from translator_logs:', translatorLogsError);
          }
          
          // Update UI immediately - remove from userReports
          setUserReports(prev => prev.filter(r => r.id !== conversationToDelete));
          setShowDeleteConfirm(false);
          setConversationToDelete(null);
          
          // Refresh from DB to ensure sync
          if (user?.id) {
            await fetchUserReports(user.id);
          }
        } catch (error) {
          console.error('[ChatThreadsSidebar] Error deleting insight report:', error);
        }
      } else {
        // Regular conversation: Delete specific conversation (fire-and-forget)
        // Update UI immediately, don't wait for API call
        removeThread(conversationToDelete).catch((error) => {
          console.error('[ChatThreadsSidebar] Failed to delete conversation:', error);
        });
        
        // Navigate back to /therai after deletion (clean React navigation)
        navigate('/therai', { replace: true });
      }
    } else {
      // Unauthenticated user: Clear session and redirect to main page for clean slate
      try {
        // Set delete flag to prevent rehydration
        if (onDelete) {
          onDelete();
        }
        
        // 1. Clear all stores first (atomic cleanup)
        const { clearChat } = useChatStore.getState();
        clearChat();
        
        // 2. Nuke all storage to prevent race conditions
        sessionStorage.clear();
        localStorage.removeItem('chat_id');
        localStorage.removeItem('therai_active_chat_auth_');
        
        // 3. Server cleanup (simplified for authenticated users)
        
        // 4. Now redirect only after cleanup is done (replace prevents history issues)
        window.location.replace('/c');
      } catch (error) {
        console.error('[ChatThreadsSidebar] ❌ Session cleanup failed:', error);
        // Fallback: Force navigation anyway
        window.location.replace('/c');
      }
    }
  };


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

  // Lazy loading: Only show visible threads
  const visibleThreadsList = useMemo(() => {
    return threads.slice(0, visibleThreads);
  }, [threads, visibleThreads]);

  // Check if there are more threads to load
  const hasMoreThreads = threads.length > visibleThreads;

  // Load more threads function
  const loadMoreThreads = useCallback(async () => {
    if (isLoadingMore || !hasMoreThreads) return;
    
    setIsLoadingMore(true);
    
    // Simulate loading delay for better UX
    await new Promise(resolve => setTimeout(resolve, 300));
    
    setVisibleThreads(prev => Math.min(prev + 10, threads.length));
    setIsLoadingMore(false);
  }, [isLoadingMore, hasMoreThreads, threads.length]);

  // Handle edit title
  const handleEditTitle = (conversationId: string, currentTitle: string) => {
    setEditingConversationId(conversationId);
    setEditTitle(currentTitle || '');
    setShowEditTitle(true);
  };

  // Save title changes
  const handleSaveTitle = async () => {
    if (!editingConversationId || !editTitle.trim() || isSavingTitle) return;
    
    setIsSavingTitle(true);
    
    try {
      // Check if this is an insight report (exists in userReports)
      const isInsightReport = userReports.some(r => r.id === editingConversationId);
      
      if (isInsightReport) {
        // Update insight report_type in the insights table
        const { error } = await supabase
          .from('insights')
          .update({ report_type: editTitle.trim() })
          .eq('id', editingConversationId);
        
        if (error) {
          console.error('[ChatThreadsSidebar] Failed to update insight report_type:', error);
          return;
        }
        
        // Update local state for instant UI feedback
        setUserReports(prev => prev.map(report => 
          report.id === editingConversationId 
            ? { ...report, report_type: editTitle.trim() }
            : report
        ));
      } else {
        // Regular conversation: Update title in conversations table
        // Fire-and-forget API call - don't wait for it
        updateConversationTitle(editingConversationId, editTitle.trim()).catch((error) => {
          console.error('[ChatThreadsSidebar] Failed to update title:', error);
        });
        
        // Immediately update the local state for instant UI feedback
        const { updateConversation, threads } = useChatStore.getState();
        const existingConversation = threads.find(t => t.id === editingConversationId);
        
        if (existingConversation) {
          const updatedConversation = {
            ...existingConversation,
            title: editTitle.trim(),
            updated_at: new Date().toISOString()
          };
          updateConversation(updatedConversation);
        }
      }
      
      // Close modal immediately after local update
      setShowEditTitle(false);
      setEditingConversationId(null);
      setEditTitle('');
    } catch (error) {
      console.error('[ChatThreadsSidebar] Failed to update title:', error);
    } finally {
      setIsSavingTitle(false);
    }
  };

  // Cancel edit
  const handleCancelEdit = () => {
    if (isSavingTitle) return; // Prevent canceling while saving
    setShowEditTitle(false);
    setEditingConversationId(null);
    setEditTitle('');
  };





  return (
    <div className={cn("w-full h-full flex flex-col", className)}>

      {/* Scrollable middle section - only threads scroll */}
      <div className="flex-1 overflow-y-auto min-h-0">

      {/* Thread history for authenticated users */}
      {isAuthenticated && uiConfig.showThreadHistory && (
        <div className="space-y-1">
          {uiConfig.newChatLabel && (
            <button
              onClick={handleNewChat}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-black hover:bg-gray-100 rounded-lg transition-colors font-light"
            >
              <Plus className="w-4 h-4" />
              {uiConfig.newChatLabel}
            </button>
          )}
          
          {/* Insights Button */}
          <button
            onClick={() => setShowInsightsModal(true)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-black hover:bg-gray-100 rounded-lg transition-colors font-light"
          >
            <Sparkles className="w-4 h-4" />
            Insights
          </button>
          
          {uiConfig.showSearchChat && (
            <button
              onClick={() => {
                // TODO: Implement search chat functionality
                console.log('Search chat clicked');
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-black hover:bg-gray-100 rounded-lg transition-colors font-light"
            >
              <Search className="w-4 h-4" />
              Search chat
            </button>
          )}
          
          
          {/* Insight Reports section */}
          {(userReports.length > 0 || isLoadingReports) && (
            <>
              {/* Dark gray line separator */}
              <div className="border-t border-gray-400 my-2"></div>
              
              {/* Insight Reports */}
              <div className="space-y-0.5">
                <div className="text-xs text-gray-600 font-medium px-3 py-0.5">Insight Reports</div>
                <div className="space-y-0.5">
                  {isLoadingReports ? (
                    <>
                      {Array.from({ length: 3 }).map((_, index) => (
                        <div key={index} className="p-2 rounded-lg">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                            <div className="flex-1 min-w-0">
                              <div className="h-4 bg-gray-200 rounded animate-pulse mb-1"></div>
                              <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2"></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <>
                      {userReports.map((report) => (
                        <div
                          key={report.id}
                          className="relative group"
                          onMouseEnter={() => setHoveredThread(report.id)}
                          onMouseLeave={() => setHoveredThread(null)}
                        >
                          <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors">
                            <Sparkles className="w-4 h-4 text-gray-600 flex-shrink-0" />
                            <div 
                              className="flex-1 min-w-0 cursor-pointer"
                              onClick={() => openReportModal(report.id)}
                            >
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {formatReportType(report.report_type)}
                              </div>
                            </div>
                            <div className="text-xs text-gray-500 flex-shrink-0">
                              {formatReportDate(report.created_at)}
                            </div>
                            
                            {/* Three dots menu */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button 
                                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreHorizontal className="w-4 h-4 text-gray-600" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-white border border-gray-200 shadow-lg min-w-fit rounded-lg p-1">
                                <DropdownMenuItem
                                  onClick={() => openReportModal(report.id)}
                                  className="px-3 py-1.5 text-sm text-black hover:bg-gray-100 hover:text-black focus:bg-gray-100 focus:text-black cursor-pointer rounded-md"
                                >
                                  Astro
                                </DropdownMenuItem>
                                
                                <DropdownMenuItem
                                  onClick={() => handleEditTitle(report.id, formatReportType(report.report_type))}
                                  className="px-3 py-1.5 text-sm text-black hover:bg-gray-100 hover:text-black focus:bg-gray-100 focus:text-black cursor-pointer rounded-md"
                                >
                                  Edit
                                </DropdownMenuItem>
                                
                                <DropdownMenuItem
                                  onClick={() => {
                                    setConversationToDelete(report.id);
                                    setShowDeleteConfirm(true);
                                  }}
                                  className="px-3 py-1.5 text-sm text-black hover:bg-gray-100 hover:text-black focus:bg-gray-100 focus:text-black cursor-pointer rounded-md"
                                >
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Dark gray line separator */}
          <div className="border-t border-gray-400 my-2"></div>
          
          {/* Chat history section */}
          <div className="space-y-0.5">
            <div className="text-xs text-gray-600 font-medium px-3 py-0.5">{uiConfig.threadSectionLabel}</div>
            {isLoadingThreads ? (
              // Loading skeleton
              <div className="space-y-0.5">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="p-2 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="h-4 bg-gray-200 rounded animate-pulse mb-1"></div>
                        <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : threads.length === 0 ? (
              <div className="text-xs text-gray-500 px-3 py-0.5">No previous chats</div>
            ) : (
              <div className="space-y-0.5">
                {visibleThreadsList.map((conversation) => {
                  const isActive = conversation.id === chat_id;
                  
                  return (
                    <div
                      key={conversation.id}
                      className="relative group"
                      onMouseEnter={() => setHoveredThread(conversation.id)}
                      onMouseLeave={() => setHoveredThread(null)}
                    >
                      <div className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                        isActive 
                          ? 'bg-gray-100' 
                          : 'hover:bg-gray-100'
                      }`}>
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
                        <DropdownMenuContent align="end" className="bg-white border border-gray-200 shadow-lg min-w-fit rounded-lg p-1">
                          <DropdownMenuItem
                            onClick={() => {
                              // Open astro data form for this specific conversation
                              openReportModal(conversation.id);
                            }}
                            className="px-3 py-1.5 text-sm text-black hover:bg-gray-100 hover:text-black focus:bg-gray-100 focus:text-black cursor-pointer rounded-md"
                          >
                            Astro
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem
                            onClick={() => handleEditTitle(conversation.id, conversation.title || '')}
                            className="px-3 py-1.5 text-sm text-black hover:bg-gray-100 hover:text-black focus:bg-gray-100 focus:text-black cursor-pointer rounded-md"
                          >
                            Edit
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem
                            onClick={() => {
                              setConversationToDelete(conversation.id);
                              setShowDeleteConfirm(true);
                            }}
                            className="px-3 py-1.5 text-sm text-black hover:bg-gray-100 hover:text-black focus:bg-gray-100 focus:text-black cursor-pointer rounded-md"
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
                
                {/* Load More Button */}
                {hasMoreThreads && (
                  <div className="pt-2">
                    <button
                      onClick={loadMoreThreads}
                      disabled={isLoadingMore}
                      className="w-full px-3 py-2 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoadingMore ? 'Loading...' : `Load more (${threads.length - visibleThreads} remaining)`}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      </div>

      {/* Clean Footer - Sticky at bottom */}
      <div className="mt-auto pt-4 px-3 shrink-0">
        {isAuthenticated ? (
          /* Authenticated User - Settings Menu */
          <div className="space-y-2">
            {isMobile ? (
              /* Mobile: Simple button that opens settings directly */
              <Button 
                variant="ghost" 
                className="w-full justify-start p-0 h-auto rounded-none bg-transparent hover:bg-gray-100 hover:text-gray-900"
                onClick={() => handleOpenSettings('general')}
              >
                  <div className="flex items-center gap-3 px-3 py-3 w-full">
                    <UserAvatar size="sm" />
                    <div className="flex-1 text-left min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate pr-2">
                        {user?.email?.split('@')[0] || 'User'}
                      </div>
                    </div>
                    <Settings className="h-4 w-4 text-gray-500" />
                  </div>
              </Button>
            ) : (
              /* Desktop: Dropdown Menu */
              <DropdownMenu>
                {/* Wrapper controls full-row hover and padding */}
                <div className="w-full rounded-none hover:bg-gray-100 transition-colors">
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="w-full justify-start p-0 h-auto rounded-none bg-transparent !hover:bg-gray-100 !hover:text-gray-900">
                      <div className="flex items-center gap-3 px-3 py-3 w-full">
                        <UserAvatar size="sm" />
                        <div className="flex-1 text-left min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate pr-2">
                            {user?.email?.split('@')[0] || 'User'}
                          </div>
                        </div>
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                </div>
                <DropdownMenuContent align="end" className="min-w-48 rounded-xl border border-gray-200 shadow-lg p-1">
                  <div className="px-2 py-1.5">
                    <div className="text-sm font-medium text-gray-900">{user?.email}</div>
                  </div>
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem onClick={() => handleOpenSettings('general')}>
                    <Settings className="mr-2 h-4 w-4" />
                    General
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleOpenSettings('account')}>
                    <User className="mr-2 h-4 w-4" />
                    Account Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleOpenSettings('billing')}>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Billing
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleOpenSettings('notifications')}>
                    <Bell className="mr-2 h-4 w-4" />
                    Notifications
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleOpenSettings('support')}>
                    <LifeBuoy className="mr-2 h-4 w-4" />
                    Support
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        ) : (
          /* Unauthenticated User - Sign In Button */
          uiConfig.authButtonLabel && (
            <button
              onClick={() => setShowAuthModal(true)}
              className="w-full px-3 py-3 text-sm bg-gray-900 text-white hover:bg-gray-800 rounded-xl transition-colors font-light"
            >
              {uiConfig.authButtonLabel}
            </button>
          )
        )}
      </div>

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

      {/* Edit Title Popup */}
      {showEditTitle && (
        <div className="fixed inset-0 bg-white/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm mx-4 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Edit Chat Title</h3>
              <button
                onClick={handleCancelEdit}
                disabled={isSavingTitle}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && editTitle.trim() && !isSavingTitle) {
                      handleSaveTitle();
                    } else if (e.key === 'Escape') {
                      handleCancelEdit();
                    }
                  }}
                  placeholder="Enter chat title..."
                  disabled={isSavingTitle}
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  autoFocus
                />
              </div>
              
              <div className="flex justify-end">
                <button
                  onClick={handleSaveTitle}
                  disabled={!editTitle.trim() || isSavingTitle}
                  className="px-6 py-2 bg-gray-900 text-white text-sm font-medium rounded-full hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {isSavingTitle && (
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                  {isSavingTitle ? 'Saving...' : 'Save'}
                </button>
              </div>
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

      {/* Insights Modal */}
      <InsightsModal
        isOpen={showInsightsModal}
        onClose={() => setShowInsightsModal(false)}
      />
    </div>
  );
};
