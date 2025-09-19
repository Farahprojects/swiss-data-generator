import React, { createContext, useContext, useState, useEffect } from 'react';
import { useMessageStore } from '@/stores/messageStore';

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
    if (!isModeLocked) {
      setMode(newMode);
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
