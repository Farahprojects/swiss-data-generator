import React, { useState } from 'react';
import { Plus, Sparkles, Activity, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useChatStore } from '@/core/store';
import { useMessageStore } from '@/stores/messageStore';
import { supabase } from '@/integrations/supabase/client';
import { InsightsModal } from '@/components/insights/InsightsModal';
import { AstroDataForm } from '@/components/chat/AstroDataForm';
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
  const [showPulseModal, setShowPulseModal] = useState(false);

  // Shared handleNewChat function - all creation goes through conversation-manager
  const handleNewChat = async (mode: 'chat' | 'astro' | 'insight' = 'chat') => {
    if (!user) {
      console.error('[NewChatButton] Cannot create new chat: user not authenticated');
      return;
    }

    try {
      const title = mode === 'insight' ? 'New Insight Chat' : 'New Chat';
      
      // Create conversation through conversation-manager edge function
      const { addThread } = useChatStore.getState();
      const newChatId = await addThread(user.id, mode, title);
      
      // Set chat_id and fetch messages
      const { setChatId } = useMessageStore.getState();
      setChatId(newChatId);
      
      // Update the main chat store
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

  // Shared handleOpenInsights function
  const handleOpenInsights = () => {
    setShowInsightsModal(true);
  };

  const handleOpenPulse = () => {
    setShowPulseModal(true);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className={`flex items-center gap-2 px-3 py-1.5 text-sm font-light text-black hover:bg-gray-100 rounded-lg transition-colors ${className}`}>
            <Plus className="w-4 h-4" />
            New
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
          <DropdownMenuItem
            onClick={handleOpenPulse}
            className="cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              <span>Generate Pulse</span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Insights Modal */}
      <InsightsModal
        isOpen={showInsightsModal}
        onClose={() => setShowInsightsModal(false)}
      />

      {/* Pulse Modal - directly opens astro form with schma reportType */}
      {showPulseModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-2xl font-light text-gray-900">Generate Pulse Report</h2>
              <button onClick={() => setShowPulseModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <AstroDataForm
                onClose={() => setShowPulseModal(false)}
                onSubmit={() => {
                  setShowPulseModal(false);
                }}
                preselectedType="schma"
                reportType="schma"
                isProfileFlow={false}
                variant="insights"
                mode="insight"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
