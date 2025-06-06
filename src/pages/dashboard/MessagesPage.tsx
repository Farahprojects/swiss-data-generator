
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Plus, 
  Search, 
  Mail, 
  MailOpen, 
  Archive, 
  Trash2, 
  Reply, 
  Forward, 
  ArrowLeft,
  Paperclip,
  Star,
  StarOff
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { MessageList } from '@/components/messages/MessageList';
import { MessageDetail } from '@/components/messages/MessageDetail';
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

const MessagesPage = () => {
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<EmailMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [showCompose, setShowCompose] = useState(false);
  const [filter, setFilter] = useState<'all' | 'inbox' | 'sent' | 'archived'>('all');
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('email_messages')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const messagesData = (data || []).map(message => ({
        ...message,
        direction: message.direction as 'incoming' | 'outgoing',
        read: Math.random() > 0.3, // Temporary mock data for read status
        starred: Math.random() > 0.8 // Temporary mock data for starred
      }));
      
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
      switch (filter) {
        case 'inbox': return message.direction === 'incoming';
        case 'sent': return message.direction === 'outgoing';
        case 'archived': return false; // We'll implement this later
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

  const handleSelectMessage = (messageId: string, checked: boolean) => {
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

  const handleBulkArchive = () => {
    toast({
      title: "Messages archived",
      description: `${selectedMessages.size} messages archived.`,
    });
    setSelectedMessages(new Set());
  };

  const handleBulkDelete = () => {
    toast({
      title: "Messages deleted",
      description: `${selectedMessages.size} messages deleted.`,
    });
    setSelectedMessages(new Set());
  };

  const unreadCount = messages.filter(m => !m.read && m.direction === 'incoming').length;

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
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
            <p className="text-gray-600">
              {unreadCount > 0 && `${unreadCount} unread • `}
              {filteredMessages.length} total messages
            </p>
          </div>
          <Button onClick={() => setShowCompose(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Compose
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-4 mt-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search messages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            {['all', 'inbox', 'sent'].map((filterOption) => (
              <Button
                key={filterOption}
                variant={filter === filterOption ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(filterOption as any)}
                className="capitalize"
              >
                {filterOption === 'inbox' && <Mail className="w-4 h-4 mr-1" />}
                {filterOption}
                {filterOption === 'inbox' && unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-2 px-1 py-0 text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedMessages.size > 0 && (
          <div className="flex items-center gap-2 mt-3 p-2 bg-blue-50 rounded-md">
            <span className="text-sm text-blue-700">
              {selectedMessages.size} selected
            </span>
            <Button size="sm" variant="outline" onClick={handleBulkArchive}>
              <Archive className="w-4 h-4 mr-1" />
              Archive
            </Button>
            <Button size="sm" variant="outline" onClick={handleBulkDelete}>
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Message List */}
        <MessageList
          messages={filteredMessages}
          selectedMessages={selectedMessages}
          selectedMessage={selectedMessage}
          onSelectMessage={handleSelectMessage}
          onSelectMessageCheckbox={handleSelectMessage}
          onSelectAll={handleSelectAll}
        />

        {/* Message Detail */}
        <MessageDetail
          message={selectedMessage}
          onClose={() => setSelectedMessage(null)}
          onReply={() => {
            setShowCompose(true);
            // We'll implement reply functionality in the compose modal
          }}
          onForward={() => {
            setShowCompose(true);
            // We'll implement forward functionality in the compose modal
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
          loadMessages(); // Refresh to show sent message
        }}
      />
    </div>
  );
};

export default MessagesPage;
