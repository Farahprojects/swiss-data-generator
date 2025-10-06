import React, { useState, useEffect } from 'react';
import { MoreHorizontal, Share2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NewChatButton } from './NewChatButton';
import { ShareConversationModal } from './ShareConversationModal';
import { useChatStore } from '@/core/store';
import { supabase } from '@/integrations/supabase/client';

export const ChatHeader: React.FC = () => {
  const { chat_id } = useChatStore();
  const [showShareModal, setShowShareModal] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareMode, setShareMode] = useState<'view_only' | 'join_conversation'>('view_only');

  // Check if conversation is shared
  useEffect(() => {
    // Sharing feature has been removed - set defaults
    setIsShared(false);
    setShareToken(null);
    setShareMode('view_only');
  }, [chat_id]);

  const handleShareClick = () => {
    setShowShareModal(true);
  };

  const handleShareSuccess = (token: string) => {
    setIsShared(true);
    setShareToken(token);
    // Don't close modal - let user see the link and copy it
  };

  const handleUnshare = () => {
    setIsShared(false);
    setShareToken(null);
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
      {/* Sexy New Chat Button */}
      <NewChatButton />

      {/* 3 Dots Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center justify-center w-8 h-8 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem className="cursor-pointer" onClick={handleShareClick}>
            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              <span>{isShared ? 'Manage Share' : 'Share Conversation'}</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer">
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer">
            Help
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Share Modal */}
      {showShareModal && (
        <ShareConversationModal
          conversationId={chat_id}
          isShared={isShared}
          shareToken={shareToken}
          initialMode={shareMode}
          onSuccess={handleShareSuccess}
          onUnshare={handleUnshare}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
};