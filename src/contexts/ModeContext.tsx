import React, { createContext, useContext, useState, useEffect } from 'react';
import { useMessageStore } from '@/stores/messageStore';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

export type ChatMode = 'chat' | 'astro' | 'insight';

interface ModeContextType {
  mode: ChatMode;
  setMode: (mode: ChatMode) => void;
  isModeLocked: boolean;
  isLoading: boolean;
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
  const [isLoading, setIsLoading] = useState(true);
  
  const { messages, chat_id } = useMessageStore();
  const { user } = useAuth();

  // Load mode from conversations.meta when chat_id changes
  useEffect(() => {
    // Only load conversation data if user is authenticated
    if (chat_id && user) {
      setIsLoading(true);
      const loadModeFromConversation = async () => {
        try {
          // First check if user is a participant in this conversation
          const { data: participantData, error: checkError } = await supabase
            .from('conversations_participants')
            .select('conversation_id')
            .eq('conversation_id', chat_id)
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (checkError) {
            console.error('[ModeContext] Error checking conversation participation:', checkError);
            setMode('chat');
            setIsLoading(false);
            return;
          }
          
          // If user is not a participant, default to chat mode
          if (!participantData) {
            console.log('[ModeContext] User not a participant in this conversation, defaulting to chat mode');
            setMode('chat');
            setIsLoading(false);
            return;
          }
          
          // User is a participant, fetch the conversation mode from dedicated column
          const { data, error } = await supabase
            .from('conversations')
            .select('mode')
            .eq('id', chat_id)
            .maybeSingle();

          if (error) {
            console.error('[ModeContext] Error loading conversation mode:', error);
            setMode('chat');
            setIsLoading(false);
            return;
          }

          // Use mode from dedicated column; default to 'chat' if null or invalid
          const savedMode = data?.mode as ChatMode;
          if (savedMode && (savedMode === 'chat' || savedMode === 'astro' || savedMode === 'insight')) {
            setMode(savedMode);
          } else {
            setMode('chat'); // Default mode for new chats
          }
        } catch (error) {
          console.error('[ModeContext] Error loading mode from conversation:', error);
          setMode('chat'); // Fallback to default
        } finally {
          setIsLoading(false);
        }
      };
      
      loadModeFromConversation();
    } else {
      setIsLoading(false);
    }
  }, [chat_id, user]);

  // Reset mode when user is not authenticated
  useEffect(() => {
    if (!user) {
      setMode('chat');
      setIsModeLocked(false);
      setIsLoading(false);
    }
  }, [user]);

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

  const handleSetMode = async (newMode: ChatMode) => {
    if (!isModeLocked) {
      setMode(newMode);
      
      // Save mode to conversations.mode column immediately when selected
      if (chat_id) {
        try {
          // Update mode in dedicated column
          const { error } = await supabase
            .from('conversations')
            .update({ 
              mode: newMode,
              updated_at: new Date().toISOString()
            })
            .eq('id', chat_id);

          if (error) {
            console.error('[ModeContext] Error saving mode to conversation:', error);
          } else {
            console.log(`[ModeContext] Saved mode '${newMode}' to conversations.mode`);
          }
        } catch (error) {
          console.error('[ModeContext] Error saving mode to conversation:', error);
        }
      }
    }
  };

  return (
    <ModeContext.Provider value={{ 
      mode, 
      setMode: handleSetMode, 
      isModeLocked,
      isLoading
    }}>
      {children}
    </ModeContext.Provider>
  );
};
