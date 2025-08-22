/**
 * 🎯 MEMORY LEAK DETECTOR - Performance Monitoring Utility
 * 
 * Detects memory leaks, monitors performance, and provides debugging tools
 * for React client memory management.
 */

interface MemorySnapshot {
  timestamp: number;
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  activeChannels: string[];
  activeSubscriptions: number;
}

interface PerformanceMetrics {
  memorySnapshots: MemorySnapshot[];
  averageMemoryUsage: number;
  memoryGrowthRate: number;
  peakMemoryUsage: number;
  channelCount: number;
}

class MemoryLeakDetector {
  private snapshots: MemorySnapshot[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;
  private activeChannels = new Set<string>();
  private subscriptionCount = 0;

  /**
   * Start memory monitoring
   */
  startMonitoring(intervalMs: number = 5000): void {
    if (this.isMonitoring) {
      console.warn('[MemoryLeakDetector] Already monitoring');
      return;
    }

    this.isMonitoring = true;
    console.log('[MemoryLeakDetector] Starting memory monitoring...');

    this.monitoringInterval = setInterval(() => {
      this.takeSnapshot();
    }, intervalMs);
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('[MemoryLeakDetector] Stopped memory monitoring');
  }

  /**
   * Take a memory snapshot
   */
  takeSnapshot(): MemorySnapshot {
    const performance = (window as any).performance;
    const memory = performance?.memory;
    
    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      usedJSHeapSize: memory?.usedJSHeapSize || 0,
      totalJSHeapSize: memory?.totalJSHeapSize || 0,
      jsHeapSizeLimit: memory?.jsHeapSizeLimit || 0,
      activeChannels: Array.from(this.activeChannels),
      activeSubscriptions: this.subscriptionCount
    };

    this.snapshots.push(snapshot);

    // Keep only last 100 snapshots to prevent memory bloat
    if (this.snapshots.length > 100) {
      this.snapshots = this.snapshots.slice(-100);
    }

    return snapshot;
  }

  /**
   * Register an active channel
   */
  registerChannel(channelId: string): void {
    this.activeChannels.add(channelId);
    console.log(`[MemoryLeakDetector] Channel registered: ${channelId}`);
  }

  /**
   * Unregister an active channel
   */
  unregisterChannel(channelId: string): void {
    this.activeChannels.delete(channelId);
    console.log(`[MemoryLeakDetector] Channel unregistered: ${channelId}`);
  }

  /**
   * Increment subscription count
   */
  incrementSubscription(): void {
    this.subscriptionCount++;
    console.log(`[MemoryLeakDetector] Subscription count: ${this.subscriptionCount}`);
  }

  /**
   * Decrement subscription count
   */
  decrementSubscription(): void {
    this.subscriptionCount = Math.max(0, this.subscriptionCount - 1);
    console.log(`[MemoryLeakDetector] Subscription count: ${this.subscriptionCount}`);
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    if (this.snapshots.length < 2) {
      return {
        memorySnapshots: this.snapshots,
        averageMemoryUsage: 0,
        memoryGrowthRate: 0,
        peakMemoryUsage: 0,
        channelCount: this.activeChannels.size
      };
    }

    const recentSnapshots = this.snapshots.slice(-10);
    const averageMemoryUsage = recentSnapshots.reduce((sum, snap) => sum + snap.usedJSHeapSize, 0) / recentSnapshots.length;
    
    const firstSnapshot = this.snapshots[0];
    const lastSnapshot = this.snapshots[this.snapshots.length - 1];
    const timeDiff = lastSnapshot.timestamp - firstSnapshot.timestamp;
    const memoryDiff = lastSnapshot.usedJSHeapSize - firstSnapshot.usedJSHeapSize;
    const memoryGrowthRate = timeDiff > 0 ? memoryDiff / timeDiff : 0;

    const peakMemoryUsage = Math.max(...this.snapshots.map(s => s.usedJSHeapSize));

    return {
      memorySnapshots: this.snapshots,
      averageMemoryUsage,
      memoryGrowthRate,
      peakMemoryUsage,
      channelCount: this.activeChannels.size
    };
  }

