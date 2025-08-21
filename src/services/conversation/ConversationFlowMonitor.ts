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
  
  // Auto-recovery properties
  private autoRecoveryAttempts = 0;
  private maxAutoRecoveryAttempts = 2; // Reduced to 2 attempts
  private autoRecoveryInterval: NodeJS.Timeout | null = null;
  private onAutoRecoveryTrigger?: () => void;
  private onMaxAttemptsReached?: () => void;

  /**
   * START MONITORING - Called when conversation opens
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.connectionStatus = 'connecting';
    this.autoRecoveryAttempts = 0; // Reset attempts
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
    this.autoRecoveryAttempts = 0; // Reset attempts
    this.stopAutoRecoveryCheck(); // Clean up auto-recovery
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
    
    // Update current step based on React state (this is the source of truth)
    if (flowStep !== this.currentStep) {
      const now = Date.now();
      const previousStep = this.currentStep;
      const previousStartTime = this.stepStartTime;
      
      // Log step completion if we have a previous step
      if (previousStep !== 'idle' && previousStartTime > 0) {
        const duration = now - previousStartTime;
        console.log(`🎯 [FLOW MONITOR] ✅ Step: ${previousStep} completed (duration: ${duration}ms)`);
      }
      
      // Update to new step from React state
      this.currentStep = flowStep;
      this.stepStartTime = now;
      
      console.log(`🎯 [FLOW MONITOR] 📝 Step: ${flowStep} (from React state: ${reactStatus})`);
      
      // Notify subscribers of the state change
      this.notifyListeners();
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

  /**
   * AUTO-RECOVERY SYSTEM
   */
  
  /**
   * SETUP AUTO-RECOVERY - Configure recovery callbacks
   */
  setupAutoRecovery(
    onAutoRecoveryTrigger: () => void,
    onMaxAttemptsReached: () => void
  ): void {
    this.onAutoRecoveryTrigger = onAutoRecoveryTrigger;
    this.onMaxAttemptsReached = onMaxAttemptsReached;
    this.startAutoRecoveryCheck();
  }

  /**
   * START AUTO-RECOVERY CHECK - Monitor for stuck idle states
   */
  private startAutoRecoveryCheck(): void {
    if (this.autoRecoveryInterval) {
      clearInterval(this.autoRecoveryInterval);
    }

    this.autoRecoveryInterval = setInterval(() => {
      if (!this.isMonitoring) return;

      // Check if we're stuck in idle for more than 2 seconds (first attempt) or 3 seconds (second attempt)
      if (this.currentStep === 'idle' && this.stepStartTime > 0) {
        const idleDuration = Date.now() - this.stepStartTime;
        const timeoutMs = this.autoRecoveryAttempts === 0 ? 2000 : 3000; // 2s, then 3s
        
        if (idleDuration > timeoutMs) {
          this.triggerAutoRecovery();
        }
      }
    }, 1000); // Check every second
  }

  /**
   * TRIGGER AUTO-RECOVERY - Attempt to restart conversation
   */
  private triggerAutoRecovery(): void {
    if (this.autoRecoveryAttempts >= this.maxAutoRecoveryAttempts) {
      console.log(`🔄 [FLOW MONITOR] Max recovery attempts (${this.maxAutoRecoveryAttempts}) reached - giving up`);
      this.onMaxAttemptsReached?.();
      this.stopAutoRecoveryCheck();
      return;
    }

    this.autoRecoveryAttempts++;
    console.log(`🔄 [FLOW MONITOR] Auto-recovery attempt ${this.autoRecoveryAttempts}/${this.maxAutoRecoveryAttempts} - restarting conversation`);
    
    this.onAutoRecoveryTrigger?.();
  }

  /**
   * STOP AUTO-RECOVERY CHECK - Clean up interval
   */
  private stopAutoRecoveryCheck(): void {
    if (this.autoRecoveryInterval) {
      clearInterval(this.autoRecoveryInterval);
      this.autoRecoveryInterval = null;
    }
  }

  /**
   * RESET AUTO-RECOVERY - Reset attempt counter (called on successful turn)
   */
  resetAutoRecovery(): void {
    this.autoRecoveryAttempts = 0;
    console.log('🔄 [FLOW MONITOR] Auto-recovery reset - conversation working normally');
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
