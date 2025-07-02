import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Check, X, Volume2 } from 'lucide-react';
import clsx from 'clsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSpeechOrchestrator, MappedField } from '@/hooks/useSpeechOrchestrator';
import { UseFormSetValue } from 'react-hook-form';
import { ReportFormData } from '@/types/public-report';

interface SpeechOrchestratorProps {
  setValue: UseFormSetValue<ReportFormData>;
  className?: string;
}

const SpeechOrchestrator: React.FC<SpeechOrchestratorProps> = ({ setValue, className }) => {
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

  const renderFloatingMic = () => (
    <button
      type="button"
      onClick={toggleRecording}
      disabled={isProcessing}
      aria-label={isRecording ? 'Stop recording' : 'Start recording'}
      className={clsx(
        'fixed z-50 left-1/2 -translate-x-1/2 bottom-8 flex items-center justify-center rounded-full border-2 shadow-2xl transition-all duration-300',
        isRecording
          ? 'bg-gradient-to-r from-primary/80 to-primary text-white border-primary/30 shadow-primary/30 scale-110'
          : 'bg-gradient-to-r from-primary to-primary/90 text-white hover:shadow-primary/40 border-primary/20 hover:scale-105',
        isProcessing && 'opacity-50 cursor-not-allowed',
        className
      )}
      style={{ 
        width: 64, 
        height: 64,
        boxShadow: isRecording 
          ? `0 0 0 ${Math.max(4, audioLevel / 10)}px hsl(var(--primary) / 0.2)` 
          : undefined
      }}
    >
      <Mic className={clsx(
        'w-6 h-6 transition-transform duration-200',
        isRecording && 'scale-110'
      )} />
      
      {/* Soft glow indicator when recording */}
      {isRecording && (
        <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
      )}
    </button>
  );

  const renderPromptCard = () => (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -20, opacity: 0 }}
      className="fixed bottom-24 left-4 right-4 z-40"
    >
      <Card className="bg-white/95 backdrop-blur-lg border-primary/20 shadow-xl">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Volume2 className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm text-gray-900">Voice Input</h3>
              <p className="text-xs text-gray-600">{currentFlow?.prompt}</p>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={cancelFlow}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {transcript && (
            <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700 border-l-2 border-primary/30">
              "{transcript}"
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );

  const renderConfirmationCard = () => (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -20, opacity: 0 }}
      className="fixed bottom-24 left-4 right-4 z-40"
    >
      <Card className="bg-white/95 backdrop-blur-lg border-green-200 shadow-xl">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="w-4 h-4 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm text-gray-900">Confirm Mapping</h3>
              <p className="text-xs text-gray-600">Please verify the extracted information</p>
            </div>
          </div>
          
          <div className="space-y-2 mb-4">
            {mappedFields.map((mapped, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-xs font-medium text-gray-600 capitalize">
                  {mapped.field.replace(/([A-Z])/g, ' $1').trim()}:
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-900">{mapped.value}</span>
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
          
          <div className="flex gap-2">
            <Button 
              onClick={confirmMapping} 
              size="sm" 
              className="flex-1"
            >
              <Check className="w-4 h-4 mr-1" />
              Confirm
            </Button>
            <Button 
              onClick={rejectMapping} 
              variant="outline" 
              size="sm" 
              className="flex-1"
            >
              <X className="w-4 h-4 mr-1" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  const renderFlowSelector = () => (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="space-y-2"
    >
      {availableFlows.map((flow) => (
        <Button
          key={flow.id}
          onClick={() => startFlow(flow.id)}
          variant="outline"
          className="w-full text-left justify-start h-auto p-3"
        >
          <div>
            <div className="font-medium text-sm">{flow.id.replace(/([A-Z])/g, ' $1').trim()}</div>
            <div className="text-xs text-gray-500 mt-1">{flow.prompt}</div>
          </div>
        </Button>
      ))}
    </motion.div>
  );

  return (
    <>
      {/* Floating Mic Button */}
      {currentFlow && renderFloatingMic()}
      
      {/* Overlays */}
      <AnimatePresence mode="wait">
        {currentFlow && !isShowingConfirmation && renderPromptCard()}
        {isShowingConfirmation && renderConfirmationCard()}
      </AnimatePresence>
      
      {/* Flow Selector (when no active flow) */}
      {!currentFlow && renderFlowSelector()}
    </>
  );
};

export default SpeechOrchestrator;