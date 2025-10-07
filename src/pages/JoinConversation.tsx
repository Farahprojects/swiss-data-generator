import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Conversation } from '@/services/conversations';
import ChatContainer from './ChatContainer';

const JoinConversation: React.FC = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check auth state
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      setIsAuthenticated(!!session?.user);
    };
    
    checkAuth();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {                                                                    
      setUser(session?.user || null);
      setIsAuthenticated(!!session?.user);
    });
    
    return () => subscription.unsubscribe();
  }, []);

  // Check if conversation is public and load it
  useEffect(() => {
    const loadPublicConversation = async () => {
      if (!chatId) {
        setError('Invalid conversation link');
        setLoading(false);
        return;
      }

      try {
        // Check if conversation exists and is public
        const { data, error: fetchError } = await supabase
          .from('conversations')
          .select('id, user_id, title, created_at, updated_at, meta, is_public')
          .eq('id', chatId)
          .eq('is_public', true)
          .single();

        if (fetchError || !data) {
          setError('Conversation not found or not shared');
          setLoading(false);
          return;
        }

        setConversation(data);

        // If user is signed in, ensure it's in their history; then redirect to /c/:chatId                                                                      
        if (isAuthenticated && user) {
          const { data: userConversation } = await supabase
            .from('conversations')
            .select('id')
            .eq('id', chatId)
            .eq('user_id', user.id)
            .single();

          if (!userConversation) {
            await supabase
              .from('conversations')
              .insert({
                id: chatId,
                user_id: user.id,
                title: data.title,
                meta: { ...(data.meta || {}), is_shared_copy: true },
              });
          }

          setIsJoined(true);
          navigate(`/c/${chatId}`, { replace: true });
          return;
        }
      } catch (err) {
        console.error('Error loading conversation:', err);
        setError('Failed to load conversation');
      } finally {
        setLoading(false);
      }
    };

    loadPublicConversation();
  }, [chatId, isAuthenticated, user]);

  const handleJoin = async () => {
    if (!isAuthenticated || !user || !chatId || !conversation) return;

    try {
      // Add this conversation to the user's conversations
      const { error: joinError } = await supabase
        .from('conversations')
        .insert({
          id: chatId,
          user_id: user.id,
          title: conversation.title,
          created_at: conversation.created_at,
          updated_at: conversation.updated_at,
          meta: conversation.meta
        });

      if (joinError) {
        console.error('Error joining conversation:', joinError);
        return;
      }

      setIsJoined(true);
      
      // Redirect to the full chat interface
      navigate(`/c/${chatId}`, { replace: true });
    } catch (err) {
      console.error('Error joining conversation:', err);
    }
  };

  const handleSignIn = () => {
    try {
      if (chatId) {
        localStorage.setItem('pending_join_chat_id', chatId);
      }
    } catch {}
    navigate('/therai');
  };

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
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">                                                     
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">                                                        
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />               
            </svg>
          </div>
          <h1 className="text-xl font-medium text-gray-900 mb-2">Conversation Not Found</h1>                                                                    
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/', { replace: true })}
            className="px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-medium transition-colors"                                     
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <ChatContainer />
  );
};

export default JoinConversation;