  /**
   * Check for potential memory leaks
   */
  checkForLeaks(): {
    hasLeak: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const metrics = this.getMetrics();
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check memory growth rate
    if (metrics.memoryGrowthRate > 1000) { // 1KB per second
      issues.push(`High memory growth rate: ${Math.round(metrics.memoryGrowthRate)} bytes/second`);
      recommendations.push('Check for unclosed subscriptions or event listeners');
    }

    // Check for too many active channels
    if (metrics.channelCount > 5) {
      issues.push(`Too many active channels: ${metrics.channelCount}`);
      recommendations.push('Ensure channels are properly cleaned up when switching chats');
    }

    // Check for too many subscriptions
    if (this.subscriptionCount > 10) {
      issues.push(`Too many active subscriptions: ${this.subscriptionCount}`);
      recommendations.push('Review subscription cleanup in useEffect hooks');
    }

    // Check memory usage
    const memoryUsageMB = metrics.averageMemoryUsage / (1024 * 1024);
    if (memoryUsageMB > 100) { // 100MB threshold
      issues.push(`High memory usage: ${Math.round(memoryUsageMB)}MB`);
      recommendations.push('Consider implementing virtualization for large lists');
    }

    return {
      hasLeak: issues.length > 0,
      issues,
      recommendations
    };
  }

  /**
   * Generate a performance report
   */
  generateReport(): string {
    const metrics = this.getMetrics();
    const leakCheck = this.checkForLeaks();

    const report = `
🎯 MEMORY LEAK DETECTOR REPORT
================================

📊 PERFORMANCE METRICS:
- Average Memory Usage: ${Math.round(metrics.averageMemoryUsage / (1024 * 1024))}MB
- Memory Growth Rate: ${Math.round(metrics.memoryGrowthRate)} bytes/second
- Peak Memory Usage: ${Math.round(metrics.peakMemoryUsage / (1024 * 1024))}MB
- Active Channels: ${metrics.channelCount}
- Active Subscriptions: ${this.subscriptionCount}
- Snapshots Taken: ${this.snapshots.length}

🔍 LEAK DETECTION:
- Has Memory Leak: ${leakCheck.hasLeak ? '❌ YES' : '✅ NO'}

${leakCheck.issues.length > 0 ? `
🚨 ISSUES DETECTED:
${leakCheck.issues.map(issue => `- ${issue}`).join('\n')}

💡 RECOMMENDATIONS:
${leakCheck.recommendations.map(rec => `- ${rec}`).join('\n')}
` : '✅ No issues detected'}

📈 RECENT SNAPSHOTS:
${this.snapshots.slice(-5).map(snap => 
  `- ${new Date(snap.timestamp).toLocaleTimeString()}: ${Math.round(snap.usedJSHeapSize / (1024 * 1024))}MB (${snap.activeChannels.length} channels)`
).join('\n')}
`;

    return report;
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.snapshots = [];
    this.activeChannels.clear();
    this.subscriptionCount = 0;
    console.log('[MemoryLeakDetector] All data cleared');
  }
}

// Export singleton instance
export const memoryLeakDetector = new MemoryLeakDetector();

import React from 'react';

// Export React hook for easy integration
export const useMemoryLeakDetection = (enabled: boolean = process.env.NODE_ENV === 'development') => {
  React.useEffect(() => {
    if (enabled) {
      memoryLeakDetector.startMonitoring();
      
      return () => {
        memoryLeakDetector.stopMonitoring();
      };
    }
  }, [enabled]);

  return {
    takeSnapshot: () => memoryLeakDetector.takeSnapshot(),
    getMetrics: () => memoryLeakDetector.getMetrics(),
    checkForLeaks: () => memoryLeakDetector.checkForLeaks(),
    generateReport: () => memoryLeakDetector.generateReport(),
    registerChannel: (channelId: string) => memoryLeakDetector.registerChannel(channelId),
    unregisterChannel: (channelId: string) => memoryLeakDetector.unregisterChannel(channelId),
    incrementSubscription: () => memoryLeakDetector.incrementSubscription(),
    decrementSubscription: () => memoryLeakDetector.decrementSubscription()
  };
};
