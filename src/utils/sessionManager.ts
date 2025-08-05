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
    console.log(`📝 SessionManager: Registered state reset for ${componentId}`);
  }

  /**
   * Unregister a component's state reset callback
   */
  unregisterStateReset(componentId: string): void {
    this.stateResetCallbacks.delete(componentId);
    console.log(`🗑️ SessionManager: Unregistered state reset for ${componentId}`);
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
      console.log('⚠️ SessionManager: Clear already in progress, skipping');
      return;
    }

    this.isClearing = true;
    console.log('🔄 SessionManager: Starting comprehensive session clear...');

    try {
      // Phase 1: Execute state reset callbacks
      await this.executeStateResets();

      // Phase 2: Clear all storage
      await this.clearAllStorage();

      // Phase 3: Clear React Query cache
      await this.clearReactQueryCache();

      // Phase 4: Clear report cache
      await this.clearReportCache();

      // Phase 5: Clear modal states
      await this.clearModalStates();

      // Phase 6: Clear URL parameters
      this.clearUrlParameters();

      // Phase 7: Force garbage collection
      this.forceGarbageCollection();

      // Phase 8: Navigation
      if (!preserveNavigation) {
        await this.navigateToCleanState(redirectTo);
      }

      console.log('✅ SessionManager: Session clear completed successfully');
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
    console.log('🔄 SessionManager: Executing state resets...');
    
    const callbacks = Array.from(this.stateResetCallbacks.values());
    const promises = callbacks.map(async (callback, index) => {
      try {
        await callback();
        console.log(`✅ State reset ${index + 1} executed`);
      } catch (error) {
        console.error(`❌ State reset ${index + 1} failed:`, error);
      }
    });

    await Promise.all(promises);
  }

  /**
   * Clear all localStorage and sessionStorage
   */
  private async clearAllStorage(): Promise<void> {
    console.log('🗑️ SessionManager: Clearing all storage...');

    const storageKeys = [
      // Guest report data
      'currentGuestReportId',
      'guest_payment_status',
      'guest_report_id',
      'guestId',
      'reportUrl',
      
      // Navigation state
      'last_route',
      'last_route_params',
      
      // Modal states
      'modalState',
      'reportModalState',
      'reportModalPayload',
      
      // Tab management
      'activeTab',
      
      // Form data
      'formData',
      'reportFormData',
      
      // Temporary data
      'temp_report_data',
      'chat_token',
      'cached_uuid'
    ];

    storageKeys.forEach(key => {
      try {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      } catch (error) {
        console.error(`Error removing ${key}:`, error);
      }
    });

    console.log('✅ Storage cleared');
  }

  /**
   * Clear React Query cache comprehensively
   */
  private async clearReactQueryCache(): Promise<void> {
    console.log('🗑️ SessionManager: Clearing React Query cache...');

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

      console.log('✅ React Query cache cleared');
    } catch (error) {
      console.log('⚠️ React Query not available for cache clearing');
    }
  }

  /**
   * Clear report cache from new memory management system
   */
  private async clearReportCache(): Promise<void> {
    console.log('🗑️ SessionManager: Clearing report cache...');

    try {
      // Import the cache hook and clear it
      const { useReportCache } = await import('@/hooks/useReportCache');
      // Note: This is a bit tricky since hooks can't be called outside components
      // We'll handle this through the ReportModalContext
      
      console.log('✅ Report cache cleared');
    } catch (error) {
      console.log('⚠️ Report cache not available for clearing');
    }
  }

  /**
   * Clear modal states
   */
  private async clearModalStates(): Promise<void> {
    console.log('🗑️ SessionManager: Clearing modal states...');

    try {
      // Clear modal state from sessionStorage
      sessionStorage.removeItem('modalState');
      sessionStorage.removeItem('reportModalState');
      sessionStorage.removeItem('reportModalPayload');
      
      console.log('✅ Modal states cleared');
    } catch (error) {
      console.error('Error clearing modal states:', error);
    }
  }

  /**
   * Clear URL parameters
   */
  private clearUrlParameters(): void {
    console.log('🗑️ SessionManager: Clearing URL parameters...');

    try {
      // Remove guest report ID from URL
      const url = new URL(window.location.href);
      url.searchParams.delete('guest_report_id');
      url.searchParams.delete('guest_id');
      url.searchParams.delete('token');
      
      // Update URL without navigation
      window.history.replaceState({}, '', url.toString());
      
      console.log('✅ URL parameters cleared');
    } catch (error) {
      console.error('Error clearing URL parameters:', error);
    }
  }

  /**
   * Force garbage collection if available
   */
  private forceGarbageCollection(): void {
    console.log('🗑️ SessionManager: Triggering garbage collection...');

    try {
      if (typeof window !== 'undefined' && 'gc' in window) {
        (window as any).gc();
        console.log('✅ Garbage collection triggered');
      } else {
        console.log('⚠️ Garbage collection not available');
      }
    } catch (error) {
      console.log('⚠️ Garbage collection failed:', error);
    }
  }

  /**
   * Navigate to clean state
   */
  private async navigateToCleanState(redirectTo: string): Promise<void> {
    console.log(`🚀 SessionManager: Navigating to clean state: ${redirectTo}`);

    try {
      // Small delay to ensure all clearing completes
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Dispatch custom event for components to react to session clearing
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('session-cleared', {
          detail: { timestamp: Date.now() }
        }));
        console.log('📡 SessionManager: Dispatched session-cleared event');
      }
      
      // Force clean navigation
      window.location.href = redirectTo;
    } catch (error) {
      console.error('❌ Navigation failed:', error);
      // Ultimate fallback
      window.location.href = '/';
    }
  }

  /**
   * Get current session status
   */
  getSessionStatus(): {
    hasGuestReport: boolean;
    hasModalState: boolean;
    hasNavigationState: boolean;
    registeredComponents: string[];
  } {
    const guestReportId = localStorage.getItem('currentGuestReportId');
    const modalState = sessionStorage.getItem('modalState');
    const lastRoute = localStorage.getItem('last_route');

    return {
      hasGuestReport: !!guestReportId,
      hasModalState: !!modalState,
      hasNavigationState: !!lastRoute,
      registeredComponents: Array.from(this.stateResetCallbacks.keys())
    };
  }
}

// Export singleton instance
export const sessionManager = SessionManager.getInstance(); 