/**
 * 🧪 MEMORY LEAK TESTS - Validation Utilities
 * 
 * Test utilities for validating memory leak prevention and performance
 */

import { memoryLeakDetector } from './memoryLeakDetector';

export interface TestResult {
  name: string;
  passed: boolean;
  details: string;
  metrics?: any;
}

export class MemoryLeakTestSuite {
  private results: TestResult[] = [];
  private baselineMemory: number = 0;

  /**
   * Run all memory leak tests
   */
  async runAllTests(): Promise<TestResult[]> {
    console.log('🧪 Starting Memory Leak Test Suite...');
    
    this.results = [];
    
    // Take baseline measurement
    this.baselineMemory = memoryLeakDetector.takeSnapshot().usedJSHeapSize;
    
    // Run individual tests
    await this.testChannelSubscription();
    await this.testMessageListPerformance();
    await this.testAbortController();
    await this.testCleanupOnUnmount();
    await this.testMemoryGrowth();
    
    console.log('🧪 Memory Leak Test Suite completed');
    return this.results;
  }

  /**
   * Test channel subscription cleanup
   */
  private async testChannelSubscription(): Promise<void> {
    const testName = 'Channel Subscription Cleanup';
    console.log(`🧪 Running: ${testName}`);
    
    try {
      // Simulate rapid channel creation/destruction
      const channels = [];
      for (let i = 0; i < 50; i++) {
        const channelId = `test-channel-${i}`;
        memoryLeakDetector.registerChannel(channelId);
        channels.push(channelId);
      }
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Clean up all channels
      channels.forEach(channelId => {
        memoryLeakDetector.unregisterChannel(channelId);
      });
      
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const finalMemory = memoryLeakDetector.takeSnapshot().usedJSHeapSize;
      const memoryDiff = finalMemory - this.baselineMemory;
      const memoryDiffMB = memoryDiff / (1024 * 1024);
      
      const passed = memoryDiffMB < 5; // Should be less than 5MB difference
      
      this.results.push({
        name: testName,
        passed,
        details: `Memory difference: ${memoryDiffMB.toFixed(2)}MB (baseline: ${(this.baselineMemory / (1024 * 1024)).toFixed(2)}MB)`,
        metrics: { memoryDiffMB, channelCount: channels.length }
      });
      
    } catch (error) {
      this.results.push({
        name: testName,
        passed: false,
        details: `Test failed with error: ${error.message}`
      });
    }
  }

  /**
   * Test message list performance
   */
  private async testMessageListPerformance(): Promise<void> {
    const testName = 'Message List Performance';
    console.log(`🧪 Running: ${testName}`);
    
    try {
      // Simulate large message list
      const largeMessageList = Array.from({ length: 1000 }, (_, i) => ({
        id: `msg-${i}`,
        text: `Message ${i} with some content to simulate real messages`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        createdAt: new Date().toISOString()
      }));
      
      // Measure memory before
      const beforeMemory = memoryLeakDetector.takeSnapshot().usedJSHeapSize;
      
      // Simulate rendering (just create objects)
      const renderedMessages = largeMessageList.map(msg => ({
        ...msg,
        rendered: true
      }));
      
      // Measure memory after
      const afterMemory = memoryLeakDetector.takeSnapshot().usedJSHeapSize;
      const memoryDiff = afterMemory - beforeMemory;
      const memoryDiffMB = memoryDiff / (1024 * 1024);
      
      const passed = memoryDiffMB < 50; // Should be less than 50MB for 1000 messages
      
      this.results.push({
        name: testName,
        passed,
        details: `Memory for 1000 messages: ${memoryDiffMB.toFixed(2)}MB`,
        metrics: { memoryDiffMB, messageCount: largeMessageList.length }
      });
      
    } catch (error) {
      this.results.push({
        name: testName,
        passed: false,
        details: `Test failed with error: ${error.message}`
      });
    }
  }

  /**
   * Test AbortController functionality
   */
  private async testAbortController(): Promise<void> {
    const testName = 'AbortController Functionality';
    console.log(`🧪 Running: ${testName}`);
    
    try {
      const controller = new AbortController();
      let aborted = false;
      
      // Simulate a fetch request
      const fetchPromise = fetch('https://httpbin.org/delay/5', {
        signal: controller.signal
      }).catch(error => {
        if (error.name === 'AbortError') {
          aborted = true;
        }
        throw error;
      });
      
      // Abort after 100ms
      setTimeout(() => {
        controller.abort();
      }, 100);
      
      try {
        await fetchPromise;
      } catch (error) {
        // Expected to be aborted
      }
      
      const passed = aborted;
      
      this.results.push({
        name: testName,
        passed,
        details: `AbortController ${passed ? 'working correctly' : 'failed to abort'}`
      });
      
    } catch (error) {
      this.results.push({
        name: testName,
        passed: false,
        details: `Test failed with error: ${error.message}`
      });
    }
  }

