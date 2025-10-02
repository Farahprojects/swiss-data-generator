import React, { useState, useEffect } from 'react';
import { MoreHorizontal, Share2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ShareConversationModal } from './ShareConversationModal';
import { useChatStore } from '@/core/store';
import { supabase } from '@/integrations/supabase/client';

interface ChatMenuButtonProps {
  className?: string;
}

export const ChatMenuButton: React.FC<ChatMenuButtonProps> = ({ className = "" }) => {
  const { chat_id } = useChatStore();
  const [showShareModal, setShowShareModal] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);

  // Check if conversation is shared
  useEffect(() => {
    const checkSharingStatus = async () => {
      if (!chat_id) return;
      
      try {
        const { data, error } = await supabase
          .from('conversations')
          .select('is_public, share_token')
          .eq('id', chat_id)
          .single();
        
        if (error) {
          console.error('Error checking sharing status:', error);
          return;
        }
        
        setIsShared(data?.is_public || false);
        setShareToken(data?.share_token || null);
      } catch (error) {
        console.error('Error checking sharing status:', error);
      }
    };

    checkSharingStatus();
  }, [chat_id]);

  const handleShareClick = () => {
    setShowShareModal(true);
  };

  const handleShareSuccess = (token: string) => {
    setIsShared(true);
    setShareToken(token);
    setShowShareModal(false);
  };

  const handleUnshare = () => {
    setIsShared(false);
    setShareToken(null);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className={`flex items-center justify-center w-8 h-8 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors ${className}`}>
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
          onSuccess={handleShareSuccess}
          onUnshare={handleUnshare}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </>
  );
};
