
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Reply, 
  Forward, 
  Archive, 
  Trash2, 
  Star,
  StarOff,
  MoreHorizontal,
  ArrowLeft
} from 'lucide-react';

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

interface GmailMessageDetailProps {
  message: EmailMessage | null;
  onClose: () => void;
  onReply: () => void;
  onForward: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

export const GmailMessageDetail = ({
  message,
  onClose,
  onReply,
  onForward,
  onArchive,
  onDelete
}: GmailMessageDetailProps) => {
  if (!message) {
    return (
      <div className="flex-1 bg-white flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-lg mb-2">No message selected</div>
          <p className="text-sm">Select a message to view its content</p>
        </div>
      </div>
    );
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getInitials = (email: string) => {
    const name = email.split('@')[0];
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" onClick={onClose} className="lg:hidden">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm">
              <Archive className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              {message.starred ? (
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

        <h1 className="text-xl font-normal text-gray-900 mb-4">
          {message.subject || 'No Subject'}
        </h1>

        {/* Sender Info */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
              {getInitials(message.direction === 'incoming' ? message.from_address : message.to_address)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">
                  {message.direction === 'incoming' ? message.from_address : message.to_address}
                </span>
                {message.sent_via !== 'email' && (
                  <Badge variant="outline" className="text-xs">
                    via {message.sent_via}
                  </Badge>
                )}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                to {message.direction === 'incoming' ? message.to_address : message.from_address}
              </div>
            </div>
          </div>
          
          <div className="text-sm text-gray-600">
            {formatDateTime(message.created_at)}
          </div>
        </div>
      </div>

      {/* Message Body */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-none">
          <div className="whitespace-pre-wrap text-gray-800 leading-relaxed text-sm">
            {message.body}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="border-t p-4">
        <div className="flex items-center gap-2">
          <Button onClick={onReply} className="flex items-center gap-2">
            <Reply className="w-4 h-4" />
            Reply
          </Button>
          <Button variant="outline" onClick={onForward} className="flex items-center gap-2">
            <Forward className="w-4 h-4" />
            Forward
          </Button>
        </div>
      </div>
    </div>
  );
};
