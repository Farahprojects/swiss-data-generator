import React, { useState } from 'react';
import { Plus, MessageSquare, Edit2, Trash2, X, Check } from 'lucide-react';
import { useConversations } from '@/hooks/useConversations';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface ConversationSidebarProps {
  currentConversationId?: string;
  onConversationSelect: (conversationId: string) => void;
  onNewConversation: () => void;
  className?: string;
}

export const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  currentConversationId,
  onConversationSelect,
  onNewConversation,
  className
}) => {
  const { user } = useAuth();
  const { 
    conversations, 
    loading, 
    createConversation, 
    updateConversationTitle, 
    deleteConversation 
  } = useConversations();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const handleNewConversation = async () => {
    const conversationId = await createConversation();
    if (conversationId) {
      onConversationSelect(conversationId);
    }
    onNewConversation();
  };

  const handleEditStart = (id: string, currentTitle: string) => {
    setEditingId(id);
    setEditTitle(currentTitle || 'Untitled');
  };

  const handleEditSave = async () => {
    if (editingId && editTitle.trim()) {
      await updateConversationTitle(editingId, editTitle.trim());
    }
    setEditingId(null);
    setEditTitle('');
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const handleDelete = async (id: string) => {
    await deleteConversation(id);
    if (currentConversationId === id) {
      // If we deleted the current conversation, create a new one
      handleNewConversation();
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className={cn("flex flex-col h-full bg-background border-r", className)}>
      <div className="p-4 border-b">
        <Button 
          onClick={handleNewConversation}
          className="w-full gap-2"
          variant="outline"
        >
          <Plus size={16} />
          New Conversation
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {loading ? (
            <div className="text-center py-4 text-muted-foreground">
              Loading conversations...
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
              <p>No conversations yet</p>
              <p className="text-sm">Start a new conversation to begin</p>
            </div>
          ) : (
            <div className="space-y-1">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={cn(
                    "group relative p-3 rounded-lg cursor-pointer hover:bg-accent transition-colors",
                    currentConversationId === conversation.id && "bg-accent"
                  )}
                  onClick={() => onConversationSelect(conversation.id)}
                >
                  {editingId === conversation.id ? (
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleEditSave();
                          if (e.key === 'Escape') handleEditCancel();
                        }}
                        className="h-6 text-sm"
                        autoFocus
                      />
                      <Button size="sm" variant="ghost" onClick={handleEditSave}>
                        <Check size={12} />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleEditCancel}>
                        <X size={12} />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate pr-2">
                          {conversation.title || 'Untitled'}
                        </span>
                        <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditStart(conversation.id, conversation.title || '');
                            }}
                            className="h-6 w-6 p-0"
                          >
                            <Edit2 size={12} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(conversation.id);
                            }}
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 size={12} />
                          </Button>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(conversation.updated_at).toLocaleDateString()}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};