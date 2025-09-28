import React from 'react';
import { useChatStore } from '@/core/store';

export const VoiceSelectionPanel: React.FC = () => {
  const ttsVoice = useChatStore((s) => s.ttsVoice);
  const setTtsVoice = useChatStore((s) => s.setTtsVoice);

  const handleVoiceChange = (voice: string) => {
    setTtsVoice(voice);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Assistant Voice</h3>
        <p className="text-sm text-gray-600 mb-4">
          Choose the voice for your AI assistant. This preference is saved for your current session.
        </p>
        <select
          id="tts-voice"
          className="w-full pl-3 pr-10 py-2 text-base border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 rounded-xl"
          value={ttsVoice}
          onChange={(e) => handleVoiceChange(e.target.value)}
        >
          <optgroup label="Male Voices">
            <option value="Puck">Puck</option>
            <option value="Algenib">Algenib</option>
            <option value="Enceladus">Enceladus</option>
            <option value="Orus">Orus</option>
          </optgroup>
          <optgroup label="Female Voices">
            <option value="Achernar">Achernar</option>
            <option value="Aoede">Aoede</option>
            <option value="Leda">Leda</option>
            <option value="Sulafat">Sulafat</option>
            <option value="Zephyr">Zephyr</option>
          </optgroup>
        </select>
      </div>
    </div>
  );
};
