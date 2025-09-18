/**
 * Network Error Handler - Shows user-friendly popups for network issues
 * Replaces console.error spam with clean user notifications
 */

export interface NetworkError {
  type: 'NETWORK_CHANGED' | 'TIMEOUT' | 'CONNECTION_LOST' | 'SERVER_ERROR' | 'UNKNOWN';
  message: string;
  userMessage: string;
  canRetry: boolean;
}

export class NetworkErrorHandler {
  private static instance: NetworkErrorHandler;
  private errorQueue: NetworkError[] = [];
  private isShowingError = false;

  static getInstance(): NetworkErrorHandler {
    if (!NetworkErrorHandler.instance) {
      NetworkErrorHandler.instance = new NetworkErrorHandler();
    }
    return NetworkErrorHandler.instance;
  }

  /**
   * Handle network errors and show user-friendly popups
   */
  handleError(error: any, context?: string): void {
    const networkError = this.parseError(error, context);
    
    // Add to queue if we're already showing an error
    if (this.isShowingError) {
      this.errorQueue.push(networkError);
      return;
    }

    this.showErrorPopup(networkError);
  }

  /**
   * Parse different types of network errors
   */
  private parseError(error: any, context?: string): NetworkError {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    
    // Network connection issues
    if (errorMessage.includes('ERR_NETWORK_CHANGED') || 
        errorMessage.includes('NETWORK_CHANGED') ||
        errorMessage.includes('network changed')) {
      return {
        type: 'NETWORK_CHANGED',
        message: errorMessage,
        userMessage: 'Your internet connection changed. Please check your network and try again.',
        canRetry: true
      };
    }

    // Connection timeout
    if (errorMessage.includes('timeout') || 
        errorMessage.includes('TIMED_OUT') ||
        errorMessage.includes('Request timeout')) {
      return {
        type: 'TIMEOUT',
        message: errorMessage,
        userMessage: 'Request timed out. Your connection might be slow. Please try again.',
        canRetry: true
      };
    }

    // Connection lost
    if (errorMessage.includes('ERR_INTERNET_DISCONNECTED') ||
        errorMessage.includes('ERR_CONNECTION_REFUSED') ||
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('Network request failed')) {
      return {
        type: 'CONNECTION_LOST',
        message: errorMessage,
        userMessage: 'Connection lost. Please check your internet connection and try again.',
        canRetry: true
      };
    }

    // Server errors
    if (errorMessage.includes('500') || 
        errorMessage.includes('502') || 
        errorMessage.includes('503') ||
        errorMessage.includes('504') ||
        errorMessage.includes('server error')) {
      return {
        type: 'SERVER_ERROR',
        message: errorMessage,
        userMessage: 'Server is temporarily unavailable. Please try again in a moment.',
        canRetry: true
      };
    }

    // Default case
    return {
      type: 'UNKNOWN',
      message: errorMessage,
      userMessage: 'Something went wrong. Please check your connection and try again.',
      canRetry: true
    };
  }

  /**
   * Show error popup to user
   */
  private showErrorPopup(error: NetworkError): void {
    this.isShowingError = true;

    // Create popup element
    const popup = document.createElement('div');
    popup.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    popup.innerHTML = `
      <div class="bg-white rounded-xl p-6 max-w-md mx-4 shadow-2xl">
        <div class="flex items-center mb-4">
          <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
            <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900">Connection Issue</h3>
            <p class="text-sm text-gray-500">${error.userMessage}</p>
          </div>
        </div>
        
        <div class="flex gap-3 justify-end">
          <button id="retry-btn" class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
            Try Again
          </button>
          <button id="refresh-btn" class="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors">
            Refresh Page
          </button>
        </div>
      </div>
    `;

    // Add event listeners
    const retryBtn = popup.querySelector('#retry-btn');
    const refreshBtn = popup.querySelector('#refresh-btn');

    retryBtn?.addEventListener('click', () => {
      this.closePopup(popup);
      if (error.canRetry) {
        // Trigger a custom event that components can listen to
        window.dispatchEvent(new CustomEvent('network-retry', { detail: error }));
      }
    });

    refreshBtn?.addEventListener('click', () => {
      window.location.reload();
    });

    // Auto-close after 10 seconds
    setTimeout(() => {
      if (document.body.contains(popup)) {
        this.closePopup(popup);
      }
    }, 10000);

    // Add to DOM
    document.body.appendChild(popup);
  }

  /**
   * Close popup and show next error if any
   */
  private closePopup(popup: HTMLElement): void {
    popup.remove();
    this.isShowingError = false;

    // Show next error in queue
    if (this.errorQueue.length > 0) {
      const nextError = this.errorQueue.shift()!;
      setTimeout(() => this.showErrorPopup(nextError), 500);
    }
  }

  /**
   * Clear error queue
   */
  clearQueue(): void {
    this.errorQueue = [];
  }
}

// Export singleton instance
export const networkErrorHandler = NetworkErrorHandler.getInstance();
