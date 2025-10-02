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
      // 1) Basic link validation upfront
      if (!shareToken) {
        setError('Invalid link');
        setLoading(false);
        return;
      }

      // 2) If not signed in yet: open auth modal and WAIT here (keep loading state)
      if (!user) {
        if (!openedRef.current) {
          localStorage.setItem('pending_join_token', shareToken);
          openAuthModal('login');
          openedRef.current = true;
        }
        // Do not clear loading; AuthContext will complete join after sign-in
        return;
      }

      // 3) Signed in: validate and join
      try {
        await getSharedConversation(shareToken); // ensures not expired / public
        const { conversation_id } = await joinConversationByToken(shareToken);
        navigate(`/c/${conversation_id}`, { replace: true });
      } catch (e) {
        console.error(e);
        setError('This link is invalid or this conversation is not accepting participants.');
        setLoading(false);
      }
    };
    run();
  }, [shareToken, user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
          <p className="text-sm text-gray-600">Preparing to join… { !user ? 'Please sign in to continue.' : ''}</p>
        </div>
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

