
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface ErrorContext {
  function: string;
  operation?: string;
  user_id?: string;
  request_id?: string;
  [key: string]: any;
}

interface ErrorResponse {
  ok: false;
  error: string;
  code: string;
  context?: string;
  user_message?: string;
  suggestions?: string[];
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

export function handleError(
  error: any, 
  context: ErrorContext = { function: 'unknown' },
  statusCode: number = 500,
  userMessage?: string,
  suggestions?: string[]
): Response {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  
  // Log to debug_logs table
  logError(errorMessage, stack, context, statusCode);
  
  console.error(`[${context.function}] Error (${statusCode}):`, {
    message: errorMessage,
    context,
    stack: stack?.split('\n').slice(0, 3) // Truncate stack for console
  });

  const response: ErrorResponse = {
    ok: false,
    error: errorMessage,
    code: getErrorCode(statusCode, errorMessage),
    context: context.operation || context.function,
    user_message: userMessage || getDefaultUserMessage(statusCode),
    suggestions: suggestions || getDefaultSuggestions(statusCode)
  };

  return new Response(
    JSON.stringify(response),
    {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-call',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    }
  );
}

function getErrorCode(statusCode: number, errorMessage: string): string {
  switch (statusCode) {
    case 404:
      if (errorMessage.includes('report not found')) return 'REPORT_NOT_FOUND';
      if (errorMessage.includes('guest report not found')) return 'GUEST_REPORT_NOT_FOUND';
      return 'NOT_FOUND';
    case 400:
      if (errorMessage.includes('ID is required')) return 'MISSING_ID';
      if (errorMessage.includes('Invalid ID')) return 'INVALID_ID';
      return 'BAD_REQUEST';
    case 402:
      return 'PAYMENT_REQUIRED';
    case 403:
      return 'FORBIDDEN';
    case 429:
      return 'RATE_LIMITED';
    case 500:
    default:
      return 'INTERNAL_ERROR';
  }
}

function getDefaultUserMessage(statusCode: number): string {
  switch (statusCode) {
    case 404:
      return 'The requested report could not be found. Please check your link and try again.';
    case 400:
      return 'There was an issue with your request. Please check the information provided.';
    case 402:
      return 'Payment is required to access this report.';
    case 403:
      return 'You do not have permission to access this report.';
    case 429:
      return 'Too many requests. Please wait a moment and try again.';
    case 500:
    default:
      return 'We encountered an unexpected error. Please try again in a few moments.';
  }
}

function getDefaultSuggestions(statusCode: number): string[] {
  switch (statusCode) {
    case 404:
      return [
        'Check your email for the correct report link',
        'Verify the guest ID in the URL is complete',
        'Contact support if you believe this is an error'
      ];
    case 400:
      return [
        'Check that all required information is provided',
        'Verify the format of any IDs or parameters'
      ];
    case 402:
      return [
        'Complete your payment to access the report',
        'Check your payment method if payment failed'
      ];
    case 500:
      return [
        'Try refreshing the page',
        'Wait a few minutes and try again',
        'Contact support if the problem persists'
      ];
    default:
      return ['Try again in a few moments'];
  }
}

async function logError(
  message: string, 
  stack: string | undefined, 
  context: ErrorContext,
  statusCode: number
) {
  try {
    await supabase.from('debug_logs').insert({
      source: context.function,
      message: `[${statusCode}] ${message}`,
      user_id: context.user_id || null,
      details: {
        operation: context.operation,
        request_id: context.request_id,
        stack: stack,
        context: context,
        status_code: statusCode
      }
    });
  } catch (logError) {
    console.error('[errorHandler] Failed to log error:', logError);
  }
}

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-call',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
