/**
 * 🎯 USE CHAT CHANNEL - React Hook for Supabase Realtime Chat Subscriptions
 * 
 * Manages a single Supabase Realtime channel per chat with proper cleanup,
 * memory leak prevention, and performance optimizations.
 */

import { useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useChatStore } from '@/core/store';
import { Message } from '@/core/types';
import { RealtimeChannel } from '@supabase/supabase-js';

interface ChatChannelOptions {
  onMessageReceived?: (message: Message) => void;
  onMessageUpdated?: (message: Message) => void;
  onMessageDeleted?: (messageId: string) => void;
  onError?: (error: Error) => void;
  enabled?: boolean;
}

interface ChatChannelState {
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
  channelId: string | null;
}

export const useChatChannel = (chatId: string | null, options: ChatChannelOptions = {}) => {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [state, setState] = useRef<ChatChannelState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    channelId: null
  }).current;

  // Memoized event handlers to prevent unnecessary re-subscriptions
  const handleMessageReceived = useCallback((payload: any) => {
    if (!isMountedRef.current || !options.onMessageReceived) return;
    
    try {
      const message: Message = {
        id: payload.new.id,
        conversationId: payload.new.chat_id,
        role: payload.new.role,
        text: payload.new.text,
        audioUrl: payload.new.audio_url,
        timings: payload.new.timings,
        createdAt: payload.new.created_at,
        meta: payload.new.meta,
        client_msg_id: payload.new.client_msg_id,
        status: payload.new.status
      };
      
      options.onMessageReceived(message);
    } catch (error) {
      console.error('[useChatChannel] Error processing message received:', error);
      options.onError?.(error as Error);
    }
  }, [options.onMessageReceived, options.onError]);

  const handleMessageUpdated = useCallback((payload: any) => {
    if (!isMountedRef.current || !options.onMessageUpdated) return;
    
    try {
      const message: Message = {
        id: payload.new.id,
        conversationId: payload.new.chat_id,
        role: payload.new.role,
        text: payload.new.text,
        audioUrl: payload.new.audio_url,
        timings: payload.new.timings,
        createdAt: payload.new.created_at,
        meta: payload.new.meta,
        client_msg_id: payload.new.client_msg_id,
        status: payload.new.status
      };
      
      options.onMessageUpdated(message);
    } catch (error) {
      console.error('[useChatChannel] Error processing message updated:', error);
      options.onError?.(error as Error);
    }
  }, [options.onMessageUpdated, options.onError]);

  const handleMessageDeleted = useCallback((payload: any) => {
    if (!isMountedRef.current || !options.onMessageDeleted) return;
    
    try {
      const messageId = payload.old.id;
      options.onMessageDeleted(messageId);
    } catch (error) {
      console.error('[useChatChannel] Error processing message deleted:', error);
      options.onError?.(error as Error);
    }
  }, [options.onMessageDeleted, options.onError]);

  // Cleanup function
  const cleanup = useCallback(() => {
    console.log(`[useChatChannel] Cleaning up channel for chat: ${chatId}`);
    
    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Unsubscribe from channel
    if (channelRef.current) {
      try {
        channelRef.current.unsubscribe();
        console.log(`[useChatChannel] Unsubscribed from channel: ${state.channelId}`);
      } catch (error) {
        console.error('[useChatChannel] Error unsubscribing from channel:', error);
      }
      channelRef.current = null;
    }
    
    // Abort any in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // Reset state
    state.isConnected = false;
    state.isConnecting = false;
    state.error = null;
    state.channelId = null;
  }, [chatId, state]);

  // Create and subscribe to channel
  const subscribe = useCallback(async () => {
    if (!chatId || !options.enabled || !isMountedRef.current) {
      return;
    }

    // Cleanup any existing subscription
    cleanup();
    
    // Create new abort controller for this subscription
    abortControllerRef.current = new AbortController();
    
    const channelId = `chat:${chatId}`;
    state.channelId = channelId;
    state.isConnecting = true;
    
    console.log(`[useChatChannel] Creating channel: ${channelId}`);
    
    try {
      // Create channel
      const channel = supabase.channel(channelId);
      
      // Subscribe to message events
      channel
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `chat_id=eq.${chatId}`
          },
          handleMessageReceived
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
            filter: `chat_id=eq.${chatId}`
          },
          handleMessageUpdated
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'messages',
            filter: `chat_id=eq.${chatId}`
          },
          handleMessageDeleted
        )
        .subscribe((status) => {
          if (!isMountedRef.current) return;
          
          console.log(`[useChatChannel] Channel ${channelId} status:`, status);
          
          if (status === 'SUBSCRIBED') {
            state.isConnected = true;
            state.isConnecting = false;
            state.error = null;
            console.log(`[useChatChannel] Successfully subscribed to ${channelId}`);
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            state.isConnected = false;
            state.isConnecting = false;
            state.error = new Error(`Channel subscription failed: ${status}`);
            console.error(`[useChatChannel] Channel ${channelId} failed:`, status);
            
            // Attempt reconnection after delay
            if (isMountedRef.current && options.enabled) {
              reconnectTimeoutRef.current = setTimeout(() => {
                if (isMountedRef.current) {
                  console.log(`[useChatChannel] Attempting to reconnect to ${channelId}`);
                  subscribe();
                }
              }, 5000); // 5 second delay
            }
          }
        });
      
      channelRef.current = channel;
      
    } catch (error) {
      console.error(`[useChatChannel] Error creating channel ${channelId}:`, error);
      state.error = error as Error;
      state.isConnecting = false;
      options.onError?.(error as Error);
    }
  }, [chatId, options.enabled, cleanup, handleMessageReceived, handleMessageUpdated, handleMessageDeleted, options.onError, state]);

  // Effect to manage subscription lifecycle
  useEffect(() => {
    isMountedRef.current = true;
    
    if (chatId && options.enabled) {
      subscribe();
    }
    
    // Cleanup on unmount or chatId change
    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, [chatId, options.enabled, subscribe, cleanup]);

  // Debug logging for memory leak detection
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[useChatChannel] Active subscriptions:`, {
        chatId,
        channelId: state.channelId,
        isConnected: state.isConnected,
        isConnecting: state.isConnecting
      });
    }
  }, [chatId, state.channelId, state.isConnected, state.isConnecting]);

  return {
    isConnected: state.isConnected,
    isConnecting: state.isConnecting,
    error: state.error,
    channelId: state.channelId,
    reconnect: subscribe,
    disconnect: cleanup
  };
};
