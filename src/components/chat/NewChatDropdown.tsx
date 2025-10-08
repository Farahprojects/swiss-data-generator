import React, { useState } from 'react';
import { Plus, ChevronDown, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useChatStore } from '@/core/store';
import { useMessageStore } from '@/stores/messageStore';
import { supabase } from '@/integrations/supabase/client';
import { InsightsModal } from '@/components/insights/InsightsModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface NewChatDropdownProps {
  className?: string;
}

export const NewChatDropdown: React.FC<NewChatDropdownProps> = ({ className = "" }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showInsightsModal, setShowInsightsModal] = useState(false);

  // Shared handleNewChat function
  const handleNewChat = async (mode: 'chat' | 'astro' | 'insight' = 'chat') => {
    if (!user) {
      console.error('[NewChatDropdown] Cannot create new chat: user not authenticated');
      return;
    }

    try {
      // Create new conversation with mode in meta
      const { data: conversation, error } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          title: mode === 'insight' ? 'New Insight Chat' : 'New Chat',
          meta: { mode }
        })
        .select('id')
        .single();

      if (error) {
        console.error('[NewChatDropdown] Failed to create conversation:', error);
        return;
      }

      const newChatId = conversation.id;
      
      // Add to local threads state directly (no DB call needed)
      const newThread = {
        id: newChatId,
        user_id: user.id,
        title: mode === 'insight' ? 'New Insight Chat' : 'New Chat',
        meta: { mode },
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
      console.error('[NewChatDropdown] Failed to create new conversation:', error);
    }
  };

  // Shared handleOpenInsights function
  const handleOpenInsights = () => {
    setShowInsightsModal(true);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className={`flex items-center gap-2 px-3 py-1.5 text-sm font-light text-black hover:bg-gray-100 rounded-lg transition-colors ${className}`}>
            <Plus className="w-4 h-4" />
            New Chat
            <ChevronDown className="w-3 h-3" />
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

      {/* Insights Modal */}
      <InsightsModal
        isOpen={showInsightsModal}
        onClose={() => setShowInsightsModal(false)}
      />
    </>
  );
};
