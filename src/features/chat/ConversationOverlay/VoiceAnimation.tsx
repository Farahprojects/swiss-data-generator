import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { SpeakingBars } from './SpeakingBars';
import TorusListening from './TorusListening';
import { useConversationAudioLevel } from '@/hooks/useConversationAudioLevel';
import { useTtsStreamLevel } from '@/hooks/useTtsStreamLevel';

interface Props {
  state: 'listening' | 'processing' | 'replying' | 'connecting' | 'thinking';
}

export const VoiceAnimation: React.FC<Props> = ({ state }) => {
  const audioLevel = useConversationAudioLevel();
  const ttsAudioLevel = useTtsStreamLevel();

  const motionProps = {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: 0.2, ease: 'easeInOut' },
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6 relative h-40 w-40">
      <AnimatePresence mode="wait">
        {state === 'replying' && (
          <motion.div key="speaking" {...motionProps}>
            <SpeakingBars audioLevel={ttsAudioLevel} />
          </motion.div>
        )}

        {(state === 'processing' || state === 'thinking') && (
          <motion.div key="thinking" {...motionProps}>
            <TorusListening active={true} size={128} isThinking={true} />
          </motion.div>
        )}

        {state === 'listening' && (
          <motion.div key="listening" {...motionProps}>
            <TorusListening active={true} size={128} isThinking={false} audioLevel={audioLevel} />
          </motion.div>
        )}
        
        {state === 'connecting' && (
            <motion.div key="connecting" {...motionProps}>
                 <div className="w-24 h-24 md:w-32 md:h-32 bg-gray-500 rounded-full" />
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
