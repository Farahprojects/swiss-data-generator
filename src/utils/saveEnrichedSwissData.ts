import { supabase } from '@/integrations/supabase/client';

export async function saveEnrichedSwissDataToEdge({
  uuid,
  swissData,
  table = 'temp_report_data',
  field = 'swiss_data'
}: {
  uuid: string,
  swissData: any,
  table?: string,
  field?: string
}) {
  try {
    const { data, error } = await supabase.functions.invoke('save-swiss-data', {
      body: JSON.stringify({ uuid, swiss_data: swissData, table, field })
    });

    if (error) {
      console.error('Failed to save enriched Swiss data:', error);
      return { success: false, error };
    }

    return data;
  } catch (error) {
    console.error('Failed to save enriched Swiss data:', error);
    return { success: false, error };
  }
}