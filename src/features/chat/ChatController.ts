import { useChatStore } from '@/core/store';
import { LlmService } from '@/services/llm/llmService';
import { useToast } from '@/hooks/use-toast';
import { getSessionIds } from '@/services/auth/sessionIds';
import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

export interface UseChatControllerReturn {
  // Chat state
  chatId: string | null;
  guestId: string | null;
  status: 'idle' | 'thinking' | 'error';
  lastMessageId: string | null;
  messages: Message[]; // Expose messages from the store
  
  // Actions
  initializeConversation: (chatId: string, initialMessages: Message[]) => Promise<void>;
  sendTextMessage: (text: string) => Promise<void>;
}

export function useChatController(): UseChatControllerReturn {
  const { toast } = useToast();
  
  // Get state and actions from store
  const { 
    conversationId: chatId, 
    status, 
    lastMessageId, 
    messages,
    startConversation, 
    addMessage,
    updateAssistantMessage,
    endStreaming,
    setError,
  } = useChatStore();
  
  const { guestId } = getSessionIds();
  
  // Services
  const llmService = new LlmService();

  // Initialize conversation with historical messages
  const initializeConversation = useCallback(async (newChatId: string, initialMessages: Message[]) => {
    try {
      startConversation(newChatId, initialMessages);
      console.log('Conversation initialized with chatId:', newChatId);
    } catch (error) {
      console.error('Failed to initialize conversation:', error);
      setError('Failed to initialize conversation');
      toast({
        title: "Initialization Error",
        description: "Failed to initialize conversation",
        variant: "destructive",
      });
    }
  }, [startConversation, setError, toast]);

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

    const client_msg_id = uuidv4();
    const userMessage: Message = {
      id: client_msg_id,
      role: 'user',
      text,
      createdAt: new Date().toISOString(),
      status: 'complete',
    };

    // Optimistically add user message to the store
    addMessage(userMessage);

    // Prepare for streaming assistant message
    const assistantMessageId = uuidv4();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      text: '',
      createdAt: new Date().toISOString(),
      status: 'streaming',
    };
    addMessage(assistantMessage);

    try {
      await llmService.sendMessageStream({
        chat_id: chatId,
        guest_id: guestId,
        text,
        client_msg_id,
      }, 
      // Handle streaming deltas
      (delta) => {
        updateAssistantMessage(assistantMessageId, delta);
      },
      // Handle completion
      (response) => {
        endStreaming(assistantMessageId, response.assistant_message_id);
      },
      // Handle errors
      (error) => {
        console.error('Stream error:', error);
        setError(error.message);
        toast({
          title: "Message Error",
          description: error.message,
          variant: "destructive",
        });
      });

    } catch (error) {
      console.error('Failed to send message:', error);
      setError('Failed to send message');
      toast({
        title: "Message Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  }, [chatId, guestId, toast, addMessage, updateAssistantMessage, endStreaming, setError]);

  return {
    // State
    chatId,
    guestId,
    status,
    lastMessageId,
    messages,
    
    // Actions
    initializeConversation,
    sendTextMessage,
  };
}