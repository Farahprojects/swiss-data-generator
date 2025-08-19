import { cleanupAllListeners } from '@/services/report/reportReadyListener';

// Logger function for session manager
const log = (level: 'log' | 'warn' | 'error' | 'info', message: string, data?: any, context?: string) => {
  console[level](`[${context || 'SessionManager'}] ${message}`, data);
};

/**
 * Professional Session Manager
 * Handles comprehensive session clearing with proper state management
 */
export class SessionManager {
  private static instance: SessionManager;
  private stateResetCallbacks: Map<string, () => void> = new Map();
  private isClearing = false;

  private constructor() {}

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * Register a component for state reset during session clearing
   */
  registerStateReset(componentId: string, callback: () => void): void {
    this.stateResetCallbacks.set(componentId, callback);
  }

  /**
   * Unregister a component's state reset callback
   */
  unregisterStateReset(componentId: string): void {
    this.stateResetCallbacks.delete(componentId);
  }

  /**
   * Clear all session data with proper state management
   */
  async clearSession(options: {
    showProgress?: boolean;
    redirectTo?: string;
    preserveNavigation?: boolean;
  } = {}): Promise<void> {
    const { showProgress = true, redirectTo = '/', preserveNavigation = false } = options;

    if (this.isClearing) {
      return;
    }

    this.isClearing = true;

    try {
      // Phase 1: Execute state resets and clear storage
      await this.executeStateResets();
      await this.clearAllStorage();
      await this.clearReactQueryCache();
      await this.clearReportCache();
      await this.clearModalStates();
      this.clearUrlParameters();
      
      // Cleanup real-time listeners
      cleanupAllListeners();

      // Phase 2: Navigation reset
      if (!preserveNavigation) {
        await this.navigateToCleanState(redirectTo);
      }

      // Phase 3: Dispatch cleanup event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('session-cleared', {
          detail: { timestamp: Date.now() }
        }));
      }

    } catch (error) {
      console.error('❌ SessionManager: Error during session clear:', error);
      throw error;
    } finally {
      this.isClearing = false;
    }
  }

  /**
   * Execute all registered state reset callbacks
   */
  private async executeStateResets(): Promise<void> {
    const callbacks = Array.from(this.stateResetCallbacks.values());
    const promises = callbacks.map(async (callback) => {
      try {
        await callback();
      } catch (error) {
        console.error('❌ State reset failed:', error);
      }
    });

    await Promise.all(promises);
  }

  /**
   * Clear all localStorage and sessionStorage
   */
  private async clearAllStorage(): Promise<void> {
    const storageKeys = [
      // Guest report data
      'currentGuestReportId',
      'currentGuestReportId_timestamp',
      'guest_payment_status',
      'guest_report_id',
      'guestId',
      'reportUrl',
      'seen', // Added to catch all seen keys
      
      // Navigation state
      'last_route',
      'last_route_params',
      
      // Modal states
      'modalState',
      'reportModalState',
      'reportModalPayload',
      
      // Tab management
      'activeTab',
      'activeTabId',
      
      // Form data
      'formData',
      'reportFormData',
      'formMemoryData',
      
      // Temporary data
      'temp_report_data',
      'chat_token',
      'cached_uuid',
      // Chat and chat-ui isolation keys (tab-scoped)
      'therai_conversation_id',
      'therai_chat_uuid',
      'therai_chat_token',
      'therai_chat_id',
      // Report ready isolation key (tab-scoped)
      'therai_report_ready',

      // Misc
      'countdown_shown', // Added to catch all countdown keys

      // Stripe and flow state
      'stripe_return_location',
      'pendingFlow',
      'report:oneTimeCleanDone',

      // Legacy/test flags
      'success'
    ];

    storageKeys.forEach(key => {
      try {
        // Clear keys that are exact matches
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
        
      // Clear keys that start with the given string (for dynamic keys like seen: and countdown_shown:)
      // We need to collect keys first, then remove them to avoid iteration issues
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const a_key = localStorage.key(i);
        if (a_key && a_key.startsWith(key + ':')) {
          keysToRemove.push(a_key);
        }
      }
      
      // Also check for exact prefix matches without ':' for keys like 'seen'
      for (let i = 0; i < localStorage.length; i++) {
        const a_key = localStorage.key(i);
        if (a_key && key === 'seen' && a_key.startsWith('seen:')) {
          keysToRemove.push(a_key);
        }
      }
        
        // Now remove all collected keys
        keysToRemove.forEach(keyToRemove => {
          localStorage.removeItem(keyToRemove);
        });

      } catch (error) {
        console.error(`Error removing ${key}:`, error);
      }
    });

    // Explicitly remove navigation keys shown in logs
    try {
      localStorage.removeItem('last_route');
      localStorage.removeItem('last_route_params');
    } catch {}

    // Explicitly remove legacy success flag from sessionStorage
    try {
      sessionStorage.removeItem('success');
    } catch {}
  }

  /**
   * Clear React Query cache comprehensively
   */
  private async clearReactQueryCache(): Promise<void> {
    try {
      const { useQueryClient } = await import('@tanstack/react-query');
      const queryClient = useQueryClient();
      
      // Clear all guest-related queries
      const queryKeys = [
        ['guest-report-data'],
        ['token-recovery'],
        ['guest-report-data', null],
        ['temp-report-data'],
        ['report-data'],
        ['report-payload'],
        ['promo-validation'],
        ['api-keys'],
        ['billing-data']
      ];

      queryKeys.forEach(queryKey => {
        queryClient.removeQueries({ queryKey });
      });
    } catch (error) {
      // Silent failure for React Query cache clearing
    }
  }

  /**
   * Clear report cache from new memory management system
   */
  private async clearReportCache(): Promise<void> {
    try {
      // Import the cache hook and clear it
      const { useReportCache } = await import('@/hooks/useReportCache');
      // Note: This is a bit tricky since hooks can't be called outside components
      // We'll handle this through the ReportModalContext
    } catch (error) {
      // Silent failure for report cache clearing
    }
  }

  /**
   * Clear modal states
   */
  private async clearModalStates(): Promise<void> {
    try {
      // Clear modal state from sessionStorage
      sessionStorage.removeItem('modalState');
      sessionStorage.removeItem('reportModalState');
      sessionStorage.removeItem('reportModalPayload');
    } catch (error) {
      console.error('Error clearing modal states:', error);
    }
  }

  /**
   * Clear URL parameters
   */
  private clearUrlParameters(): void {
    try {
      // Remove guest report ID from URL
      const url = new URL(window.location.href);
      url.searchParams.delete('guest_report_id');
      url.searchParams.delete('guest_id');
      url.searchParams.delete('token');
      
      // Update URL without navigation
      window.history.replaceState({}, '', url.toString());
    } catch (error) {
      console.error('Error clearing URL parameters:', error);
    }
  }

  /**
   * Navigate to clean state
   */
  private async navigateToCleanState(redirectTo: string): Promise<void> {
    try {
      // Small delay to ensure all clearing completes
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Force clean navigation
      window.location.href = redirectTo;
    } catch (error) {
      console.error('❌ Navigation failed:', error);
      // Ultimate fallback
      window.location.href = '/';
    }
  }

  /**
   * Get session status for debugging
   */
  getSessionStatus(): {
    hasGuestReport: boolean;
    hasModalState: boolean;
    hasNavigationState: boolean;
    registeredComponents: string[];
    memoryUsage?: any;
    activeTimers?: any;
  } {
    const hasGuestReport = !!localStorage.getItem('currentGuestReportId');
    const hasModalState = !!sessionStorage.getItem('modalState') || !!sessionStorage.getItem('reportModalState');
    const hasNavigationState = !!localStorage.getItem('last_route');
    const registeredComponents = Array.from(this.stateResetCallbacks.keys());

    // Development-only diagnostics
    let memoryUsage: any = undefined;
    let activeTimers: any = undefined;

    if (process.env.NODE_ENV === 'development') {
      try {
        // Memory usage (Chrome only)
        if (typeof window !== 'undefined' && 'performance' in window) {
          const memory = (performance as any).memory;
          if (memory) {
            memoryUsage = {
              usedJSHeapSize: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB`,
              totalJSHeapSize: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(1)}MB`,
              jsHeapSizeLimit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(1)}MB`
            };
          }
        }

        // Storage usage
        const localStorageKeys = Object.keys(localStorage);
        const sessionStorageKeys = Object.keys(sessionStorage);
        
        activeTimers = {
          localStorageKeys: localStorageKeys.length,
          sessionStorageKeys: sessionStorageKeys.length,
          registeredComponents: registeredComponents.length
        };
      } catch (error) {
        console.warn('Failed to get development diagnostics:', error);
      }
    }

    return {
      hasGuestReport,
      hasModalState,
      hasNavigationState,
      registeredComponents,
      memoryUsage,
      activeTimers
    };
  }
}

// Export singleton instance
export const sessionManager = SessionManager.getInstance(); 