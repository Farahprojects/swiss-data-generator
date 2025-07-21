
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface ErrorContext {
  function: string;
  operation?: string;
  user_id?: string;
  request_id?: string;
  [key: string]: any;
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

export function handleError(error: any, context: ErrorContext = { function: 'unknown' }): Response {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  
  // Log to debug_logs table
  logError(errorMessage, stack, context);
  
  console.error(`[${context.function}] Error:`, {
    message: errorMessage,
    context,
    stack: stack?.split('\n').slice(0, 3) // Truncate stack for console
  });

  return new Response(
    JSON.stringify({
      ok: false,
      reason: errorMessage,
      context: context.operation || context.function
    }),
    {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-call',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    }
  );
}

async function logError(message: string, stack: string | undefined, context: ErrorContext) {
  try {
    await supabase.from('debug_logs').insert({
      source: context.function,
      message: message,
      user_id: context.user_id || null,
      details: {
        operation: context.operation,
        request_id: context.request_id,
        stack: stack,
        context: context
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
