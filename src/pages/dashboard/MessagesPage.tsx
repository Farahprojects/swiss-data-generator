import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { MessagesSidebar } from '@/components/messages/MessagesSidebar';
import { GmailMessageList } from '@/components/messages/GmailMessageList';
import { GmailMessageDetail } from '@/components/messages/GmailMessageDetail';
import { ComposeModal } from '@/components/messages/ComposeModal';
import { MobileComposeButton } from '@/components/messages/MobileComposeButton';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSearchParams } from "react-router-dom";
import {
  toggleStarMessage,
  archiveMessages,
  deleteMessages,
  markMessageRead,
} from "@/utils/messageActions";
import { EmailMessage } from "@/types/email";
import UnifiedNavigation from '@/components/UnifiedNavigation';

const HEADER_HEIGHT = 72;

// Define type for message filters
type MessageFilterType = "inbox" | "sent" | "starred" | "archive" | "trash";

const MessagesPage = () => {
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<EmailMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [showCompose, setShowCompose] = useState(false);
  const [activeFilter, setActiveFilter] = useState<MessageFilterType>('inbox');
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (user?.id) {
      loadMessages();
    }
  }, [user?.id]);

  const loadMessages = async () => {
    if (!user?.id) {
      console.log('No user ID available');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('Loading messages for user:', user.id);
      
      const { data, error } = await supabase
        .from('email_messages')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_archived', false) // Only load unarchived messages in main view
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      // Direction mapping if needed
      const messagesData: EmailMessage[] = (data || []).map((message: any) => {
        const mappedDirection = message.direction === 'inbound' ? 'incoming' : 
                               message.direction === 'outbound' ? 'outgoing' : 
                               message.direction; // fallback
        // Only use DB values for is_read, is_starred, is_archived
        return {
          ...message,
          direction: mappedDirection,
        } as EmailMessage;
      });
      
      setMessages(messagesData);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredMessages = messages.filter(message => {
    const matchesSearch = message.subject?.toLowerCase().includes(searchParams.get('search') || '') ||
      message.from_address?.toLowerCase().includes(searchParams.get('search') || '') ||
      message.to_address?.toLowerCase().includes(searchParams.get('search') || '') ||
      message.body?.toLowerCase().includes(searchParams.get('search') || '');

    const matchesFilter = (() => {
      switch (activeFilter) {
        case 'inbox': return message.direction === 'incoming';
        case 'sent': return message.direction === 'outgoing';
        case 'starred': return message.is_starred;
        case 'archive': return false; // We'll implement this later
        case 'trash': return false; // We'll implement this later
        default: return true;
      }
    })();

    return matchesSearch && matchesFilter;
  });

  const handleSelectMessage = async (message: EmailMessage) => {
    setSelectedMessage(message);

    // Mark as read in database (if not already)
    if (!message.is_read) {
      setMessages(prev =>
        prev.map(m => 
          m.id === message.id ? { ...m, is_read: true } : m
        )
      );
      await markMessageRead(message.id);
    }
  };

  const handleBackToList = () => {
    setSelectedMessage(null);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedMessages(new Set(filteredMessages.map(m => m.id)));
    } else {
      setSelectedMessages(new Set());
    }
  };

  const handleSelectMessageCheckbox = (messageId: string, checked: boolean) => {
    setSelectedMessages(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(messageId);
      } else {
        newSet.delete(messageId);
      }
      return newSet;
    });
  };

  const handleOpenBranding = () => {
    toast({
      title: "Branding Settings",
      description: "Email branding features coming soon!",
    });
  };

  const handleReply = () => {
    toast({
      title: "Reply feature",
      description: "Reply functionality will be available soon.",
    });
  };

  const handleForward = () => {
    toast({
      title: "Forward feature",
      description: "Forward functionality will be available soon.",
    });
  };

  const handleArchive = async () => {
    // Archive currently selected message (single)
    if (selectedMessage) {
      await archiveMessages([selectedMessage.id], toast);
      setMessages(prev =>
        prev.filter(m => m.id !== selectedMessage.id)
      );
      setSelectedMessage(null);
    }
  };

  const handleDelete = async () => {
    // Delete currently selected message (single)
    if (selectedMessage) {
      await deleteMessages([selectedMessage.id], toast);
      setMessages(prev =>
        prev.filter(m => m.id !== selectedMessage.id)
      );
      setSelectedMessage(null);
    }
  };

  const handleArchiveSelected = async () => {
    if (selectedMessages.size === 0) return;
    const ids = Array.from(selectedMessages);
    await archiveMessages(ids, toast);
    setMessages(prev =>
      prev.filter(m => !ids.includes(m.id))
    );
    setSelectedMessages(new Set());
  };

  const handleDeleteSelected = async () => {
    if (selectedMessages.size === 0) return;
    const ids = Array.from(selectedMessages);
    await deleteMessages(ids, toast);
    setMessages(prev =>
      prev.filter(m => !ids.includes(m.id))
    );
    setSelectedMessages(new Set());
  };

  const handleToggleStar = async (message: EmailMessage) => {
    // Optimistic UI
    setMessages(prev =>
      prev.map(m =>
        m.id === message.id ? { ...m, is_starred: !m.is_starred } : m
      )
    );
    try {
      await toggleStarMessage(message, toast);
    } catch {
      // rollback on error
      setMessages(prev =>
        prev.map(m =>
          m.id === message.id ? { ...m, is_starred: message.is_starred } : m
        )
      );
    }
  };

  const unreadCount = messages.filter(m => !m.is_read && m.direction === 'incoming').length;

  console.log('Current filter:', activeFilter);
  console.log('Filtered messages count:', filteredMessages.length);
  console.log('Total messages count:', messages.length);

  const showMobileSidebarMenu = isMobile;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-lg">Loading messages...</div>
        </div>
      </div>
    );
  }

  if (isMobile) {
    // Mobile layout: Remove in-page search bar section
    return (
      <>
        <UnifiedNavigation
          // Pass message nav props to header menu for mobile messages page only
          isMessagesPageMobile={true}
          activeFilter={activeFilter}
          unreadCount={unreadCount}
          onFilterChange={setActiveFilter}
        />
        <div className="w-full relative min-h-screen pb-24 bg-background">
          {/* Mobile Compose button, smaller/nicer */}
          <MobileComposeButton onClick={() => setShowCompose(true)} />

          {/* Main Message List, allow more body text */}
          <div className="w-full">
            {selectedMessage ? (
              <GmailMessageDetail
                message={selectedMessage}
                onClose={handleBackToList}
                onReply={handleReply}
                onForward={handleForward}
                onArchive={handleArchive}
                onDelete={handleDelete}
              />
            ) : (
              <GmailMessageList
                messages={filteredMessages}
                selectedMessages={selectedMessages}
                selectedMessage={null}
                onSelectMessage={handleSelectMessage}
                onSelectMessageCheckbox={handleSelectMessageCheckbox}
                onSelectAll={handleSelectAll}
                onArchiveSelected={handleArchiveSelected}
                onDeleteSelected={handleDeleteSelected}
                onToggleStar={handleToggleStar}
                mobileDense
              />
            )}
          </div>
          {/* Compose Modal */}
          <ComposeModal
            isOpen={showCompose}
            onClose={() => setShowCompose(false)}
            onSend={(messageData) => {
              toast({
                title: "Message sent",
                description: "Your message has been sent successfully.",
              });
              setShowCompose(false);
              loadMessages();
            }}
          />
        </div>
      </>
    );
  }

  // Desktop layout (sidebar, sticky header, etc)
  return (
    <div className="w-full">
      {/* Sticky Header: Compose far left, then after sidebar: Messages, then search fills space */}
      <div
        className="sticky top-16 z-10 bg-white border-b px-0 py-3 w-full flex items-center"
        style={{ minHeight: HEADER_HEIGHT, height: HEADER_HEIGHT }}
      >
        {/* Compose button floats absolutely over sidebar */}
        <div className="absolute left-0 top-0 h-full flex items-center pl-6 z-20" style={{ width: 256 }}>
          <Button
            onClick={() => setShowCompose(true)}
            className="h-10 px-7 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Compose
          </Button>
        </div>
        {/* Header content starts after sidebar */}
        <div className="ml-64 flex items-center gap-4 w-full pr-10">
          <h1 className="text-2xl font-normal text-gray-900 min-w-fit mr-4">
            Messages
          </h1>
          {/* Search bar fills remaining space */}
          <div className="relative flex-1 max-w-2xl">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search mail"
              value={searchParams.get('search') || ''}
              className="pl-12 bg-gray-50 border-gray-200 rounded-full h-10 text-sm focus:bg-white focus:shadow-sm transition-all placeholder:text-gray-500 w-full"
            />
          </div>
        </div>
      </div>

      {/* Layout: Sidebar starts below HEADER_HEIGHT */}
      <div className="flex">
        <MessagesSidebar
          activeFilter={activeFilter}
          unreadCount={unreadCount}
          onFilterChange={setActiveFilter}
          onOpenBranding={handleOpenBranding}
          headerHeight={HEADER_HEIGHT}
        />

        {/* Content area */}
        <div className="ml-64 w-full">
          {selectedMessage ? (
            <GmailMessageDetail
              message={selectedMessage}
              onClose={handleBackToList}
              onReply={handleReply}
              onForward={handleForward}
              onArchive={handleArchive}
              onDelete={handleDelete}
            />
          ) : (
            <GmailMessageList
              messages={filteredMessages}
              selectedMessages={selectedMessages}
              selectedMessage={null}
              onSelectMessage={handleSelectMessage}
              onSelectMessageCheckbox={handleSelectMessageCheckbox}
              onSelectAll={handleSelectAll}
              onArchiveSelected={handleArchiveSelected}
              onDeleteSelected={handleDeleteSelected}
              onToggleStar={handleToggleStar}
            />
          )}
        </div>
      </div>
      {/* Compose Modal */}
      <ComposeModal
        isOpen={showCompose}
        onClose={() => setShowCompose(false)}
        onSend={(messageData) => {
          toast({
            title: "Message sent",
            description: "Your message has been sent successfully.",
          });
          setShowCompose(false);
          loadMessages();
        }}
      />
    </div>
  );
};

export default MessagesPage;
