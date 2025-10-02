import React, { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { getSharedConversation } from '@/services/conversations';
import { useMessageStore } from '@/stores/messageStore';
import { MessageList } from '@/features/chat/MessageList';
import { Conversation } from '@/services/conversations';

const SharedConversationView: React.FC = () => {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { messages, setChatId } = useMessageStore();

  useEffect(() => {
    const loadSharedConversation = async () => {
      if (!shareToken) {
        setError('Invalid share link');
        setLoading(false);
        return;
      }

      try {
        const sharedConversation = await getSharedConversation(shareToken);
        setConversation(sharedConversation);
        
        // Load messages for this conversation
        setChatId(sharedConversation.id);
      } catch (err) {
        console.error('Error loading shared conversation:', err);
        setError('Conversation not found or no longer shared');
      } finally {
        setLoading(false);
      }
    };

    loadSharedConversation();
  }, [shareToken, setChatId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading conversation...</p>
        </div>
      </div>
    );
  }

  if (error || !conversation) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-100 px-4 py-3">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-lg font-medium text-gray-900">
            {conversation.title || 'Shared Conversation'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            This is a shared conversation. You can view it but cannot edit or respond.
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="max-w-4xl mx-auto">
        <div className="h-[calc(100vh-120px)] overflow-y-auto">
          <MessageList />
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 px-4 py-3">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm text-gray-500">
            Powered by <span className="font-medium">TheRAI</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SharedConversationView;
