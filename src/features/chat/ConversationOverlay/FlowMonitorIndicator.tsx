import React from 'react';
import { useConversationFlowMonitor } from '@/hooks/useConversationFlowMonitor';

export const FlowMonitorIndicator: React.FC = () => {
  const { connectionStatus, isMonitoring } = useConversationFlowMonitor();

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

  const getIndicatorText = () => {
    switch (connectionStatus) {
      case 'connecting':
        return 'Connecting...';
      case 'connected':
        return 'Monitoring Active';
      case 'failed':
        return 'Connection Failed';
      default:
        return 'Disconnected';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-60 flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-full px-3 py-2 shadow-lg border border-gray-200">
      {/* Status dot */}
      <div className={`w-3 h-3 rounded-full ${getIndicatorColor()} animate-pulse`} />
      
      {/* Status text */}
      <span className="text-xs font-medium text-gray-700">
        {getIndicatorText()}
      </span>
    </div>
  );
};
