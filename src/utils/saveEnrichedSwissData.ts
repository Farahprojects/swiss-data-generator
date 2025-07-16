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
    const response = await supabase.functions.invoke('save-swiss-data', {
      body: JSON.stringify({ uuid, swiss_data: swissData, table, field })
    });

    if (response.error) {
      console.error('❌ Supabase Edge Function error:', response.error);
      return { success: false, error: response.error };
    }

    if (!response.data || !response.data.success) {
      console.error('❌ Unexpected response from save-swiss-data:', response.data);
      return { success: false, error: 'Unexpected response format or missing success=true' };
    }

    console.log('✅ Successfully saved enriched Swiss data via edge:', response.data);
    return response.data;

  } catch (error) {
    console.error('❌ Failed to call save-swiss-data edge function:', error);
    return { success: false, error };
  }
}
