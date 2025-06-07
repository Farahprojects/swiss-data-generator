import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { MessagesSidebar } from '@/components/messages/MessagesSidebar';
import { GmailMessageList } from '@/components/messages/GmailMessageList';
import { GmailMessageDetail } from '@/components/messages/GmailMessageDetail';
import { ComposeModal } from '@/components/messages/ComposeModal';
import { MessagesHeader } from '@/components/messages/MessagesHeader';
import UnifiedNavigation from '@/components/UnifiedNavigation';

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
    setSelectedMessage(message);
    // Mark as read
    if (!message.read) {
      setMessages(prev => prev.map(m => 
        m.id === message.id ? { ...m, read: true } : m
      ));
    }
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

  const unreadCount = messages.filter(m => !m.read && m.direction === 'incoming').length;

  console.log('Current filter:', activeFilter);
  console.log('Filtered messages count:', filteredMessages.length);
  console.log('Total messages count:', messages.length);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <UnifiedNavigation />
        <div className="flex items-center justify-center flex-1 pt-16">
          <div className="text-center">
            <div className="text-lg">Loading messages...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Fixed Navigation Header */}
      <UnifiedNavigation />
      
      {/* Sticky Messages Header */}
      <MessagesHeader 
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />

      {/* Main Content - Scrollable */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <MessagesSidebar
          activeFilter={activeFilter}
          unreadCount={unreadCount}
          onFilterChange={setActiveFilter}
          onCompose={() => setShowCompose(true)}
          onOpenBranding={handleOpenBranding}
        />

        {/* Message List */}
        <GmailMessageList
          messages={filteredMessages}
          selectedMessages={selectedMessages}
          selectedMessage={selectedMessage}
          onSelectMessage={handleSelectMessage}
          onSelectMessageCheckbox={handleSelectMessageCheckbox}
          onSelectAll={handleSelectAll}
        />

        {/* Message Detail */}
        <GmailMessageDetail
          message={selectedMessage}
          onClose={() => setSelectedMessage(null)}
          onReply={() => {
            setShowCompose(true);
          }}
          onForward={() => {
            setShowCompose(true);
          }}
          onArchive={() => {
            toast({
              title: "Message archived",
              description: "Message has been archived.",
            });
          }}
          onDelete={() => {
            toast({
              title: "Message deleted",
              description: "Message has been deleted.",
            });
            setSelectedMessage(null);
          }}
        />
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
