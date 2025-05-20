/**
 * Simple logger utility that controls logging output based on environment
 * and provides different log levels
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Controls whether detailed logs are shown
// In a real app, this would be controlled by env vars
const isDevelopment = process.env.NODE_ENV !== 'production';
const VERBOSE_LOGGING = isDevelopment;

/**
 * Centralized logging function that respects environment settings
 * - Only shows debug logs in development
 * - Always shows errors
 * - Can be easily extended to use external logging services
 */
export function log(level: LogLevel, message: string, data?: any): void {
  // In production, only show errors and warnings
  if (!isDevelopment && level === 'debug') return;
  
  const timestamp = new Date().toISOString();
  
  switch (level) {
    case 'debug':
      if (VERBOSE_LOGGING) {
        console.log(`[DEBUG] ${message}`, data !== undefined ? data : '');
      }
      break;
    case 'info':
      console.log(`[INFO] ${message}`, data !== undefined ? data : '');
      break;
    case 'warn':
      console.warn(`[WARN] ${message}`, data !== undefined ? data : '');
      break;
    case 'error':
      console.error(`[ERROR] ${message}`, data !== undefined ? data : '');
      break;
  }
}

/**
 * Safe logging function for auth events that avoids logging sensitive data
 */
export function logAuth(message: string, data?: any): void {
  // Sanitize sensitive data if it exists
  let sanitizedData: any;

  if (data) {
    sanitizedData = { ...data };
    
    // Remove sensitive fields
    if (sanitizedData.token) sanitizedData.token = '[REDACTED]';
    if (sanitizedData.token_hash) sanitizedData.token_hash = '[REDACTED]';
    if (sanitizedData.hasToken) sanitizedData.hasToken = !!sanitizedData.hasToken;
    if (sanitizedData.fullUrl) {
      // Only keep path and redact query params
      try {
        const url = new URL(sanitizedData.fullUrl);
        sanitizedData.fullUrl = url.pathname + '?[QUERY_PARAMS_REDACTED]';
      } catch {
        sanitizedData.fullUrl = '[INVALID_URL]';
      }
    }
  }
  
  log('info', `Auth: ${message}`, sanitizedData);
}

/**
 * Safe logging for navigation events
 */
export function logNavigation(message: string, data?: any): void {
  log('debug', `Navigation: ${message}`, data);
}
