import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useChatStore } from '@/core/store';

/**
 * Smart redirect component that handles invalid URLs for authenticated users
 * - If user is authenticated and hits invalid URL → redirect to /therai
 * - If user is not authenticated and hits invalid URL → redirect to /
 */
const SmartRedirect: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { chat_id } = useChatStore();

  useEffect(() => {
    // If user is authenticated, redirect to their chat
    if (user) {
      if (chat_id) {
        // User has active chat, redirect to it
        navigate(`/c/${chat_id}`, { replace: true });
      } else {
        // User authenticated but no active chat, redirect to /therai
        navigate('/therai', { replace: true });
      }
    } else {
      // User not authenticated, redirect to public chat
      navigate('/', { replace: true });
    }
  }, [user, chat_id, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
};

export default SmartRedirect;