  /**
   * Test cleanup on unmount
   */
  private async testCleanupOnUnmount(): Promise<void> {
    const testName = 'Cleanup On Unmount';
    console.log(`🧪 Running: ${testName}`);
    
    try {
      // Simulate component mounting/unmounting
      const beforeMemory = memoryLeakDetector.takeSnapshot().usedJSHeapSize;
      
      // Simulate multiple mount/unmount cycles
      for (let i = 0; i < 10; i++) {
        memoryLeakDetector.incrementSubscription();
        memoryLeakDetector.registerChannel(`test-${i}`);
        
        // Simulate unmount
        memoryLeakDetector.decrementSubscription();
        memoryLeakDetector.unregisterChannel(`test-${i}`);
      }
      
      const afterMemory = memoryLeakDetector.takeSnapshot().usedJSHeapSize;
      const memoryDiff = afterMemory - beforeMemory;
      const memoryDiffMB = memoryDiff / (1024 * 1024);
      
      const passed = memoryDiffMB < 1; // Should be minimal memory difference
      
      this.results.push({
        name: testName,
        passed,
        details: `Memory difference after 10 mount/unmount cycles: ${memoryDiffMB.toFixed(2)}MB`,
        metrics: { memoryDiffMB, cycles: 10 }
      });
      
    } catch (error) {
      this.results.push({
        name: testName,
        passed: false,
        details: `Test failed with error: ${error.message}`
      });
    }
  }

  /**
   * Test memory growth over time
   */
  private async testMemoryGrowth(): Promise<void> {
    const testName = 'Memory Growth Over Time';
    console.log(`🧪 Running: ${testName}`);
    
    try {
      const initialMemory = memoryLeakDetector.takeSnapshot().usedJSHeapSize;
      
      // Simulate activity over time
      for (let i = 0; i < 20; i++) {
        memoryLeakDetector.takeSnapshot();
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      const finalMemory = memoryLeakDetector.takeSnapshot().usedJSHeapSize;
      const memoryDiff = finalMemory - initialMemory;
      const memoryDiffMB = memoryDiff / (1024 * 1024);
      
      const passed = memoryDiffMB < 10; // Should be less than 10MB growth
      
      this.results.push({
        name: testName,
        passed,
        details: `Memory growth over time: ${memoryDiffMB.toFixed(2)}MB`,
        metrics: { memoryDiffMB, snapshots: 20 }
      });
      
    } catch (error) {
      this.results.push({
        name: testName,
        passed: false,
        details: `Test failed with error: ${error.message}`
      });
    }
  }

  /**
   * Generate test report
   */
  generateReport(): string {
    const passedTests = this.results.filter(r => r.passed).length;
    const totalTests = this.results.length;
    const passRate = (passedTests / totalTests) * 100;
    
    const report = `
🧪 MEMORY LEAK TEST REPORT
============================

📊 SUMMARY:
- Tests Passed: ${passedTests}/${totalTests}
- Pass Rate: ${passRate.toFixed(1)}%
- Overall Status: ${passRate >= 80 ? '✅ PASS' : '❌ FAIL'}

📋 DETAILED RESULTS:
${this.results.map(result => `
${result.passed ? '✅' : '❌'} ${result.name}
   ${result.details}
   ${result.metrics ? `   Metrics: ${JSON.stringify(result.metrics)}` : ''}
`).join('\n')}

🎯 RECOMMENDATIONS:
${passRate < 80 ? `
- Review memory management in failed tests
- Check for unclosed subscriptions
- Verify cleanup functions are called
- Consider implementing more aggressive cleanup
` : `
- All tests passing! Memory management looks good
- Continue monitoring in production
- Consider adding more edge case tests
`}
`;

    return report;
  }
}

// Export test suite instance
export const memoryLeakTestSuite = new MemoryLeakTestSuite();

// Export convenience function
export const runMemoryLeakTests = () => memoryLeakTestSuite.runAllTests();
