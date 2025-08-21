import React from 'react';
import { useConversationFlowMonitor } from '@/hooks/useConversationFlowMonitor';

export const FlowMonitorIndicator: React.FC = () => {
  const { connectionStatus, isMonitoring, flowInfo } = useConversationFlowMonitor();

  // Don't show if not monitoring
  if (!isMonitoring) return null;

  const getIndicatorColor = () => {
    switch (connectionStatus) {
      case 'connecting':
        return 'bg-yellow-500'; // Yellow for connecting
      case 'connected':
        return 'bg-green-500'; // Green for connected
      case 'failed':
        return 'bg-red-500'; // Red for failed
      default:
        return 'bg-gray-500'; // Gray for disconnected
    }
  };

  const getCurrentStepText = () => {
    switch (flowInfo.step) {
      case 'listening':
        return 'Listening';
      case 'transcribing':
        return 'Transcribing';
      case 'thinking':
        return 'Thinking';
      case 'speaking':
        return 'Speaking';
      case 'error':
        return 'Error';
      default:
        return 'Idle';
    }
  };

  const getIndicatorText = () => {
    if (connectionStatus === 'connected') {
      return `Monitor: ${getCurrentStepText()}`;
    }
    
    switch (connectionStatus) {
      case 'connecting':
        return 'Connecting...';
      case 'failed':
        return 'Connection Failed';
      default:
        return 'Disconnected';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-60 flex flex-col gap-1 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-gray-200">
      {/* Connection status */}
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${getIndicatorColor()} animate-pulse`} />
        <span className="text-xs font-medium text-gray-700">
          {getIndicatorText()}
        </span>
      </div>
      
      {/* Step duration (only show when connected and not idle) */}
      {connectionStatus === 'connected' && flowInfo.step !== 'idle' && flowInfo.duration && (
        <div className="text-xs text-gray-500 ml-5">
          {Math.round(flowInfo.duration / 1000)}s
        </div>
      )}
    </div>
  );
};
