
import { supabase } from '@/integrations/supabase/client';

export type ActivityLogsFilterState = {
  startDate?: Date;
  endDate?: Date;
  reportType: string | null;
  status: string | null;
  search?: string;
};

export function buildLogQuery(userId: string, filters: ActivityLogsFilterState) {
  let query = supabase
    .from('translator_logs')
    .select(`
      *,
      api_usage!translator_log_id(total_cost_usd)
    `)
    .eq('user_id', userId)
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
    // Convert the text status to a number
    const statusCode = filters.status === 'success' ? 200 : 
                      filters.status === 'failed' ? 400 : null;
    if (statusCode && statusCode === 200) {
      query = query.eq('response_status', statusCode);
    } else if (statusCode && statusCode === 400) {
      query = query.or('response_status.gt.399,response_status.lt.600');
    }
  }
  
  if (filters.search) {
    // This is a simplified search - in a real implementation you'd need to 
    // check if the database supports full-text search or adjust accordingly
    query = query.or(`request_type.ilike.%${filters.search}%`);
  }
  
  return query;
}
