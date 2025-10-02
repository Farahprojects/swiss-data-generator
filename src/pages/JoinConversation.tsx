import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { joinConversationByToken, getSharedConversation } from '@/services/conversations';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/contexts/AuthModalContext';

const JoinConversation: React.FC = () => {
  const { shareToken } = useParams<{ shareToken: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openAuthModal } = useAuthModal();
  const openedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        if (!shareToken) {
          setError('Invalid link');
          return;
        }

        // If not authed, redirect to auth preserving join intent
        if (!user) {
          // Store pending join token and open auth modal in-place
          if (!openedRef.current) {
            localStorage.setItem('pending_join_token', shareToken);
            openAuthModal('login');
            openedRef.current = true;
          }
          return;
        }

        // Validate shared conversation and join
        await getSharedConversation(shareToken); // ensures not expired
        const { conversation_id } = await joinConversationByToken(shareToken);
        navigate(`/c/${conversation_id}`, { replace: true });
      } catch (e) {
        console.error(e);
        setError('This link is invalid or this conversation is not accepting participants.');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [shareToken, user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-medium text-gray-900 mb-2">Cannot Join Conversation</h1>
        <p className="text-gray-600">{error}</p>
      </div>
    </div>
  );
};

export default JoinConversation;

