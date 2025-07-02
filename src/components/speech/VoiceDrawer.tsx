import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Check, X, Volume2 } from 'lucide-react';
import clsx from 'clsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { useSpeechOrchestrator } from '@/hooks/useSpeechOrchestrator';
import { UseFormSetValue } from 'react-hook-form';
import { ReportFormData } from '@/types/public-report';

interface VoiceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  setValue: UseFormSetValue<ReportFormData>;
  onComplete: () => void;
}

const VoiceDrawer: React.FC<VoiceDrawerProps> = ({ isOpen, onClose, setValue, onComplete }) => {
  const {
    currentFlow,
    mappedFields,
    isShowingConfirmation,
    transcript,
    isRecording,
    isProcessing,
    audioLevel,
    startFlow,
    confirmMapping,
    rejectMapping,
    cancelFlow,
    toggleRecording,
    availableFlows,
  } = useSpeechOrchestrator(setValue);

  const handleClose = () => {
    cancelFlow();
    onClose();
  };

  const handleConfirm = () => {
    confirmMapping();
    onComplete();
    onClose();
  };

  const renderFloatingMic = () => (
    <div className="flex justify-center mb-6">
      <button
        type="button"
        onClick={toggleRecording}
        disabled={isProcessing}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        className={clsx(
          'flex items-center justify-center rounded-full border-2 shadow-xl transition-all duration-300',
          isRecording
            ? 'bg-gradient-to-r from-primary/20 to-primary/30 text-primary border-primary/30 scale-110'
            : 'bg-white text-primary hover:bg-primary/5 border-primary/20 hover:scale-105',
          isProcessing && 'opacity-50 cursor-not-allowed'
        )}
        style={{ 
          width: 80, 
          height: 80,
          boxShadow: isRecording 
            ? `0 0 0 ${Math.max(4, audioLevel / 15)}px hsl(var(--primary) / 0.1)` 
            : '0 10px 30px -10px hsl(var(--primary) / 0.2)'
        }}
      >
        <Mic className={clsx(
          'w-8 h-8 transition-transform duration-200',
          isRecording && 'scale-110'
        )} />
        
        {isRecording && (
          <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
        )}
      </button>
    </div>
  );

  const renderPromptSection = () => (
    <div className="text-center mb-6">
      <div className="flex items-center justify-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Volume2 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-lg text-gray-900">Voice Input</h3>
          <p className="text-sm text-gray-600">{currentFlow?.prompt}</p>
        </div>
      </div>
      
      {transcript && (
        <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-700 border-l-4 border-primary/30">
          <strong>You said:</strong> "{transcript}"
        </div>
      )}
    </div>
  );

  const renderConfirmationSection = () => (
    <div className="space-y-4">
      <div className="text-center">
        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
          <Check className="w-5 h-5 text-green-600" />
        </div>
        <h3 className="font-semibold text-lg text-gray-900 mb-2">Confirm Information</h3>
        <p className="text-sm text-gray-600">Please verify the extracted details</p>
      </div>
      
      <div className="space-y-3">
        {mappedFields.map((mapped, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-600 capitalize">
              {mapped.field.replace(/([A-Z])/g, ' $1').trim()}:
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-900 font-medium">{mapped.value}</span>
              <Badge 
                variant={mapped.confidence > 0.8 ? "default" : "secondary"}
                className="text-xs"
              >
                {Math.round(mapped.confidence * 100)}%
              </Badge>
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex gap-3 pt-4">
        <Button 
          onClick={handleConfirm} 
          className="flex-1"
        >
          <Check className="w-4 h-4 mr-2" />
          Confirm & Continue
        </Button>
        <Button 
          onClick={rejectMapping} 
          variant="outline" 
          className="flex-1"
        >
          <X className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    </div>
  );

  const renderFlowSelector = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="font-semibold text-lg text-gray-900 mb-2">Choose Voice Input</h3>
        <p className="text-sm text-gray-600">Select what information you'd like to provide by voice</p>
      </div>
      
      {availableFlows.map((flow) => (
        <Button
          key={flow.id}
          onClick={() => startFlow(flow.id)}
          variant="outline"
          className="w-full text-left justify-start h-auto p-4"
        >
          <div>
            <div className="font-medium text-sm mb-1">{flow.id.replace(/([A-Z])/g, ' $1').trim()}</div>
            <div className="text-xs text-gray-500">{flow.prompt}</div>
          </div>
        </Button>
      ))}
    </div>
  );

  return (
    <Drawer open={isOpen} onOpenChange={handleClose}>
      <DrawerContent className="h-[80vh] max-h-[600px]">
        <div className="flex flex-col h-full p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Voice Input</h2>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col justify-center">
            <AnimatePresence mode="wait">
              {!currentFlow && (
                <motion.div
                  key="selector"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  {renderFlowSelector()}
                </motion.div>
              )}

              {currentFlow && !isShowingConfirmation && (
                <motion.div
                  key="recording"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="text-center"
                >
                  {renderFloatingMic()}
                  {renderPromptSection()}
                </motion.div>
              )}

              {isShowingConfirmation && (
                <motion.div
                  key="confirmation"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  {renderConfirmationSection()}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default VoiceDrawer;