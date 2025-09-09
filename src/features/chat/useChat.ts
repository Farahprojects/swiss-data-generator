// src/features/chat/useChat.ts
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChatStore } from '@/core/store';
import { chatController } from './ChatController';
import { getChatIdForGuest, verifyChatIdIntegrity } from '@/services/api/guestReports';

export const useChat = (chat_id?: string, guestId?: string) => {
  const state = useChatStore();
  const navigate = useNavigate();

  useEffect(() => {
    const ss = typeof window !== 'undefined' ? window.sessionStorage : null;
    const SESSION_KEY = 'therai_chat_id';

    // If chat_id provided directly, verify it first
    if (chat_id) {
      verifyChatIdIntegrity(chat_id)
        .then(({ isValid }) => {
          if (isValid) {
            try { ss?.setItem(SESSION_KEY, chat_id); } catch (_e) {}
            chatController.initializeConversation(chat_id);
          } else {
            navigate('/report');
          }
        })
        .catch(err => {
          console.error('[useChat] Error verifying URL chat_id:', err);
          navigate('/report');
        });
      return;
    }

    // If we have a cached chat_id for this tab, verify it first
    const cachedChatId = ss?.getItem(SESSION_KEY);
    if (cachedChatId) {
      // Verify the cached chat_id is still valid
      verifyChatIdIntegrity(cachedChatId)
        .then(({ isValid, guestId: verifiedGuestId }) => {
          if (isValid) {
            chatController.initializeConversation(cachedChatId);
          } else {
            try { ss?.removeItem(SESSION_KEY); } catch (_e) {}
            
            // If we have a guestId, try to fetch a valid chat_id
            if (guestId) {
              getChatIdForGuest(guestId)
                .then((validChatId) => {
                  if (validChatId) {
                    try { ss?.setItem(SESSION_KEY, validChatId); } catch (_e) {}
                    chatController.initializeConversation(validChatId);
                  } else {
                    console.error('[useChat] ❌ No valid chat_id found for guest:', guestId);
                    navigate('/report');
                  }
                })
                .catch(err => {
                  console.error('[useChat] Error fetching valid chat_id:', err);
                  navigate('/report');
                });
            } else {
              navigate('/report');
            }
          }
        })
        .catch(err => {
          console.error('[useChat] Error during chat_id verification:', err);
          // Clear potentially corrupted cache
          try { ss?.removeItem(SESSION_KEY); } catch (_e) {}
          navigate('/report');
        });
      return;
    }

    if (guestId) {
      // No cached chat_id, fetch from Guest Reports
      getChatIdForGuest(guestId)
        .then((verifiedChatId) => {
          if (verifiedChatId) {
            try { ss?.setItem(SESSION_KEY, verifiedChatId); } catch (_e) {}
            chatController.initializeConversation(verifiedChatId);
          } else {
            console.error('[useChat] ❌ Failed to get chat_id for guest:', guestId);
            navigate('/report');
          }
        })
        .catch(err => {
          console.error('[useChat] Failed to verify guest and get chat_id:', err);
          navigate('/report');
        });
    } else {
      // 🎯 FRESH CHAT: User wants to start a new chat session
      // Don't redirect - let them start fresh
      // The chat page will show the astro data prompt for new users
    }
  }, [chat_id, guestId, navigate]);

  return {
    ...state,
    initializeAudioPipeline: chatController.initializeAudioPipeline,
    pauseMic: chatController.pauseMic,
    unpauseMic: chatController.unpauseMic,
    sendTextMessage: chatController.sendTextMessage,
    cancelMic: chatController.cancelMic,
  };
};
