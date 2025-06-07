
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  ArrowRight,
  Reply, 
  Forward, 
  Archive, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  User,
  Star,
  StarOff,
  MoreHorizontal
} from 'lucide-react';
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
  const [isStarred, setIsStarred] = useState(false);
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
      
      // Type assertion for direction field
      const messageData = {
        ...data,
        direction: data.direction as 'incoming' | 'outgoing'
      };
      
      setMessage(messageData);
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

  const handlePrevious = () => {
    // Navigate to previous message - implement logic here
    toast({
      title: "Previous message",
      description: "Previous message navigation coming soon.",
    });
  };

  const handleNext = () => {
    // Navigate to next message - implement logic here
    toast({
      title: "Next message",
      description: "Next message navigation coming soon.",
    });
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

  const handleStar = () => {
    setIsStarred(!isStarred);
    toast({
      title: isStarred ? "Unstarred" : "Starred",
      description: `Message has been ${isStarred ? 'unstarred' : 'starred'}.`,
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

  const getInitials = (email: string) => {
    const name = email.split('@')[0];
    return name.charAt(0).toUpperCase();
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
    <div className="w-full max-w-5xl mx-auto">
      {/* Gmail-style Header */}
      <div className="sticky top-16 z-10 bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left: Navigation */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={handleBack} className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div className="h-6 w-px bg-gray-300 mx-2" />
            <Button variant="ghost" size="sm" onClick={handlePrevious}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleNext}>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={handleArchive} disabled={isArchived}>
              <Archive className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDelete} className="text-red-600 hover:text-red-700 hover:bg-red-50">
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleStar}>
              {isStarred ? (
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
              ) : (
                <StarOff className="w-4 h-4" />
              )}
            </Button>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Message Content */}
      <div className="p-6">
        <Card>
          <CardHeader>
            <div className="space-y-4">
              {/* Subject */}
              <CardTitle className="text-2xl font-normal">{message.subject || 'No Subject'}</CardTitle>
              
              {/* Message Info */}
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full flex items-center justify-center text-white text-lg font-medium">
                    {getInitials(message.direction === 'incoming' ? message.from_address : message.to_address)}
                  </div>
                  <div>
                    <div className="font-medium text-lg">
                      {message.direction === 'incoming' ? message.from_address : message.to_address}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      to {message.direction === 'incoming' ? message.to_address : message.from_address}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {formatDateTime(message.created_at)}
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
            </div>
          </CardHeader>

          <CardContent>
            <div className="prose max-w-none">
              <div className="whitespace-pre-wrap text-gray-800 leading-relaxed text-base">
                {message.body}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center gap-3">
          <Button onClick={handleReply} className="flex items-center gap-2">
            <Reply className="w-4 h-4" />
            Reply
          </Button>
          <Button variant="outline" onClick={handleForward} className="flex items-center gap-2">
            <Forward className="w-4 h-4" />
            Forward
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MessageDetailPage;
