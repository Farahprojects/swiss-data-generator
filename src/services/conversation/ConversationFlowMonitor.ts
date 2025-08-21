/**
 * 🎯 CONVERSATION FLOW MONITOR - Pure Observer
 * 
 * Monitors conversation flow without interfering with existing logic.
 * Just watches, logs, and provides visual feedback.
 */

export type FlowStep = 'idle' | 'listening' | 'transcribing' | 'thinking' | 'speaking' | 'error';

export interface FlowStepInfo {
  step: FlowStep;
  startTime: number;
  duration?: number;
  error?: string;
}

// Map React status to flow steps
const mapStatusToStep = (status: string): FlowStep => {
  switch (status) {
    case 'recording': return 'listening';
    case 'transcribing': return 'transcribing';
    case 'thinking': return 'thinking';
    case 'speaking': return 'speaking';
    case 'error': return 'error';
    default: return 'idle';
  }
};

class ConversationFlowMonitorClass {
  private isMonitoring = false;
  private currentStep: FlowStep = 'idle';
  private stepStartTime = 0;
  private listeners = new Set<(info: FlowStepInfo) => void>();
  private connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'failed' = 'disconnected';

  /**
   * START MONITORING - Called when conversation opens
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.connectionStatus = 'connecting';
    this.notifyListeners();
    
    console.log('🎯 [FLOW MONITOR] 🟢 Started monitoring conversation flow');
    
    // Simulate connection process
    setTimeout(() => {
      this.connectionStatus = 'connected';
      this.notifyListeners();
      console.log('🎯 [FLOW MONITOR] ✅ Connection established');
    }, 100);
  }

  /**
   * STOP MONITORING - Called when conversation closes
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    this.connectionStatus = 'disconnected';
    this.currentStep = 'idle';
    this.notifyListeners();
    
    console.log('🎯 [FLOW MONITOR] 🔴 Stopped monitoring conversation flow');
  }

  /**
   * OBSERVE STEP - Just log what's happening
   */
  observeStep(step: FlowStep): void {
    if (!this.isMonitoring) return;
    
    const now = Date.now();
    const previousStep = this.currentStep;
    const previousStartTime = this.stepStartTime;
    
    // Log step completion if we have a previous step
    if (previousStep !== 'idle' && previousStartTime > 0) {
      const duration = now - previousStartTime;
      console.log(`🎯 [FLOW MONITOR] ✅ Step: ${previousStep} completed (duration: ${duration}ms)`);
    }
    
    // Start new step
    this.currentStep = step;
    this.stepStartTime = now;
    
    console.log(`🎯 [FLOW MONITOR] 📝 Step: ${step} (started at ${now})`);
    
    this.notifyListeners();
  }

  /**
   * OBSERVE ERROR - Just log errors
   */
  observeError(step: FlowStep, error: Error): void {
    if (!this.isMonitoring) return;
    
    const now = Date.now();
    const duration = this.stepStartTime > 0 ? now - this.stepStartTime : 0;
    
    console.log(`🎯 [FLOW MONITOR] ❌ Step: ${step} failed after ${duration}ms - ${error.message}`);
    
    this.currentStep = 'error';
    this.notifyListeners();
  }

  /**
   * OBSERVE TIMEOUT - Just log timeouts
   */
  observeTimeout(step: FlowStep, timeoutMs: number): void {
    if (!this.isMonitoring) return;
    
    console.log(`🎯 [FLOW MONITOR] ⏰ Step: ${step} timed out after ${timeoutMs}ms`);
    
    this.currentStep = 'error';
    this.notifyListeners();
  }

  /**
   * OBSERVE REACT STATE CHANGE - Monitor React status changes
   */
  observeReactStateChange(reactStatus: string): void {
    if (!this.isMonitoring) return;
    
    const flowStep = mapStatusToStep(reactStatus);
    
    // Only log if it's a different step
    if (flowStep !== this.currentStep) {
      console.log(`🎯 [FLOW MONITOR] 🔄 React State Changed: ${reactStatus} → ${flowStep}`);
      this.observeStep(flowStep);
    }
  }

  /**
   * GET CURRENT STATE - For UI components
   */
  getState() {
    return {
      isMonitoring: this.isMonitoring,
      currentStep: this.currentStep,
      connectionStatus: this.connectionStatus,
      stepStartTime: this.stepStartTime,
      stepDuration: this.stepStartTime > 0 ? Date.now() - this.stepStartTime : 0
    };
  }

  /**
   * SUBSCRIBE - For React components
   */
  subscribe(listener: (info: FlowStepInfo) => void): () => void {
    this.listeners.add(listener);
    
    // Send current state immediately
    const state = this.getState();
    listener({
      step: state.currentStep,
      startTime: state.stepStartTime,
      duration: state.stepDuration
    });
    
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const state = this.getState();
    const info: FlowStepInfo = {
      step: state.currentStep,
      startTime: state.stepStartTime,
      duration: state.stepDuration
    };
    
    this.listeners.forEach(listener => listener(info));
  }
}

// Singleton instance
export const conversationFlowMonitor = new ConversationFlowMonitorClass();
