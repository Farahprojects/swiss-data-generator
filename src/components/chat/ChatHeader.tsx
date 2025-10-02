import React from 'react';
import { MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NewChatDropdown } from './NewChatDropdown';

export const ChatHeader: React.FC = () => {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
      {/* Shared New Chat Dropdown */}
      <NewChatDropdown />

      {/* 3 Dots Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center justify-center w-8 h-8 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem className="cursor-pointer">
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer">
            Help
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};