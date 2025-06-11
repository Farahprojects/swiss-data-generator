
import { supabase } from '@/integrations/supabase/client';

export interface GenerateInsightRequest {
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
}

export interface GenerateInsightResponse {
  success: boolean;
  insightId?: string;
  content?: string;
  error?: string;
  requestId?: string;
}

export const insightsService = {
  async generateInsight(request: GenerateInsightRequest): Promise<GenerateInsightResponse> {
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

      console.log('Making insight generation request with auth token and API key');

      // Call the edge function with proper authentication
      const { data, error } = await supabase.functions.invoke('generate-insights', {
        body: request,
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
