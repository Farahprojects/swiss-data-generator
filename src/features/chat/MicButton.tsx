import React from 'react';
import { Mic, MicOff, AlertCircle } from 'lucide-react';
import { useChatStore } from '@/core/store';
import { chatController } from './ChatController';

export const MicButton = () => {
  const { status } = useChatStore();

  const handlePress = () => {
    if (status === 'idle' || status === 'error') {
      chatController.startTurn();
    }
  };

  const handleRelease = () => {
    if (status === 'recording') {
      chatController.endTurn();
    }
  };

  const buttonClasses =
    'w-16 h-16 rounded-full flex items-center justify-center text-white transition-all duration-300 ease-in-out';

  switch (status) {
    case 'recording':
      return (
        <button
          onMouseUp={handleRelease}
          onTouchEnd={handleRelease}
          className={`${buttonClasses} bg-red-500 scale-110 shadow-lg`}
        >
          <Mic size={32} />
        </button>
      );
    case 'transcribing':
    case 'thinking':
      return (
        <div className={`${buttonClasses} bg-gray-400`}>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      );
    case 'speaking':
      return (
        <div className={`${buttonClasses} bg-blue-500`}>
          <MicOff size={32} />
        </div>
      );
    case 'error':
      return (
        <button
          onMouseDown={handlePress}
          onTouchStart={handlePress}
          className={`${buttonClasses} bg-yellow-500`}
        >
          <AlertCircle size={32} />
        </button>
      );
    case 'idle':
    default:
      return (
        <button
          onMouseDown={handlePress}
          onTouchStart={handlePress}
          className={`${buttonClasses} bg-green-500 hover:bg-green-600`}
        >
          <Mic size={32} />
        </button>
      );
  }
};
