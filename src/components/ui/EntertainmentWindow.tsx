import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { TextAnimationModule } from './entertainment/TextAnimationModule';
import { VideoPlayerModule } from './entertainment/VideoPlayerModule';
import { LoadingAnimationModule } from './entertainment/LoadingAnimationModule';
import { InteractiveModule } from './entertainment/InteractiveModule';

export type EntertainmentType = 'text' | 'video' | 'animation' | 'interactive';

export interface EntertainmentConfig {
  type: EntertainmentType;
  content?: any;
  fallback?: EntertainmentType;
}

interface EntertainmentWindowProps {
  isOpen: boolean;
  duration: number; // in seconds
  timeRemaining: number;
  config: EntertainmentConfig;
  onComplete?: () => void;
  className?: string;
}

export const EntertainmentWindow: React.FC<EntertainmentWindowProps> = ({
  isOpen,
  duration,
  timeRemaining,
  config,
  onComplete,
  className = ""
}) => {
  const [currentType, setCurrentType] = useState<EntertainmentType>(config.type);
  const [hasError, setHasError] = useState(false);

  const progress = Math.max(0, ((duration - timeRemaining) / duration) * 100);

  // Fallback handling
  const handleModuleError = () => {
    if (config.fallback && !hasError) {
      setCurrentType(config.fallback);
      setHasError(true);
    }
  };

  // Reset when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentType(config.type);
      setHasError(false);
    }
  }, [isOpen, config.type]);

  const renderModule = () => {
    const moduleProps = {
      timeRemaining,
      onError: handleModuleError,
      config: config.content,
    };

    switch (currentType) {
      case 'video':
        return <VideoPlayerModule {...moduleProps} />;
      case 'animation':
        return <LoadingAnimationModule {...moduleProps} />;
      case 'interactive':
        return <InteractiveModule {...moduleProps} />;
      case 'text':
      default:
        return <TextAnimationModule {...moduleProps} />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.3 }}
          className={`w-full ${className}`}
        >
          <Card className="border-2 border-primary/20 shadow-lg bg-gradient-to-br from-background to-muted/30">
            <CardContent className="p-6 space-y-4">
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm text-muted-foreground">
                  <span>Preparing your report...</span>
                  <span>{timeRemaining}s remaining</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              {/* Entertainment Module */}
              <motion.div
                key={currentType}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="min-h-[200px] flex items-center justify-center"
              >
                {renderModule()}
              </motion.div>

              {/* Footer Info */}
              <div className="text-center text-xs text-muted-foreground">
                We're creating something special for you...
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
};