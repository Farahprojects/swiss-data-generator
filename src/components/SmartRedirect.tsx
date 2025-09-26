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
    // Clean up any hash fragments from Supabase auth callbacks
    if (window.location.hash) {
      console.log('🧹 Cleaning up hash fragment:', window.location.hash);
      // Remove hash from URL without triggering navigation
      const url = new URL(window.location.href);
      url.hash = '';
      window.history.replaceState({}, '', url.toString());
    }

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

  return null; // This component doesn't render anything
};

export default SmartRedirect;
