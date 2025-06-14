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

interface EmailMessage {
  id: string;
  subject: string;
  body: string;
  from_address: string;
  to_address: string;
  direction: 'incoming' | 'outgoing';
  created_at: string;
  client_id?: string;
  sent_via: string;
  read?: boolean;
  starred?: boolean;
}

const HEADER_HEIGHT = 72;

const MessagesPage = () => {
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<EmailMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [showCompose, setShowCompose] = useState(false);
  const [activeFilter, setActiveFilter] = useState('inbox');
  const { user } = useAuth();
  const { toast } = useToast();

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
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Raw messages from database:', data);
      
      // Map database direction values to UI values
      const messagesData = (data || []).map(message => {
        const mappedDirection = message.direction === 'inbound' ? 'incoming' : 
                               message.direction === 'outbound' ? 'outgoing' : 
                               message.direction; // fallback to original value
        
        console.log(`Message ${message.id}: ${message.direction} -> ${mappedDirection}`);
        
        return {
          ...message,
          direction: mappedDirection as 'incoming' | 'outgoing',
          read: Math.random() > 0.3, // Temporary mock data for read status
          starred: Math.random() > 0.8 // Temporary mock data for starred
        };
      });
      
      console.log('Processed messages:', messagesData);
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
    const matchesSearch = message.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.from_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.to_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.body?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = (() => {
      switch (activeFilter) {
        case 'inbox': return message.direction === 'incoming';
        case 'sent': return message.direction === 'outgoing';
        case 'starred': return message.starred;
        case 'archive': return false; // We'll implement this later
        case 'trash': return false; // We'll implement this later
        default: return true;
      }
    })();

    return matchesSearch && matchesFilter;
  });

  const handleSelectMessage = (message: EmailMessage) => {
    // Set selected message for detail view instead of navigating
    setSelectedMessage(message);
    
    // Mark as read
    if (!message.read) {
      setMessages(prev => prev.map(m => 
        m.id === message.id ? { ...m, read: true } : m
      ));
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

  const handleArchive = () => {
    toast({
      title: "Message archived",
      description: "Message has been archived.",
    });
  };

  const handleDelete = () => {
    toast({
      title: "Message deleted",
      description: "Message has been deleted.",
    });
    setSelectedMessage(null);
  };

  const unreadCount = messages.filter(m => !m.read && m.direction === 'incoming').length;

  console.log('Current filter:', activeFilter);
  console.log('Filtered messages count:', filteredMessages.length);
  console.log('Total messages count:', messages.length);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-lg">Loading messages...</div>
        </div>
      </div>
    );
  }

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
          <h1 className="text-2xl font-normal text-gray-900 min-w-fit mr-4">Messages</h1>
          {/* Search bar fills remaining space */}
          <div className="relative flex-1 max-w-2xl">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search mail"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
