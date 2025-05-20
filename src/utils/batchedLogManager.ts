
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';

// Types for the batched logger
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogEntry = {
  timestamp: string;
  message: string;
  level: LogLevel;
  data?: any;
};

type LogBatch = {
  sessionId: string;
  page: string;
  logs: LogEntry[];
  startTime: string;
  endTime?: string;
  userId?: string;
  userAgent?: string;
  meta: Record<string, any>;
};

type LogContext = {
  page?: string;
  level?: LogLevel;
  data?: any;
  meta?: Record<string, any>;
};

class BatchedLogManager {
  private static instance: BatchedLogManager;
  
  // Current active batch
  private currentBatch: LogBatch | null = null;
  
  // Queue for retry
  private queuedLogs: LogBatch[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private isFlushInProgress = false;
  private retryCount = 0;
  private maxRetries = 3;

  private constructor() {
    if (typeof window !== 'undefined') {
      this.setupUnloadHandler();
    }
  }

  // Singleton pattern
  public static getInstance(): BatchedLogManager {
    if (!BatchedLogManager.instance) {
      BatchedLogManager.instance = new BatchedLogManager();
    }
    return BatchedLogManager.instance;
  }

  // Initialize new batch for current page/session
  public initBatch(page: string, meta: Record<string, any> = {}): void {
    // Flush previous batch if it exists
    if (this.currentBatch && this.currentBatch.logs.length > 0) {
      this.queueBatchForFlush(this.currentBatch);
    }

    // Create a new batch with a UUID
    this.currentBatch = {
      sessionId: uuidv4(),
      page,
      logs: [],
      startTime: new Date().toISOString(),
      meta: this.getSafeMeta(meta)
    };

    // Enrich batch with user data
    this.enrichBatchWithUserData();
  }

  // Add a log to the current batch
  public addLog(message: string, level: LogLevel = 'info', data?: any): void {
    // Create a batch if it doesn't exist
    if (!this.currentBatch) {
      this.initBatch(this.getCurrentPage());
    }

    if (!this.currentBatch) {
      console.error('Failed to initialize batch log');
      return;
    }

    // Add log to batch
    this.currentBatch.logs.push({
      timestamp: new Date().toISOString(),
      message,
      level,
      data: this.sanitizeData(data)
    });

    // Schedule flush if not already scheduled
    this.scheduleFlush();
  }

  // Get current page from URL
  public getCurrentPage(): string {
    if (typeof window === 'undefined') return 'server';
    return window.location.pathname;
  }

  // Force immediate flush of logs
  public async flushNow(): Promise<void> {
    if (!this.currentBatch || this.currentBatch.logs.length === 0) return;
    
    // Queue the batch and clear current
    const batchToQueue = { ...this.currentBatch };
    batchToQueue.endTime = new Date().toISOString();
    this.queueBatchForFlush(batchToQueue);
    this.currentBatch = null;

    // Clear any scheduled flushes
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    // Process queue
    await this.processQueue();
  }

  // Queue batch for upload
  private queueBatchForFlush(batch: LogBatch): void {
    this.queuedLogs.push({ ...batch });
    this.processQueue();
  }

  // Process the queue with retry logic
  private async processQueue(): Promise<void> {
    if (this.isFlushInProgress || this.queuedLogs.length === 0) return;

    this.isFlushInProgress = true;
    const batchToUpload = this.queuedLogs.shift()!;

    try {
      await this.sendToSupabase(batchToUpload);
      // Success! Reset retry counter
      this.retryCount = 0;
    } catch (error) {
      console.error('Failed to send logs to Supabase:', error);
      
      // Re-queue with backoff if under max retries
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        this.queuedLogs.unshift(batchToUpload);
        
        // Exponential backoff
        const delay = 1000 * Math.pow(2, this.retryCount);
        setTimeout(() => this.processQueue(), delay);
      } else {
        // Max retries reached, drop this batch and try next one
        this.retryCount = 0;
        console.error(`Dropping log batch after ${this.maxRetries} failed attempts`);
      }
    } finally {
      this.isFlushInProgress = false;
      
      // Continue processing queue if more items exist
      if (this.queuedLogs.length > 0) {
        setTimeout(() => this.processQueue(), 50); // Small delay between batches
      }
    }
  }

