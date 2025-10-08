import React, { useState } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useChatStore } from '@/core/store';
import { useMessageStore } from '@/stores/messageStore';
import { createConversation } from '@/services/conversations';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface NewChatButtonProps {
  className?: string;
}

export const NewChatButton: React.FC<NewChatButtonProps> = ({ className = "" }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showInsightsModal, setShowInsightsModal] = useState(false);

  // Shared handleNewChat function
  const handleNewChat = async (mode: 'chat' | 'astro' | 'insight' = 'chat') => {
    if (!user) {
      console.error('[NewChatButton] Cannot create new chat: user not authenticated');
      return;
    }

    try {
      // Unified create: conversation with mode + participant
      const newChatId = await createConversation(
        user.id,
        mode === 'insight' ? 'New Insight Chat' : 'New Chat',
        mode
      );
      
      // Add to local threads state directly (no DB call needed)
      const newThread = {
        id: newChatId,
        user_id: user.id,
        title: mode === 'insight' ? 'New Insight Chat' : 'New Chat',
        mode: mode,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const currentState = useChatStore.getState();
      useChatStore.setState({ threads: [newThread, ...currentState.threads] });
      
      // DIRECT FLOW: Immediately set chat_id and fetch messages
      const { setChatId } = useMessageStore.getState();
      setChatId(newChatId);
      
      // Also update the main chat store
      const { startConversation } = useChatStore.getState();
      startConversation(newChatId);
      
      // Switch WebSocket subscription to new chat_id
      const { chatController } = await import('@/features/chat/ChatController');
      await chatController.switchToChat(newChatId);
      
      // Navigate to the new conversation
      navigate(`/c/${newChatId}`, { replace: true });
    } catch (error) {
      console.error('[NewChatButton] Failed to create new conversation:', error);
    }
  };

  // Generate Insight now creates an insight-mode conversation (no modal)
  const handleOpenInsights = async () => {
    await handleNewChat('insight');
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className={`flex items-center gap-2 px-3 py-1.5 text-sm font-light text-black hover:bg-gray-100 rounded-lg transition-colors ${className}`}>
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem
            onClick={() => handleNewChat('chat')}
            className="cursor-pointer"
          >
            Chat
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleNewChat('astro')}
            className="cursor-pointer"
          >
            Astro
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleOpenInsights}
            className="cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span>Generate Insight</span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Insights Modal removed for unified flow */}
    </>
  );
};
