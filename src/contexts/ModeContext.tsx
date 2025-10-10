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

  // Load mode from conversations.mode column when chat_id changes
  useEffect(() => {
    // Only load conversation data if user is authenticated
    if (chat_id && user) {
      setIsLoading(true);
      const loadModeFromConversation = async () => {
        // Fetch conversation and check ownership or participation
        const { data, error } = await supabase
          .from('conversations')
          .select('mode, user_id')
          .eq('id', chat_id)
          .maybeSingle();

        if (error) {
          console.error('[ModeContext] Error loading conversation:', error);
          setIsLoading(false);
          throw new Error(`Failed to load conversation: ${error.message}`);
        }

        if (!data) {
          console.error('[ModeContext] Conversation not found');
          setIsLoading(false);
          throw new Error('Conversation not found');
        }

        // Check if user owns this conversation
        const isOwner = data.user_id === user.id;
        
        // If not owner, check if user is a participant
        if (!isOwner) {
          const { data: participantData, error: participantError } = await supabase
            .from('conversations_participants')
            .select('conversation_id')
            .eq('conversation_id', chat_id)
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (participantError) {
            console.error('[ModeContext] Error checking participation:', participantError);
            setIsLoading(false);
            throw new Error(`Failed to check conversation participation: ${participantError.message}`);
          }
          
          if (!participantData) {
            console.error('[ModeContext] User does not own or participate in this conversation');
            setIsLoading(false);
            throw new Error('User does not have access to this conversation');
          }
        }

        // Use mode from mode column - fail if not set or invalid
        const savedMode = data.mode as ChatMode | null;
        if (!savedMode) {
          setIsLoading(false);
          throw new Error('Conversation mode is not set');
        }
        
        if (savedMode !== 'chat' && savedMode !== 'astro' && savedMode !== 'insight') {
          setIsLoading(false);
          throw new Error(`Invalid conversation mode: ${savedMode}`);
        }
        
        setMode(savedMode);
        setIsLoading(false);
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
        const { error } = await supabase
          .from('conversations')
          .update({ 
            mode: newMode,
            updated_at: new Date().toISOString()
          })
          .eq('id', chat_id);

        if (error) {
          console.error('[ModeContext] Error saving mode to conversation:', error);
          throw new Error(`Failed to save conversation mode: ${error.message}`);
        }
        
        console.log(`[ModeContext] Saved mode '${newMode}' to conversations.mode column`);
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
