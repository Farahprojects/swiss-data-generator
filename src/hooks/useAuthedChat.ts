import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChatStore } from '@/core/store';
import { useConversations } from '@/hooks/useConversations';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook for authenticated users' chat experience
 * Manages conversation history, creation, and navigation
 */
export const useAuthedChat = (conversationId?: string | null) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const { 
    conversations, 
    loading: conversationsLoading, 
    createConversation, 
    deleteConversation,
    updateConversationTitle 
  } = useConversations();
  
  const { 
    startConversation, 
    loadMessages, 
    clearChat, 
    status,
    messages 
  } = useChatStore();

  // Initialize conversation on mount or when conversationId changes
  useEffect(() => {
    // If conversationId is explicitly null or user is not authenticated, skip initialization
    if (!user || conversationId === null) return;

    if (conversationId) {
      // Load specific conversation immediately
      setCurrentConversationId(conversationId);
      startConversation(conversationId);
      // TODO: Load messages from database for this conversation
    } else {
      // Handle case with no conversation ID asynchronously
      const initializeDefaultConversation = async () => {
        // Wait for conversations to load, but don't block UI
        if (conversations.length > 0 && !conversationsLoading) {
          const mostRecent = conversations[0];
          setCurrentConversationId(mostRecent.id);
          navigate(`/chat/${mostRecent.id}`, { replace: true });
          startConversation(mostRecent.id);
        }
      };

      // Run asynchronously to not block initial render
      Promise.resolve().then(initializeDefaultConversation);
    }
  }, [conversationId, user, conversations, conversationsLoading, startConversation, navigate]);

  const handleNewConversation = async () => {
    try {
      const newConversationId = await createConversation();
      if (newConversationId) {
        setCurrentConversationId(newConversationId);
        navigate(`/chat/${newConversationId}`);
        startConversation(newConversationId);
        clearChat(); // Clear messages for fresh start
      }
    } catch (error) {
      console.error('Failed to create new conversation:', error);
    }
  };

  const handleSelectConversation = (id: string) => {
    setCurrentConversationId(id);
    navigate(`/chat/${id}`);
    startConversation(id);
    // TODO: Load messages for this conversation
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await deleteConversation(id);
      
      // If we deleted the current conversation, navigate to a new one
      if (id === currentConversationId) {
        await handleNewConversation();
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  const handleUpdateConversationTitle = async (id: string, title: string) => {
    try {
      await updateConversationTitle(id, title);
    } catch (error) {
      console.error('Failed to update conversation title:', error);
    }
  };

  return {
    // State
    currentConversationId,
    conversations,
    conversationsLoading,
    messages,
    status,
    
    // Actions
    handleNewConversation,
    handleSelectConversation,
    handleDeleteConversation,
    handleUpdateConversationTitle
  };
};