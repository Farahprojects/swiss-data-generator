import React from 'react';
import { useChatStore } from '@/core/store';

export const ChatSidebarControls: React.FC = () => {
  const ttsProvider = useChatStore((s) => s.ttsProvider);
  const ttsVoice = useChatStore((s) => s.ttsVoice);
  const setTtsProvider = useChatStore((s) => s.setTtsProvider);
  const setTtsVoice = useChatStore((s) => s.setTtsVoice);

  return (
    <div className="w-full flex flex-col gap-4">
      <div>
        <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">TTS Provider</p>
        <select
          className="w-full border rounded-md px-2 py-2 text-sm bg-white"
          value={ttsProvider}
          onChange={(e) => setTtsProvider(e.target.value as 'google' | 'openai')}
        >
          <option value="google">Google</option>
          <option value="openai">OpenAI</option>
        </select>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Voice</p>
        {ttsProvider === 'openai' ? (
          <select
            className="w-full border rounded-md px-2 py-2 text-sm bg-white"
            value={ttsVoice}
            onChange={(e) => setTtsVoice(e.target.value)}
          >
            <option value="alloy">Alloy</option>
            <option value="ash">Ash</option>
            <option value="coral">Coral</option>
            <option value="echo">Echo</option>
            <option value="fable">Fable</option>
            <option value="nova">Nova</option>
            <option value="onyx">Onyx</option>
            <option value="sage">Sage</option>
            <option value="shimmer">Shimmer</option>
          </select>
        ) : (
          <select
            className="w-full border rounded-md px-2 py-2 text-sm bg-white"
            value={ttsVoice}
            onChange={(e) => setTtsVoice(e.target.value)}
          >
            {/* Google HD/Studio voices */}
            <option value="en-US-Studio-O">en-US-Studio-O (F)</option>
            <option value="en-US-Studio-Q">en-US-Studio-Q (F)</option>
            <option value="en-US-Studio-K">en-US-Studio-K (M)</option>
            <option value="en-US-Studio-J">en-US-Studio-J (M)</option>
            <option value="en-US-Studio-M">en-US-Studio-M (M)</option>
          </select>
        )}
      </div>
    </div>
  );
};


