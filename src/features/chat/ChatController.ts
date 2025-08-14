// src/features/chat/ChatController.ts
import { useChatStore } from '@/core/store';
import { audioRecorder } from '@/services/voice/recorder';
import { audioPlayer } from '@/services/voice/audioPlayer';
import { sttService } from '@/services/voice/stt';
import { llmService } from '@/services/llm/chat';
import { ttsService } from '@/services/voice/tts';
import { Message } from '@/core/types';
import { v4 as uuidv4 } from 'uuid';

class ChatController {
  private isTurnActive = false;

  async startTurn() {
    if (this.isTurnActive) return;
    this.isTurnActive = true;
    
    useChatStore.getState().setStatus('recording');
    try {
      await audioRecorder.start();
    } catch (error: any) {
      useChatStore.getState().setError(error.message);
      this.isTurnActive = false;
    }
  }

  async endTurn() {
    if (!this.isTurnActive) return;
    
    useChatStore.getState().setStatus('transcribing');
    try {
      const audioBlob = await audioRecorder.stop();
      
      const transcription = await sttService.transcribe(audioBlob);

      const userMessage: Message = {
        id: uuidv4(),
        conversationId: useChatStore.getState().conversationId || 'local',
        role: 'user',
        text: transcription,
        audioUrl: URL.createObjectURL(audioBlob),
        createdAt: new Date().toISOString(),
      };
      useChatStore.getState().addMessage(userMessage);

      useChatStore.getState().setStatus('thinking');

      const llmResponse = await llmService.chat({
        conversationId: useChatStore.getState().conversationId || 'local',
        messages: useChatStore.getState().messages,
      });

      const audioUrl = await ttsService.speak(llmResponse);

      const assistantMessage: Message = {
        id: uuidv4(),
        conversationId: useChatStore.getState().conversationId || 'local',
        role: 'assistant',
        text: llmResponse,
        audioUrl,
        createdAt: new Date().toISOString(),
      };
      useChatStore.getState().addMessage(assistantMessage);

      audioPlayer.play(audioUrl, () => {
        useChatStore.getState().setStatus('idle');
        this.isTurnActive = false;
      });

    } catch (error: any) {
      useChatStore.getState().setError('Failed to process audio.');
      this.isTurnActive = false;
    }
  }

  cancelTurn() {
    if (!this.isTurnActive) return;
    audioRecorder.cancel();
    useChatStore.getState().setStatus('idle');
    this.isTurnActive = false;
  }
}

export const chatController = new ChatController();