  // Send logs to Supabase admin_logs table
  private async sendToSupabase(batch: LogBatch): Promise<void> {
    // Prepare log data
    const logText = batch.logs.map(log => 
      `[${log.level.toUpperCase()}] ${log.timestamp}: ${log.message}`
    ).join('\n');

    // Prepare metadata with safe fields
    const metaData = {
      ...batch.meta,
      sessionId: batch.sessionId,
      logCount: batch.logs.length,
      startTime: batch.startTime,
      endTime: batch.endTime || new Date().toISOString(),
      userAgent: batch.userAgent,
      logs: batch.logs.map(log => ({
        level: log.level,
        message: log.message,
        timestamp: log.timestamp,
        data: log.data
      }))
    };

    // Get user ID if available
    const { data } = await supabase.auth.getSession();
    const userId = batch.userId || data?.session?.user?.id;

    // Send to Supabase
    await supabase.rpc('log_admin_event', {
      _page: batch.page,
      _event_type: 'page_activity',
      _logs: logText,
      _user_id: userId || null,
      _meta: metaData
    });
  }

  // Schedule a flush after a delay (throttled)
  private scheduleFlush(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }

    // Flush after 5 seconds of inactivity
    this.flushTimer = setTimeout(() => this.flushNow(), 5000);
  }

  // Enrich batch with user data
  private async enrichBatchWithUserData(): Promise<void> {
    if (!this.currentBatch) return;

    try {
      // Add browser & environment info
      if (typeof window !== 'undefined') {
        this.currentBatch.userAgent = navigator.userAgent;
        
        // Enrich meta with safe browser information
        this.currentBatch.meta.viewportWidth = window.innerWidth;
        this.currentBatch.meta.viewportHeight = window.innerHeight;
        this.currentBatch.meta.referrer = document.referrer || 'direct';
      }

      // Add user ID if logged in
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        this.currentBatch.userId = data.session.user.id;
        this.currentBatch.meta.userEmail = data.session.user.email;
      }
    } catch (error) {
      // Fail silently - enrichment is optional
    }
  }

  // Sanitize data to remove sensitive information
  private sanitizeData(data: any): any {
    if (!data) return undefined;

    // Function to recursively sanitize objects
    const sanitizeObj = (obj: any): any => {
      if (!obj || typeof obj !== 'object') return obj;
      
      const result: Record<string, any> = {};
      
      // List of sensitive field patterns
      const sensitiveFields = [
        'password',
        'token',
        'secret',
        'key',
        'authorization',
        'auth',
        'credential',
        'apiKey',
        'access_token',
        'refresh_token'
      ];

      // Check each property
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        
        // Check if this is a sensitive field
        if (sensitiveFields.some(field => lowerKey.includes(field))) {
          result[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
          result[key] = sanitizeObj(value);
        } else {
          result[key] = value;
        }
      }
      
      return result;
    };

    // Clone and sanitize
    return sanitizeObj(typeof data === 'object' ? { ...data } : data);
  }

  // Get safe metadata (whitelist approach)
  private getSafeMeta(meta: Record<string, any>): Record<string, any> {
    const safeMeta: Record<string, any> = {};
    
    // Whitelist of allowed meta fields
    const allowedFields = [
      'route',
      'component',
      'flowType',
      'event',
      'status',
      'duration',
      'referrer',
      'viewportWidth',
      'viewportHeight',
      'userEmail'
    ];

    // Copy allowed fields
    for (const field of allowedFields) {
      if (field in meta) {
        safeMeta[field] = meta[field];
      }
    }
    
    return safeMeta;
  }

  // Handle page unload events to flush logs
  private setupUnloadHandler(): void {
    window.addEventListener('beforeunload', () => {
      // Synchronous version for unload events
      this.flushNow().catch(() => {
        // Can't handle errors in unload
      });
    });
  }
}

// Export singleton instance
export const batchedLogger = BatchedLogManager.getInstance();

// Expose convenient API
export function logToSupabase(message: string, context?: LogContext): void {
  const ctx = context || {};
  const page = ctx.page || batchedLogger.getCurrentPage();
  
  // Initialize new batch if page changed or doesn't exist
  if (!batchedLogger['currentBatch'] || batchedLogger['currentBatch'].page !== page) {
    batchedLogger.initBatch(page, ctx.meta);
  }
  
  batchedLogger.addLog(message, ctx.level || 'info', ctx.data);
}
