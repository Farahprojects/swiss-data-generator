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

        // If user is signed in, check if they already have access to this conversation
        if (isAuthenticated && user) {
          const { data: userConversation } = await supabase
            .from('conversations')
            .select('id')
            .eq('id', chatId)
            .eq('user_id', user.id)
            .single();

          setIsJoined(!!userConversation);
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
    <div className="h-screen flex flex-col">
      {/* Header with Join Button */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-medium text-gray-900">Shared Conversation</h1>
              <p className="text-sm text-gray-500">{conversation.title || 'Untitled'}</p>
            </div>
          </div>
          
          {/* Join Button */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Shared
            </div>
            
            {!isAuthenticated ? (
              <button
                onClick={handleSignIn}
                className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Sign in to join
              </button>
            ) : isJoined ? (
              <button
                onClick={() => navigate(`/c/${chatId}`, { replace: true })}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Open conversation
              </button>
            ) : (
              <button
                onClick={handleJoin}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Join this conversation
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Chat Container - Full Height */}
      <div className="flex-1 overflow-hidden">
        <ChatContainer />
      </div>
    </div>
  );
};

export default JoinConversation;
