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
    if (chat_id && user) {
      setIsLoading(true);
      
      // Simple load: mode is already set on creation, just read it
      const loadMode = async () => {
        try {
          const { data } = await supabase
            .from('conversations')
            .select('mode')
            .eq('id', chat_id)
            .maybeSingle();
          
          // Default to 'chat' if missing (defensive, shouldn't happen)
          setMode((data?.mode as ChatMode) || 'chat');
        } catch {
          // On any error, just default to chat mode
          setMode('chat');
        } finally {
          setIsLoading(false);
        }
      };
      
      loadMode();
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

  const handleSetMode = (newMode: ChatMode) => {
    // Mode is immutable after creation (locked after first message)
    // No need to save changes since dropdown is disabled when locked
    if (!isModeLocked) {
      setMode(newMode);
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
