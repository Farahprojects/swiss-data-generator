
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Reply, Forward, Archive, Trash2, ArrowUp, ArrowDown, User } from 'lucide-react';
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

const MessageDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [message, setMessage] = useState<EmailMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [isArchived, setIsArchived] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (id) {
      loadMessage();
    }
  }, [id]);

  const loadMessage = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('email_messages')
        .select('*')
        .eq('id', id)
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      setMessage(data);
    } catch (error) {
      console.error('Error loading message:', error);
      toast({
        title: "Error",
        description: "Failed to load message. Please try again.",
        variant: "destructive",
      });
      navigate('/dashboard/messages');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/dashboard/messages');
  };

  const handleDelete = () => {
    toast({
      title: "Message deleted",
      description: "Message has been removed from view.",
    });
    navigate('/dashboard/messages');
  };

  const handleArchive = () => {
    setIsArchived(true);
    toast({
      title: "Message archived",
      description: "Message has been archived.",
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

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-lg">Loading message...</div>
        </div>
      </div>
    );
  }

  if (!message) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-lg mb-2">Message not found</div>
        <Button onClick={handleBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Messages
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={handleBack} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Messages
        </Button>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleReply} className="flex items-center gap-2">
            <Reply className="w-4 h-4" />
            Reply
          </Button>
          <Button variant="outline" onClick={handleForward} className="flex items-center gap-2">
            <Forward className="w-4 h-4" />
            Forward
          </Button>
          <Button 
            variant="outline" 
            onClick={handleArchive}
            disabled={isArchived}
            className="flex items-center gap-2"
          >
            <Archive className="w-4 h-4" />
            {isArchived ? 'Archived' : 'Archive'}
          </Button>
          <Button 
            variant="outline" 
            onClick={handleDelete}
            className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Message Content */}
      <Card>
        <CardHeader>
          <div className="space-y-4">
            {/* Subject */}
            <CardTitle className="text-xl">{message.subject || 'No Subject'}</CardTitle>
            
            {/* Message Info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full flex items-center justify-center text-white">
                    {message.direction === 'incoming' ? (
                      <ArrowDown className="w-4 h-4" />
                    ) : (
                      <ArrowUp className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium">
                      {message.direction === 'incoming' ? 'From' : 'To'}: {message.direction === 'incoming' ? message.from_address : message.to_address}
                    </div>
                    {message.direction === 'incoming' && (
                      <div className="text-sm text-gray-600">
                        To: {message.to_address}
                      </div>
                    )}
                    {message.direction === 'outgoing' && (
                      <div className="text-sm text-gray-600">
                        From: {message.from_address}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Badge variant={message.direction === 'incoming' ? 'default' : 'secondary'}>
                  {message.direction === 'incoming' ? 'Received' : 'Sent'}
                </Badge>
                {message.sent_via && message.sent_via !== 'email' && (
                  <Badge variant="outline">
                    via {message.sent_via}
                  </Badge>
                )}
                {isArchived && (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                    Archived
                  </Badge>
                )}
              </div>
            </div>

            {/* Date */}
            <div className="text-sm text-gray-600">
              {formatDateTime(message.created_at)}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="prose max-w-none">
            <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
              {message.body}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MessageDetailPage;
