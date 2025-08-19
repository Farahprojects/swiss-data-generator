// src/features/chat/useChatHistory.ts
import { useEffect, useState } from 'react';
import { Message } from '@/core/types';
import { getMessagesForConversation } from '@/services/api/messages';
import { getSessionIds } from '@/services/auth/sessionIds';

export const useChatHistory = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { chatId } = getSessionIds();

  useEffect(() => {
    if (!chatId) {
      setLoading(false);
      return;
    }

    const fetchHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const history = await getMessagesForConversation(chatId);
        setMessages(history);
      } catch (e: any) {
        setError('Failed to load chat history.');
        console.error('[useChatHistory] Error:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [chatId]);

  return { messages, loading, error, chatId };
};