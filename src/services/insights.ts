
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
    try {
      // Get current session with better error handling
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        return {
          success: false,
          error: 'Authentication session error. Please try signing in again.'
        };
      }

      if (!session?.user?.id) {
        console.error('No authenticated user found');
        return {
          success: false,
          error: 'You must be signed in to generate insights. Please sign in and try again.'
        };
      }

      // Get user's API key using the session
      const { data: apiKeyData, error: apiKeyError } = await supabase
        .from('api_keys')
        .select('api_key')
        .eq('user_id', session.user.id)
        .eq('is_active', true)
        .single();

      if (apiKeyError) {
        console.error('Error fetching API key:', apiKeyError);
        return {
          success: false,
          error: 'Failed to retrieve API credentials. Please contact support.'
        };
      }

      if (!apiKeyData?.api_key) {
        console.error('No active API key found for user');
        return {
          success: false,
          error: 'No active API key found. Please contact support to activate your account.'
        };
      }

      // Extract plain text from journal entries
      const journalText = request.clientData.journalEntries?.map(entry => {
        const title = entry.title ? `Title: ${entry.title}\n` : '';
        const date = new Date(entry.created_at).toLocaleDateString();
        return `${title}Date: ${date}\nContent: ${entry.entry_text}`;
      }).join('\n\n---\n\n') || 'No journal entries available.';

      // Extract plain text from previous reports
      const previousReportsText = request.clientData.previousReports?.map(report => {
        const date = new Date(report.created_at).toLocaleDateString();
        return `Report Type: ${report.type}\nDate: ${date}\nKey Insights: ${report.key_insights || 'No insights available'}`;
      }).join('\n\n---\n\n') || 'No previous reports available.';

      // Create simplified request with plain text
      const simplifiedRequest: GenerateInsightRequest = {
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

      console.log('Making insight generation request with simplified data structure');

      // Call the edge function with proper authentication
      const { data, error } = await supabase.functions.invoke('generate-insights', {
        body: simplifiedRequest,
        headers: {
          Authorization: `Bearer ${apiKeyData.api_key}`,
          'Content-Type': 'application/json'
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        return {
          success: false,
          error: error.message || 'Failed to generate insight. Please try again.'
        };
      }

      console.log('Insight generation response:', data);
      return data;
    } catch (error) {
      console.error('Error in generateInsight:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred while generating the insight.'
      };
    }
  }
};
