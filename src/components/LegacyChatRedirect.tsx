/**
 * ✅ LEGACY CHAT REDIRECT COMPONENT
 * 
 * Handles redirects from old /chat routes to new /c routes
 * Preserves guest_id and chat_id data during transition
 */

import { useEffect } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { handleGuestChatFromUrl } from '@/utils/guestChatRedirect';

const LegacyChatRedirect: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { chat_id } = useParams();

  useEffect(() => {
    const handleRedirect = async () => {
      console.log('[LegacyChatRedirect] Processing legacy /chat route');
      
      // Try to extract guest data from URL and redirect to /c
      const targetUrl = await handleGuestChatFromUrl(searchParams);
      
      if (targetUrl) {
        console.log(`[LegacyChatRedirect] Redirecting to: ${targetUrl}`);
        navigate(targetUrl, { replace: true });
        return;
      }
      
      // If we have a chat_id in the URL path, redirect to /c/:threadId
      if (chat_id) {
        console.log(`[LegacyChatRedirect] Redirecting chat_id ${chat_id} to /c/${chat_id}`);
        navigate(`/c/${chat_id}`, { replace: true });
        return;
      }
      
      // No chat data found, redirect to main /c
      console.log('[LegacyChatRedirect] No chat data found, redirecting to /c');
      navigate('/c', { replace: true });
    };
    
    handleRedirect();
  }, [navigate, searchParams, chat_id]);

  // Show loading while redirecting
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-muted-foreground">Redirecting to chat...</div>
    </div>
  );
};

export default LegacyChatRedirect;