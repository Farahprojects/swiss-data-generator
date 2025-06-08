
import { supabase } from '@/integrations/supabase/client';
import { InsightPrompt } from '@/types/database';

export const insightPromptsService = {
  async getActivePrompts(): Promise<InsightPrompt[]> {
    const { data, error } = await supabase
      .from('insight_prompts')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching insight prompts:', error);
      throw error;
    }

    return data || [];
  },

  async getPromptById(id: string): Promise<InsightPrompt | null> {
    const { data, error } = await supabase
      .from('insight_prompts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching insight prompt:', error);
      throw error;
    }

    return data;
  },

  async getPromptByName(name: string): Promise<InsightPrompt | null> {
    const { data, error } = await supabase
      .from('insight_prompts')
      .select('*')
      .eq('name', name)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error fetching insight prompt by name:', error);
      throw error;
    }

    return data;
  }
};
