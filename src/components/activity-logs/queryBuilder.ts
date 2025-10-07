
import { supabase } from '@/integrations/supabase/client';

export type ActivityLogsFilterState = {
  startDate?: Date;
  endDate?: Date;
  reportType: string | null;
  status: string | null;
  search?: string;
};

export function buildLogQuery(userId: string, filters: ActivityLogsFilterState) {
  // translator_logs doesn't have user_id, it has chat_id which links to insights
  // We need to join through insights table to filter by user
  let query = supabase
    .from('translator_logs')
    .select(`
      *,
      api_usage!translator_log_id(total_cost_usd),
      insights!chat_id(user_id)
    `)
    .eq('insights.user_id', userId)
    .order('created_at', { ascending: false });
  
  // Apply filters
  if (filters.startDate) {
    query = query.gte('created_at', filters.startDate.toISOString());
  }
  
  if (filters.endDate) {
    // Set time to end of day for endDate
    const endOfDay = new Date(filters.endDate);
    endOfDay.setHours(23, 59, 59, 999);
    query = query.lte('created_at', endOfDay.toISOString());
  }
  
  if (filters.reportType) {
    query = query.eq('report_tier', filters.reportType);
  }
  
  if (filters.status) {
    if (filters.status === 'success') {
      query = query.gte('response_status', 200).lt('response_status', 300);
    } else if (filters.status === 'failed') {
      query = query.or('response_status.gte.400,response_status.lt.200');
    }
  }
  
  if (filters.search) {
    // This is a simplified search - in a real implementation you'd need to 
    // check if the database supports full-text search or adjust accordingly
    query = query.or(`request_type.ilike.%${filters.search}%`);
  }
  
  return query;
}
