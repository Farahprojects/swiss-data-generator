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
      const client_msg_id = crypto.randomUUID();
      useChatStore.getState().startStreaming();

      const abortController = await llmService.sendMessageStream({
        chat_id: chatId,
        guest_id: guestId,
        text,
        client_msg_id,
      }, 
      // Handle streaming deltas
      (delta) => {
        useChatStore.getState().appendStreamingText(delta);
      },
      // Handle completion
      (response) => {
        useChatStore.getState().endStreaming();
        useChatStore.getState().setLastMessageId(response.assistant_message_id);
      },
      // Handle errors
      (error) => {
        console.error('Stream error:', error);
        useChatStore.getState().endStreaming();
        useChatStore.getState().setError(error.message);
        toast({
          title: "Message Error",
          description: error.message,
          variant: "destructive",
        });
      });

    } catch (error) {
      console.error('Failed to send message:', error);
      useChatStore.getState().endStreaming();
      useChatStore.getState().setError('Failed to send message');
      toast({
        title: "Message Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  }, [chatId, guestId, toast]);

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