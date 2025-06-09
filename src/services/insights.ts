
import { supabase } from '@/integrations/supabase/client';

export interface GenerateInsightRequest {
  clientId: string;
  coachId: string;
  insightType: string;
  title: string;
  clientData: {
    fullName: string;
    birthDate?: string;
    birthTime?: string;
    birthLocation?: string;
    notes?: string;
    journalEntries?: Array<{
      id: string;
      title?: string;
      entry_text: string;
      created_at: string;
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
      // Get current user's API key
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const { data: apiKeyData } = await supabase
        .from('api_keys')
        .select('api_key')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!apiKeyData?.api_key) {
        throw new Error('No active API key found');
      }

      const { data, error } = await supabase.functions.invoke('generate-insights', {
        body: request,
        headers: {
          Authorization: `Bearer ${apiKeyData.api_key}`
        }
      });

      if (error) {
        console.error('Error calling generate-insights function:', error);
        throw new Error(error.message || 'Failed to generate insight');
      }

      return data;
    } catch (error) {
      console.error('Error in generateInsight:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      };
    }
  }
};
