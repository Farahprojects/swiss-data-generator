
export class GuestReportError extends Error {
  public readonly code: string;
  public readonly suggestions?: string[];
  public readonly context?: string;

  constructor(
    code: string, 
    message: string, 
    suggestions?: string[], 
    context?: string
  ) {
    super(message);
    this.name = 'GuestReportError';
    this.code = code;
    this.suggestions = suggestions;
    this.context = context;
  }

  // Helper method to check if error is retryable
  isRetryable(): boolean {
    const nonRetryableCodes = [
      'GUEST_REPORT_NOT_FOUND',
      'MISSING_ID',
      'INVALID_ID',
      'PAYMENT_REQUIRED'
    ];
    return !nonRetryableCodes.includes(this.code);
  }

  // Helper method to get user-friendly message
  getUserMessage(): string {
    return this.message;
  }

  // Helper method to convert to plain object for logging
  toLogObject() {
    return {
      code: this.code,
      message: this.message,
      suggestions: this.suggestions,
      context: this.context,
      stack: this.stack
    };
  }
}
