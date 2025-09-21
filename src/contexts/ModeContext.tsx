import React, { createContext, useContext, useState, useEffect } from 'react';
import { useMessageStore } from '@/stores/messageStore';
import { supabase } from '@/integrations/supabase/client';

export type ChatMode = 'chat' | 'astro';

interface ModeContextType {
  mode: ChatMode;
  setMode: (mode: ChatMode) => void;
  isModeLocked: boolean;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

export const useMode = () => {
  const context = useContext(ModeContext);
  if (context === undefined) {
    throw new Error('useMode must be used within a ModeProvider');
  }
  return context;
};

interface ModeProviderProps {
  children: React.ReactNode;
}

export const ModeProvider: React.FC<ModeProviderProps> = ({ children }) => {
  const [mode, setMode] = useState<ChatMode>('chat');
  const [isModeLocked, setIsModeLocked] = useState(false);
  
  const { messages, chat_id } = useMessageStore();

  // Load mode from conversations.meta when switching chats
  useEffect(() => {
    if (chat_id) {
      loadModeFromConversation(chat_id);
    }
  }, [chat_id]);

  // Lock mode when user sends their first message in the current chat
  useEffect(() => {
    const userMessages = messages.filter(m => m.role === 'user' && m.chat_id === chat_id);
    if (userMessages.length > 0 && !isModeLocked) {
      setIsModeLocked(true);
    }
  }, [messages, chat_id, isModeLocked]);

  // Reset mode lock when switching to a new chat (no messages yet)
  useEffect(() => {
    if (chat_id) {
      const userMessages = messages.filter(m => m.role === 'user' && m.chat_id === chat_id);
      if (userMessages.length === 0) {
        setIsModeLocked(false);
      }
    }
  }, [chat_id, messages]);

  // Load mode from conversations.meta
  const loadModeFromConversation = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('meta')
        .eq('id', conversationId)
        .single();

      if (error) {
        console.error('[ModeContext] Error loading conversation mode:', error);
        return;
      }

      // If mode exists in meta, use it; otherwise default to 'chat'
      const savedMode = data?.meta?.mode;
      if (savedMode && (savedMode === 'chat' || savedMode === 'astro')) {
        setMode(savedMode);
        console.log(`[ModeContext] Loaded mode '${savedMode}' from conversations.meta`);
      } else {
        setMode('chat'); // Default mode for new chats
        console.log('[ModeContext] No saved mode found, defaulting to chat');
      }
    } catch (error) {
      console.error('[ModeContext] Error loading mode from conversation:', error);
      setMode('chat'); // Fallback to default
    }
  };

  // Save mode to conversations.meta
  const saveModeToConversation = async (conversationId: string, newMode: ChatMode) => {
    try {
      // First get existing meta to preserve other data
      const { data: existingData } = await supabase
        .from('conversations')
        .select('meta')
        .eq('id', conversationId)
        .single();

      const existingMeta = existingData?.meta || {};
      
      // Update meta with new mode
      const { error } = await supabase
        .from('conversations')
        .update({ 
          meta: { ...existingMeta, mode: newMode },
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);

      if (error) {
        console.error('[ModeContext] Error saving mode to conversation:', error);
      } else {
        console.log(`[ModeContext] Saved mode '${newMode}' to conversations.meta`);
      }
    } catch (error) {
      console.error('[ModeContext] Error saving mode to conversation:', error);
    }
  };

  const handleSetMode = async (newMode: ChatMode) => {
    if (!isModeLocked) {
      setMode(newMode);
      
      // Save mode to conversations.meta if we have a chat_id
      if (chat_id) {
        await saveModeToConversation(chat_id, newMode);
      }
    }
  };

  return (
    <ModeContext.Provider value={{ 
      mode, 
      setMode: handleSetMode, 
      isModeLocked 
    }}>
      {children}
    </ModeContext.Provider>
  );
};
