import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { joinConversationByToken, getSharedConversation } from '@/services/conversations';
import { useAuth } from '@/contexts/AuthContext';

const JoinConversation: React.FC = () => {
  const { shareToken } = useParams<{ shareToken: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const run = async () => {
      if (!shareToken) {
        navigate('/', { replace: true });
        return;
      }

      // If not signed in: store token and redirect to /therai
      if (!user) {
        localStorage.setItem('pending_join_token', shareToken);
        navigate('/therai', { replace: true });
        return;
      }

      // If signed in: validate and join immediately
      try {
        await getSharedConversation(shareToken);
        const { conversation_id } = await joinConversationByToken(shareToken);
        navigate(`/c/${conversation_id}`, { replace: true });
      } catch (e) {
        console.error('Join failed:', e);
        navigate('/', { replace: true });
      }
    };
    run();
  }, [shareToken, user, navigate]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
    </div>
  );
};

export default JoinConversation;

