
import { supabase } from '@/integrations/supabase/client';

export interface GenerateInsightRequest {
  client_id: string;
  goals?: string;
  journal_entries?: string[];
  reports?: string[];
  insight_type: 'pattern' | 'recommendation' | 'trend' | 'milestone';
}

export const insightsService = {
  async generateInsight(request: GenerateInsightRequest) {
    try {
      const { data, error } = await supabase.functions.invoke('generate-insights', {
        body: request,
      });

      if (error) {
        console.error('Error generating insight:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to generate insight:', error);
      throw error;
    }
  },

  async getInsightEntries(clientId: string) {
    const { data, error } = await supabase
      .from('insight_entries')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching insight entries:', error);
      throw error;
    }

    return data || [];
  }
};
