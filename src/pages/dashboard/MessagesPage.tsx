
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Mail, Send, ArrowUp, ArrowDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

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
}

const MessagesPage = () => {
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletedMessageIds, setDeletedMessageIds] = useState<Set<string>>(new Set());
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
      setMessages(data || []);
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

  const handleDeleteMessage = (messageId: string) => {
    setDeletedMessageIds(prev => new Set(prev).add(messageId));
    toast({
      title: "Message deleted",
      description: "Message has been removed from view.",
    });
  };

  const filteredMessages = messages
    .filter(message => !deletedMessageIds.has(message.id))
    .filter(message =>
      message.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.from_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.to_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.body?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const truncateText = (text: string, maxLength: number = 120) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const MessageCard = ({ message }: { message: EmailMessage }) => (
    <Card className="hover:shadow-md transition-shadow cursor-pointer group">
      <Link to={`/dashboard/messages/${message.id}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3 flex-1">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full flex items-center justify-center text-white">
                {message.direction === 'incoming' ? (
                  <ArrowDown className="w-5 h-5" />
                ) : (
                  <ArrowUp className="w-5 h-5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <CardTitle className="text-base font-semibold truncate">
                    {message.direction === 'incoming' ? message.from_address : message.to_address}
                  </CardTitle>
                  <Badge variant={message.direction === 'incoming' ? 'default' : 'secondary'} className="text-xs">
                    {message.direction === 'incoming' ? 'Received' : 'Sent'}
                  </Badge>
                </div>
                <p className="text-sm font-medium text-gray-900 truncate">
                  {message.subject || 'No Subject'}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end space-y-1">
              <span className="text-xs text-gray-500">{formatDate(message.created_at)}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDeleteMessage(message.id);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Delete
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-gray-600 leading-relaxed">
            {truncateText(message.body)}
          </p>
          {message.sent_via && message.sent_via !== 'email' && (
            <div className="mt-2">
              <Badge variant="outline" className="text-xs">
                via {message.sent_via}
              </Badge>
            </div>
          )}
        </CardContent>
      </Link>
    </Card>
  );

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <p className="text-gray-600">Manage your email communications and client correspondence</p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Message
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Search messages by subject, sender, or content..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Message Count */}
      <div className="text-sm text-gray-600">
        {filteredMessages.length} message{filteredMessages.length !== 1 ? 's' : ''} found
      </div>

      {/* Messages Grid */}
      <div className="grid grid-cols-1 gap-4">
        {filteredMessages.map(message => (
          <MessageCard key={message.id} message={message} />
        ))}
      </div>

      {/* Empty State */}
      {filteredMessages.length === 0 && !loading && (
        <div className="text-center py-12">
          <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <div className="text-gray-400 text-lg mb-2">No messages found</div>
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'Try adjusting your search terms' : 'Your messages will appear here when you start communicating with clients'}
          </p>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Send Your First Message
          </Button>
        </div>
      )}
    </div>
  );
};

export default MessagesPage;
