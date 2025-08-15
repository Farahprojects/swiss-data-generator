import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useConversationUIStore } from '@/features/chat/conversation-ui-store';
import { VoiceBubble } from './VoiceBubble';
import { useChatStore } from '@/core/store';
import { chatController } from '../ChatController';
import { useConversationAudioLevel } from '@/hooks/useConversationAudioLevel';
import { useDebugAudio } from '@/contexts/DebugAudioContext';

export const ConversationOverlay: React.FC = () => {
  const { isConversationOpen, closeConversation } = useConversationUIStore();
  const status = useChatStore((state) => state.status);
  const audioLevel = useConversationAudioLevel(); // Get real-time audio level
  const { debugAudio, setDebugAudio, clearDebugAudio } = useDebugAudio();

  // Listen for debug audio events from ChatController
  useEffect(() => {
    const handleDebugAudio = (event: CustomEvent) => {
      const { blob, reason } = event.detail;
      console.log('[ConversationOverlay] Received debug audio:', reason);
      setDebugAudio({ blob, reason });
    };

    window.addEventListener('debugAudio', handleDebugAudio as EventListener);
    return () => window.removeEventListener('debugAudio', handleDebugAudio as EventListener);
  }, [setDebugAudio]);
  
  // PROPER MODAL CLOSE - Stop conversation and turn off mic
  const handleModalClose = () => {
    console.log('[ConversationOverlay] Modal closing - resetting conversation service');
    chatController.resetConversationService(); // This fully resets the service
    closeConversation(); // This closes the UI
  };
  
  // Map chat status to conversation state for UI
  const state = status === 'recording' ? 'listening' : 
               status === 'transcribing' ? 'processing' : 
               status === 'thinking' ? 'processing' : 
               status === 'speaking' ? 'replying' : 'listening';

  if (!isConversationOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/20 backdrop-blur-sm" onClick={handleModalClose}>
      <div
        className="relative w-full md:max-w-md bg-white rounded-t-3xl md:rounded-3xl shadow-xl p-8" 
        style={{ height: '80%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center justify-center h-full gap-6">
          <VoiceBubble state={state} audioLevel={audioLevel} />
          
          {/* RAW AUDIO LEVEL DISPLAY - Simple mic input testing */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-500 transition-all duration-75"
                style={{ width: `${Math.min(audioLevel * 1000, 100)}%` }}
              />
            </div>
            <div className="text-xs text-gray-400 font-mono">
              Level: {(audioLevel * 1000).toFixed(1)} | dB: {audioLevel > 0 ? (20 * Math.log10(audioLevel)).toFixed(1) : '-∞'}
            </div>
          </div>
          
          {/* Status caption */}
          <p className="text-gray-500 font-light">{state === 'listening' ? 'Listening…' : state === 'processing' ? 'Thinking…' : 'Speaking…'}</p>
          
          {/* IN-MEMORY DEBUG AUDIO PLAYER */}
          {debugAudio && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 w-full max-w-sm">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-red-800">🔍 Debug Audio</h4>
                <button 
                  onClick={clearDebugAudio}
                  className="text-red-400 hover:text-red-600 text-xs"
                >
                  ✕
                </button>
              </div>
              <p className="text-xs text-red-600 mb-2">Reason: {debugAudio.reason}</p>
              <audio 
                controls 
                className="w-full h-8"
                src={URL.createObjectURL(debugAudio.blob)}
                style={{ height: '32px' }}
              />
              <p className="text-xs text-red-500 mt-1">
                Size: {(debugAudio.blob.size / 1024).toFixed(1)}KB | Duration: ~{(debugAudio.blob.size / 16000).toFixed(1)}s
              </p>
            </div>
          )}
        </div>
        {/* Close button */}
        <button onClick={handleModalClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">✕</button>
      </div>
    </div>,
    document.body
  );
};
