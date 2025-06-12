
import { supabase } from '@/integrations/supabase/client';

export interface GenerateInsightRequest {
  clientId: string;
  coachId: string;
  insightType: string;
  title: string;
  clientData: {
    fullName: string;
    goals?: string;
    journalText: string;
    previousReportsText: string;
  };
}

export interface GenerateInsightResponse {
  success: boolean;
  insightId?: string;
  content?: string;
  error?: string;
  requestId?: string;
}

export const insightsService = {
  async generateInsight(request: {
    clientId: string;
    coachId: string;
    insightType: string;
    title: string;
    clientData: {
      fullName: string;
      goals?: string;
      journalEntries?: Array<{
        id: string;
        title?: string;
        entry_text: string;
        created_at: string;
      }>;
      previousReports?: Array<{
        id: string;
        type: string;
        created_at: string;
        key_insights?: string;
      }>;
    };
  }): Promise<GenerateInsightResponse> {
    console.log('🚀 === INSIGHTS SERVICE: Starting generateInsight ===');
    console.log('🚀 SERVICE: Raw request received:', request);
    
    try {
      // Get current session with better error handling
      console.log('🚀 SERVICE: === AUTHENTICATION STEP ===');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('🚀 SERVICE: Session error details:', sessionError);
        return {
          success: false,
          error: 'Authentication session error. Please try signing in again.'
        };
      }

      if (!session?.user?.id) {
        console.error('🚀 SERVICE: No authenticated user found in session');
        return {
          success: false,
          error: 'You must be signed in to generate insights. Please sign in and try again.'
        };
      }

      console.log('🚀 SERVICE: User authenticated:', session.user.id);

      // Get user's API key using the session
      console.log('🚀 SERVICE: === API KEY RETRIEVAL ===');
      const { data: apiKeyData, error: apiKeyError } = await supabase
        .from('api_keys')
        .select('api_key')
        .eq('user_id', session.user.id)
        .eq('is_active', true)
        .single();

      if (apiKeyError) {
        console.error('🚀 SERVICE: API key retrieval error:', apiKeyError);
        return {
          success: false,
          error: 'Failed to retrieve API credentials. Please contact support.'
        };
      }

      if (!apiKeyData?.api_key) {
        console.error('🚀 SERVICE: No active API key found for user:', session.user.id);
        return {
          success: false,
          error: 'No active API key found. Please contact support to activate your account.'
        };
      }

      console.log('🚀 SERVICE: API key retrieved successfully (length):', apiKeyData.api_key.length);

      // Extract plain text from journal entries
      console.log('🚀 SERVICE: === DATA TRANSFORMATION ===');
      console.log('🚀 SERVICE: Processing journal entries:', request.clientData.journalEntries?.length || 0);
      
      const journalText = request.clientData.journalEntries?.map((entry, index) => {
        console.log(`🚀 SERVICE: Processing journal entry ${index + 1}:`, {
          id: entry.id,
          title: entry.title,
          entry_text_length: entry.entry_text?.length || 0,
          created_at: entry.created_at
        });
        
        const title = entry.title ? `Title: ${entry.title}\n` : '';
        const date = new Date(entry.created_at).toLocaleDateString();
        return `${title}Date: ${date}\nContent: ${entry.entry_text}`;
      }).join('\n\n---\n\n') || 'No journal entries available.';

      console.log('🚀 SERVICE: Transformed journal text length:', journalText.length);

      // Extract plain text from previous reports
      console.log('🚀 SERVICE: Processing previous reports:', request.clientData.previousReports?.length || 0);
      
      const previousReportsText = request.clientData.previousReports?.map((report, index) => {
        console.log(`🚀 SERVICE: Processing report ${index + 1}:`, {
          id: report.id,
          type: report.type,
          created_at: report.created_at,
          key_insights_length: report.key_insights?.length || 0
        });
        
        const date = new Date(report.created_at).toLocaleDateString();
        return `Report Type: ${report.type}\nDate: ${date}\nKey Insights: ${report.key_insights || 'No insights available'}`;
      }).join('\n\n---\n\n') || 'No previous reports available.';

      console.log('🚀 SERVICE: Transformed reports text length:', previousReportsText.length);

      // Create the payload object - this is the safe pattern
      const payload = {
        clientId: request.clientId,
        coachId: request.coachId,
        insightType: request.insightType,
        title: request.title,
        clientData: {
          fullName: request.clientData.fullName,
          goals: request.clientData.goals,
          journalText,
          previousReportsText
        }
      };

      console.log('🚀 SERVICE: === CALLING EDGE FUNCTION ===');
      console.log('🚀 SERVICE: Final payload being sent:', payload);
      
      // Convert to string once and log the size - this prevents stream consumption
      const bodyText = JSON.stringify(payload);
      console.log('🚀 SERVICE: Payload size (bytes):', bodyText.length);
      console.log('🚀 SERVICE: About to call supabase.functions.invoke...');
      
      // Use the safe pattern - send fresh string, let Supabase calculate Content-Length
      const { data, error } = await supabase.functions.invoke('generate-insights', {
        body: bodyText,  // Fresh string, never read before
        headers: {
          Authorization: `Bearer ${apiKeyData.api_key}`,
          'Content-Type': 'application/json'
          // No Content-Length header - let Supabase calculate it
        }
      });

      console.log('🚀 SERVICE: === EDGE FUNCTION RESPONSE ===');
      console.log('🚀 SERVICE: Response data:', data);
      console.log('🚀 SERVICE: Response error:', error);
      
      if (error) {
        console.error('🚀 SERVICE: Edge function error details:', {
          message: error.message,
          name: error.name,
          status: (error as any).status,
          statusText: (error as any).statusText,
          details: (error as any).details
        });
        return {
          success: false,
          error: error.message || 'Failed to generate insight. Please try again.'
        };
      }

      console.log('🚀 SERVICE: Edge function call successful, returning data');
      return data;
    } catch (error) {
      console.error('🚀 SERVICE: === CRITICAL ERROR IN INSIGHTS SERVICE ===');
      console.error('🚀 SERVICE: Error type:', typeof error);
      console.error('🚀 SERVICE: Error name:', error instanceof Error ? error.name : 'Unknown');
      console.error('🚀 SERVICE: Error message:', error instanceof Error ? error.message : String(error));
      console.error('🚀 SERVICE: Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('🚀 SERVICE: Full error object:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred while generating the insight.'
      };
    }
  },

  async deleteInsight(insightId: string): Promise<void> {
    const { error } = await supabase
      .from('insight_entries')
      .delete()
      .eq('id', insightId);

    if (error) {
      console.error('Error deleting insight:', error);
      throw new Error('Failed to delete insight');
    }
  }
};
