import React, { useState } from 'react';
import { Share2, Sparkles, Edit3, Trash2, FolderInput, X } from 'lucide-react';
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { ShareConversationModal } from './ShareConversationModal';
import { useChatStore } from '@/core/store';
import { useReportModal } from '@/contexts/ReportModalContext';

interface Folder {
  id: string;
  name: string;
}

interface ConversationActionsMenuProps {
  conversationId?: string; // Optional - if not provided, uses current chat_id
  onEdit?: (conversationId: string, currentTitle: string) => void;
  onDelete?: (conversationId: string) => void;
  onMoveToFolder?: (conversationId: string, folderId: string | null) => void;
  folders?: Folder[];
  currentFolderId?: string | null;
  align?: 'start' | 'end' | 'center';
  currentTitle?: string;
}

export const ConversationActionsMenuContent: React.FC<ConversationActionsMenuProps> = ({
  conversationId,
  onEdit,
  onDelete,
  onMoveToFolder,
  folders = [],
  currentFolderId,
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

  const handleMoveToFolder = (folderId: string | null) => {
    if (onMoveToFolder && targetConversationId) {
      onMoveToFolder(targetConversationId, folderId);
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
        
        {onMoveToFolder && folders.length > 0 && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="px-3 py-1.5 text-sm text-black hover:bg-gray-100 hover:text-black focus:bg-gray-100 focus:text-black cursor-pointer rounded-md">
              <div className="flex items-center gap-2">
                <FolderInput className="w-4 h-4" />
                <span>Move to Folder</span>
              </div>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="bg-white border border-gray-200 shadow-lg rounded-lg p-1">
              {currentFolderId && (
                <DropdownMenuItem
                  onClick={() => handleMoveToFolder(null)}
                  className="px-3 py-1.5 text-sm text-black hover:bg-gray-100 hover:text-black focus:bg-gray-100 focus:text-black cursor-pointer rounded-md"
                >
                  <div className="flex items-center gap-2">
                    <X className="w-4 h-4" />
                    <span>Remove from folder</span>
                  </div>
                </DropdownMenuItem>
              )}
              {folders.map((folder) => (
                <DropdownMenuItem
                  key={folder.id}
                  onClick={() => handleMoveToFolder(folder.id)}
                  className="px-3 py-1.5 text-sm text-black hover:bg-gray-100 hover:text-black focus:bg-gray-100 focus:text-black cursor-pointer rounded-md"
                  disabled={folder.id === currentFolderId}
                >
                  <span className={folder.id === currentFolderId ? 'font-medium' : ''}>
                    {folder.name}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
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

