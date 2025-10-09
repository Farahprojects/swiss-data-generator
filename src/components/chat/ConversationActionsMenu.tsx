import React, { useState } from 'react';
import { Share2, Sparkles, Edit3, Trash2 } from 'lucide-react';
import {
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { ShareConversationModal } from './ShareConversationModal';
import { useChatStore } from '@/core/store';
import { useReportModal } from '@/contexts/ReportModalContext';

interface ConversationActionsMenuProps {
  conversationId?: string; // Optional - if not provided, uses current chat_id
  onEdit?: (conversationId: string, currentTitle: string) => void;
  onDelete?: (conversationId: string) => void;
  align?: 'start' | 'end' | 'center';
  currentTitle?: string;
}

export const ConversationActionsMenuContent: React.FC<ConversationActionsMenuProps> = ({
  conversationId,
  onEdit,
  onDelete,
  align = 'end',
  currentTitle = '',
}) => {
  const { chat_id } = useChatStore();
  const { open: openReportModal } = useReportModal();
  const [showShareModal, setShowShareModal] = useState(false);
  
  // Use provided conversationId or fall back to current chat_id
  const targetConversationId = conversationId || chat_id;

  const handleShareClick = () => {
    setShowShareModal(true);
  };

  const handleAstroClick = () => {
    if (targetConversationId) {
      openReportModal(targetConversationId);
    }
  };

  const handleEditClick = () => {
    if (onEdit && targetConversationId) {
      onEdit(targetConversationId, currentTitle);
    }
  };

  const handleDeleteClick = () => {
    if (onDelete && targetConversationId) {
      onDelete(targetConversationId);
    }
  };

  return (
    <>
      <DropdownMenuContent align={align} className="bg-white border border-gray-200 shadow-lg min-w-fit rounded-lg p-1">
        <DropdownMenuItem
          onClick={handleShareClick}
          className="px-3 py-1.5 text-sm text-black hover:bg-gray-100 hover:text-black focus:bg-gray-100 focus:text-black cursor-pointer rounded-md"
        >
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuItem
          onClick={handleAstroClick}
          className="px-3 py-1.5 text-sm text-black hover:bg-gray-100 hover:text-black focus:bg-gray-100 focus:text-black cursor-pointer rounded-md"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span>Astro</span>
          </div>
        </DropdownMenuItem>
        
        {onEdit && (
          <DropdownMenuItem
            onClick={handleEditClick}
            className="px-3 py-1.5 text-sm text-black hover:bg-gray-100 hover:text-black focus:bg-gray-100 focus:text-black cursor-pointer rounded-md"
          >
            <div className="flex items-center gap-2">
              <Edit3 className="w-4 h-4" />
              <span>Edit</span>
            </div>
          </DropdownMenuItem>
        )}
        
        {onDelete && (
          <DropdownMenuItem
            onClick={handleDeleteClick}
            className="px-3 py-1.5 text-sm text-black hover:bg-gray-100 hover:text-black focus:bg-gray-100 focus:text-black cursor-pointer rounded-md"
          >
            <div className="flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </div>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>

      {/* Share Modal */}
      {showShareModal && targetConversationId && (
        <ShareConversationModal
          conversationId={targetConversationId}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </>
  );
};

