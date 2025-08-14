import { useState, useEffect } from 'react';
import { audioRecorder } from '@/services/voice/recorder';
import { sttService } from '@/services/voice/stt';
import { llmService } from '@/services/llm/chat';
import { ttsService } from '@/services/voice/tts';
import { audioPlayer } from '@/services/voice/audioPlayer';
import { useChatStore } from '@/core/store';
import { SilenceDetector } from './audioAnalyser';
import { useConversationUIStore } from '@/features/chat/conversation-ui-store';

export type ConversationState = 'listening' | 'processing' | 'replying';

export const useConversationFSM = () => {
  const [state, setState] = useState<ConversationState>('listening');
  const conversationId = useChatStore((s) => s.conversationId)!;
  const addMessage = useChatStore((s) => s.addMessage);
  const [detector, setDetector] = useState<SilenceDetector | null>(null);
  const [fallbackTimer, setFallbackTimer] = useState<number | null>(null);
  const isConversationOpen = useConversationUIStore((s) => s.isConversationOpen);

  // start listening when entering listening state & overlay open
  useEffect(() => {
    if (state !== 'listening' || !isConversationOpen) return;
    (async () => {
      await audioRecorder.start();
      // 20s hard cap fallback (Safari / permission quirks)
      setFallbackTimer(window.setTimeout(() => handleSilence(), 20000));
      const stream = audioRecorder.getStream();
      if (stream) {
        const det = new SilenceDetector(() => handleSilence());
        await det.attachStream(stream);
        setDetector(det);
      }
    })();
    return () => {
      if (fallbackTimer) clearTimeout(fallbackTimer);
      detector?.cleanup();
      setDetector(null);
      // ensure mic is off when leaving listening or overlay closes
      audioRecorder.cancel();
    };
  }, [state, isConversationOpen]);

  const handleSilence = async () => {
    if (state !== 'listening' || !isConversationOpen) return;
    if (fallbackTimer) clearTimeout(fallbackTimer);
    setState('processing');
    let blob: Blob;
    try {
      blob = await audioRecorder.stop();
    } catch {
      // already stopped
      blob = new Blob();
    }
    detector?.cleanup();

    try {
      const transcription = await sttService.transcribe(blob);
      addMessage({ id: crypto.randomUUID(), conversationId, role: 'user', text: transcription, createdAt: new Date().toISOString() });
      const assistantMsg = await llmService.chat({ conversationId, userMessage: { text: transcription } });
      addMessage(assistantMsg);
      setState('replying');
      const audioUrl = await ttsService.speak(assistantMsg.id, assistantMsg.text);
      audioPlayer.play(audioUrl, () => {
        if (useConversationUIStore.getState().isConversationOpen) setState('listening');
      });
    } catch (err) {
      console.error(err);
      // brief cooldown to avoid tight error loops
      setTimeout(() => {
        if (useConversationUIStore.getState().isConversationOpen) setState('listening');
      }, 2000);
    }
  };

  return { state };
};
