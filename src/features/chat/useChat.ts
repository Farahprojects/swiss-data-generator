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
      console.log('[useChat] Verifying URL chat_id:', chat_id);
      verifyChatIdIntegrity(chat_id)
        .then(({ isValid }) => {
          if (isValid) {
            console.log('[useChat] ✅ URL chat_id verified, initializing conversation');
            try { ss?.setItem(SESSION_KEY, chat_id); } catch (_e) {}
            chatController.initializeConversation(chat_id);
          } else {
            console.warn('[useChat] ❌ URL chat_id invalid, redirecting to report page');
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
      console.log('[useChat] Found cached chat_id, verifying integrity:', cachedChatId);
      
      // Verify the cached chat_id is still valid
      verifyChatIdIntegrity(cachedChatId)
        .then(({ isValid, guestId: verifiedGuestId }) => {
          if (isValid) {
            console.log('[useChat] ✅ Cached chat_id verified, initializing conversation');
            chatController.initializeConversation(cachedChatId);
          } else {
            console.warn('[useChat] ❌ Cached chat_id failed verification, clearing cache');
            try { ss?.removeItem(SESSION_KEY); } catch (_e) {}
            
            // If we have a guestId, try to fetch a valid chat_id
            if (guestId) {
              console.log('[useChat] Attempting to fetch valid chat_id for guest:', guestId);
              getChatIdForGuest(guestId)
                .then((validChatId) => {
                  if (validChatId) {
                    console.log('[useChat] ✅ Found valid chat_id, saving and initializing:', validChatId);
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
              console.warn('[useChat] No guestId available, redirecting to report page');
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
      console.log('[useChat] No cached chat_id, fetching for guest:', guestId);
      getChatIdForGuest(guestId)
        .then((verifiedChatId) => {
          if (verifiedChatId) {
            console.log('[useChat] ✅ Found chat_id for guest, saving for persistence:', verifiedChatId);
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
      console.log('[useChat] No chat_id or guestId provided, redirecting to report page');
      navigate('/report');
    }
  }, [chat_id, guestId, navigate]);

  return {
    ...state,
    startTurn: chatController.startTurn,
    sendTextMessage: chatController.sendTextMessage,
    endTurn: chatController.endTurn,
    cancelTurn: chatController.cancelTurn,
  };
};
