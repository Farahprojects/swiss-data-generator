import React, { useState } from 'react';
import { Folder, ChevronRight, ChevronDown, MessageSquare, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface FolderItem {
  id: string;
  name: string;
  chatsCount: number;
  chats: Array<{
    id: string;
    title: string;
  }>;
}

interface FoldersListProps {
  folders: FolderItem[];
  onFolderClick?: (folderId: string) => void;
  onChatClick: (folderId: string, chatId: string) => void;
  onEditFolder: (folderId: string, currentName: string) => void;
  onDeleteFolder: (folderId: string) => void;
  activeChatId?: string;
}

export const FoldersList: React.FC<FoldersListProps> = ({
  folders,
  onFolderClick,
  onChatClick,
  onEditFolder,
  onDeleteFolder,
  activeChatId,
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  if (folders.length === 0) {
    return (
      <div className="text-xs text-gray-500 px-3 py-2">
        No folders yet. Create your first folder to organize chats!
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {folders.map((folder) => {
        const isExpanded = expandedFolders.has(folder.id);
        
        return (
          <div key={folder.id} className="space-y-0.5">
            {/* Folder Header */}
            <div className="flex items-center gap-1 group">
              <button
                onClick={() => toggleFolder(folder.id)}
                className="flex-1 flex items-center gap-2 px-3 py-1.5 text-sm text-black hover:bg-gray-100 rounded-lg transition-colors font-light"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3 h-3 text-gray-500" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-gray-500" />
                )}
                <Folder className="w-4 h-4 text-gray-600" />
                <span className="flex-1 text-left">{folder.name}</span>
                <span className="text-xs text-gray-500">({folder.chatsCount})</span>
              </button>

              {/* Folder Actions Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-all">
                    <MoreHorizontal className="w-4 h-4 text-gray-600" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => onEditFolder(folder.id, folder.name)}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onDeleteFolder(folder.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Expanded Chats */}
            {isExpanded && folder.chats.length > 0 && (
              <div className="ml-6 space-y-0.5">
                {folder.chats.map((chat) => {
                  const isActive = chat.id === activeChatId;
                  
                  return (
                    <button
                      key={chat.id}
                      onClick={() => onChatClick(folder.id, chat.id)}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors font-light ${
                        isActive 
                          ? 'bg-gray-100 text-gray-900' 
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-gray-500" />
                      <span className="flex-1 text-left truncate">{chat.title}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Empty folder state */}
            {isExpanded && folder.chats.length === 0 && (
              <div className="ml-6 px-3 py-2 text-xs text-gray-400">
                No chats in this folder
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

