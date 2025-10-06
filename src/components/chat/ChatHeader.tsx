import React, { useState } from 'react';
import { MoreHorizontal, UserPlus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NewChatButton } from './NewChatButton';
import { InviteUserModal } from './InviteUserModal';
import { useChatStore } from '@/core/store';

export const ChatHeader: React.FC = () => {
  const { chat_id } = useChatStore();
  const [showInviteModal, setShowInviteModal] = useState(false);

  return (
    <>
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
            <DropdownMenuItem 
              className="cursor-pointer" 
              onClick={() => setShowInviteModal(true)}
            >
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                <span>Invite Users</span>
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
      </div>

      {/* Invite Modal */}
      {showInviteModal && chat_id && (
        <InviteUserModal
          conversationId={chat_id}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </>
  );
};