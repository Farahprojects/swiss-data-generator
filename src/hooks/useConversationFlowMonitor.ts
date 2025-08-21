/**
 * 🎯 USE CONVERSATION FLOW MONITOR - React Hook
 * 
 * Hook to subscribe to conversation flow monitoring
 */

import { useState, useEffect } from 'react';
import { conversationFlowMonitor, FlowStepInfo } from '@/services/conversation/ConversationFlowMonitor';
import { useChatStore } from '@/core/store';

export const useConversationFlowMonitor = () => {
  const [flowInfo, setFlowInfo] = useState<FlowStepInfo>({
    step: 'idle',
    startTime: 0
  });
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'failed'>('disconnected');
  
  // Monitor React state changes
  const reactStatus = useChatStore((state) => state.status);

  useEffect(() => {
    const unsubscribe = conversationFlowMonitor.subscribe((info: FlowStepInfo) => {
      setFlowInfo(info);
      
      // Get full state for connection status
      const state = conversationFlowMonitor.getState();
      setIsMonitoring(state.isMonitoring);
      setConnectionStatus(state.connectionStatus);
    });

    return unsubscribe;
  }, []);

  // Monitor React status changes
  useEffect(() => {
    if (isMonitoring) {
      conversationFlowMonitor.observeReactStateChange(reactStatus);
    }
  }, [reactStatus, isMonitoring]);

  return {
    flowInfo,
    isMonitoring,
    connectionStatus,
    // Helper methods
    startMonitoring: () => conversationFlowMonitor.startMonitoring(),
    stopMonitoring: () => conversationFlowMonitor.stopMonitoring(),
    observeStep: (step: FlowStepInfo['step']) => conversationFlowMonitor.observeStep(step),
    observeError: (step: FlowStepInfo['step'], error: Error) => conversationFlowMonitor.observeError(step, error),
    observeTimeout: (step: FlowStepInfo['step'], timeoutMs: number) => conversationFlowMonitor.observeTimeout(step, timeoutMs)
  };
};
