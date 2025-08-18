/**
 * Scroll Lock Debugger Utility
 * 
 * This utility helps debug and fix stuck scroll locks on the report page.
 * It provides methods to detect, diagnose, and reset scroll locks.
 */

interface ScrollLockState {
  htmlOverflow: string;
  bodyOverflow: string;
  documentOverflow: string;
  hasScrollLock: boolean;
  lockSources: string[];
}

class ScrollLockDebugger {
  private static instance: ScrollLockDebugger;
  private lockSources = new Set<string>();

  static getInstance(): ScrollLockDebugger {
    if (!ScrollLockDebugger.instance) {
      ScrollLockDebugger.instance = new ScrollLockDebugger();
    }
    return ScrollLockDebugger.instance;
  }

  /**
   * Register a scroll lock source
   */
  registerLock(source: string): void {
    this.lockSources.add(source);
    console.log(`[ScrollLockDebugger] Lock registered: ${source}`, this.getState());
  }

  /**
   * Unregister a scroll lock source
   */
  unregisterLock(source: string): void {
    this.lockSources.delete(source);
    console.log(`[ScrollLockDebugger] Lock unregistered: ${source}`, this.getState());
  }

  /**
   * Get current scroll lock state
   */
  getState(): ScrollLockState {
    const html = document.documentElement;
    const body = document.body;
    
    const htmlOverflow = html.style.overflow || getComputedStyle(html).overflow;
    const bodyOverflow = body.style.overflow || getComputedStyle(body).overflow;
    const documentOverflow = getComputedStyle(document.documentElement).overflow;
    
    const hasScrollLock = htmlOverflow === 'hidden' || bodyOverflow === 'hidden';
    
    return {
      htmlOverflow,
      bodyOverflow,
      documentOverflow,
      hasScrollLock,
      lockSources: Array.from(this.lockSources)
    };
  }

  /**
   * Check if scroll is currently locked
   */
  isScrollLocked(): boolean {
    return this.getState().hasScrollLock;
  }

  /**
   * Force reset all scroll locks
   */
  forceReset(): void {
    const html = document.documentElement;
    const body = document.body;
    
    console.log('[ScrollLockDebugger] Force resetting scroll locks', this.getState());
    
    // Clear all overflow styles
    html.style.overflow = '';
    body.style.overflow = '';
    
    // Clear any custom CSS properties that might affect scrolling
    document.documentElement.style.removeProperty('--kb');
    document.documentElement.style.removeProperty('--footer-h');
    
    // Clear all registered sources
    this.lockSources.clear();
    
    console.log('[ScrollLockDebugger] Scroll locks reset', this.getState());
  }

  /**
   * Diagnose scroll lock issues
   */
  diagnose(): void {
    const state = this.getState();
    
    console.group('[ScrollLockDebugger] Scroll Lock Diagnosis');
    console.log('Current State:', state);
    console.log('Is Locked:', state.hasScrollLock);
    console.log('Active Sources:', state.lockSources);
    
    if (state.hasScrollLock && state.lockSources.length === 0) {
      console.warn('⚠️ Scroll is locked but no sources are registered - this indicates a cleanup issue');
    }
    
    if (!state.hasScrollLock && state.lockSources.length > 0) {
      console.warn('⚠️ Sources are registered but scroll is not locked - this may be expected');
    }
    
    console.groupEnd();
  }

  /**
   * Add a global reset button to the page (for debugging)
   */
  addDebugButton(): void {
    // Remove existing debug button
    const existing = document.getElementById('scroll-debug-button');
    if (existing) {
      existing.remove();
    }

    const button = document.createElement('button');
    button.id = 'scroll-debug-button';
    button.innerHTML = '🔓 Reset Scroll';
    button.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 99999;
      background: #ef4444;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: bold;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      transition: all 0.2s;
    `;
    
    button.addEventListener('mouseenter', () => {
      button.style.background = '#dc2626';
      button.style.transform = 'scale(1.05)';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.background = '#ef4444';
      button.style.transform = 'scale(1)';
    });
    
    button.addEventListener('click', () => {
      this.diagnose();
      this.forceReset();
      
      // Visual feedback
      button.innerHTML = '✅ Reset!';
      button.style.background = '#10b981';
      setTimeout(() => {
        button.innerHTML = '🔓 Reset Scroll';
        button.style.background = '#ef4444';
      }, 2000);
    });
    
    document.body.appendChild(button);
    
    console.log('[ScrollLockDebugger] Debug button added. Click to reset scroll locks.');
  }
}

// Export singleton instance
export const scrollLockDebugger = ScrollLockDebugger.getInstance();

// Auto-add debug button in development
if (process.env.NODE_ENV === 'development') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      scrollLockDebugger.addDebugButton();
    });
  } else {
    scrollLockDebugger.addDebugButton();
  }
}
