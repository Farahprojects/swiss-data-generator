import { useChatStore } from '@/core/store';
import { LlmService } from '@/services/llm/llmService';
import { useToast } from '@/hooks/use-toast';
import { getSessionIds } from '@/services/auth/sessionIds';
import { useCallback } from 'react';

export interface UseChatControllerReturn {
  // Chat state
  chatId: string | null;
  guestId: string | null;
  status: 'idle' | 'thinking' | 'error';
  lastMessageId: string | null;
  
  // Actions
  initializeConversation: (chatId: string) => Promise<void>;
  sendTextMessage: (text: string) => Promise<void>;
}

export function useChatController(): UseChatControllerReturn {
  const { toast } = useToast();
  
  // Get state from store
  const { conversationId: chatId, status, lastMessageId, startConversation, setStatus, setLastMessageId } = useChatStore();
  const { guestId } = getSessionIds();
  
  // Services
  const llmService = new LlmService();

  // Initialize conversation
  const initializeConversation = useCallback(async (newChatId: string) => {
    try {
      startConversation(newChatId);
      console.log('Conversation initialized with chatId:', newChatId);
    } catch (error) {
      console.error('Failed to initialize conversation:', error);
      setStatus('error');
      toast({
        title: "Initialization Error",
        description: "Failed to initialize conversation",
        variant: "destructive",
      });
    }
  }, [startConversation, setStatus, toast]);

  // Send text message
  const sendTextMessage = useCallback(async (text: string) => {
    if (!chatId || !guestId) {
      toast({
        title: "Session Error",
        description: "Chat session not properly initialized",
        variant: "destructive",
      });
      return;
    }

    try {
      setStatus('thinking');

      const response = await llmService.sendMessage({
        chat_id: chatId,
        guest_id: guestId,
        text,
        client_msg_id: crypto.randomUUID()
      });

      setLastMessageId(response.assistant_message_id);
      setStatus('idle');

    } catch (error) {
      console.error('Failed to send message:', error);
      setStatus('error');
      toast({
        title: "Message Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  }, [chatId, guestId, setStatus, setLastMessageId, toast, llmService]);

  return {
    // State
    chatId,
    guestId,
    status,
    lastMessageId,
    
    // Actions
    initializeConversation,
    sendTextMessage,
  };
}