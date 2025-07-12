
import { supabase } from '@/integrations/supabase/client';
import { authService } from '@/services/authService';
import { logToSupabase } from '@/utils/batchedLogManager';

/**
 * Enhanced Supabase client that ensures valid authentication before queries
 */
class SupabaseWithAuth {
  async query<T>(
    tableName: string,
    queryFn: (client: typeof supabase) => any
  ): Promise<{ data: T | null; error: any }> {
    try {
      // Ensure we have valid authentication
      const session = await authService.ensureValidSession();
      if (!session) {
        logToSupabase('Query failed - no valid session', {
          level: 'warn',
          page: 'SupabaseWithAuth',
          data: { table: tableName }
        });
        return { 
          data: null, 
          error: { message: 'Authentication required', code: 'AUTH_REQUIRED' }
        };
      }

      // Execute the query and await the result
      const result = await queryFn(supabase);
      
      // Handle potential auth-related errors
      if (result.error) {
        const isAuthError = result.error.code === 'PGRST301' || 
                           result.error.message?.includes('JWT') ||
                           result.error.message?.includes('authentication');
        
        if (isAuthError) {
          logToSupabase('Query auth error detected', {
            level: 'warn',
            page: 'SupabaseWithAuth',
            data: { 
              table: tableName,
              errorCode: result.error.code,
              errorMessage: result.error.message
            }
          });
          
          // Try to refresh session and retry once
          const refreshedSession = await authService.refreshSession();
          if (refreshedSession) {
            logToSupabase('Retrying query after session refresh', {
              level: 'info',
              page: 'SupabaseWithAuth',
              data: { table: tableName }
            });
            return await queryFn(supabase);
          }
        }
      }

      return result;
    } catch (error) {
      logToSupabase('Query exception', {
        level: 'error',
        page: 'SupabaseWithAuth',
        data: { 
          table: tableName,
          error: error instanceof Error ? error.message : String(error)
        }
      });
      return { 
        data: null, 
        error: { message: 'Query failed', originalError: error }
      };
    }
  }
}

export const supabaseWithAuth = new SupabaseWithAuth();
