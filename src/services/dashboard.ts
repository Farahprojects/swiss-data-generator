
import { supabase } from '@/integrations/supabase/client';
import { clientsService } from './clients';
import { journalEntriesService } from './journalEntries';

export interface DashboardKPIs {
  activeClientsThisWeek: number;
  insightsGeneratedThisWeek: number;
  journalsReceivedThisWeek: number;
  reportsDeliveredThisWeek: number;
}

export interface ActionItem {
  id: string;
  type: 'new_journal' | 'quiet_client' | 'overdue_report' | 'pending_insight';
  priority: 'high' | 'medium' | 'low';
  clientId: string;
  clientName: string;
  title: string;
  description: string;
  actionLabel: string;
  daysAgo?: number;
  createdAt: string;
}

export const dashboardService = {
  async getDashboardKPIs(): Promise<DashboardKPIs> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) throw new Error('User not authenticated');

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const weekAgoISO = oneWeekAgo.toISOString();

    try {
      // Get active clients this week (clients with journal entries or reports)
      const activeClientsResult = await supabase
        .from('journal_entries')
        .select('client_id')
        .eq('coach_id', user.id)
        .gte('created_at', weekAgoISO);

      const uniqueActiveClients = new Set((activeClientsResult.data || []).map(entry => entry.client_id));

      // Get insights generated this week
      const insightsResult = await supabase
        .from('insight_entries')
        .select('id')
        .eq('coach_id', user.id)
        .gte('created_at', weekAgoISO);

      // Get journals received this week
      const journalsResult = await supabase
        .from('journal_entries')
        .select('id')
        .eq('coach_id', user.id)
        .gte('created_at', weekAgoISO);

      // Get reports delivered this week
      const reportsResult = await supabase
        .from('translator_logs')
        .select('id')
        .eq('coach_id', user.id)
        .gte('created_at', weekAgoISO)
        .eq('response_status', 200);

      return {
        activeClientsThisWeek: uniqueActiveClients.size,
        insightsGeneratedThisWeek: insightsResult.data?.length || 0,
        journalsReceivedThisWeek: journalsResult.data?.length || 0,
        reportsDeliveredThisWeek: reportsResult.data?.length || 0,
      };
    } catch (error) {
      console.error('Error fetching dashboard KPIs:', error);
      return {
        activeClientsThisWeek: 0,
        insightsGeneratedThisWeek: 0,
        journalsReceivedThisWeek: 0,
        reportsDeliveredThisWeek: 0,
      };
    }
  },

  async getActionItems(): Promise<ActionItem[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) throw new Error('User not authenticated');

    const actionItems: ActionItem[] = [];

    try {
      // Get all clients
      const clients = await clientsService.getClients();

      for (const client of clients) {
        // Check for new journal entries without insights
        const recentJournalsResult = await supabase
          .from('journal_entries')
          .select('id, created_at')
          .eq('client_id', client.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (recentJournalsResult.data && recentJournalsResult.data.length > 0) {
          // Check if the most recent journal has a corresponding insight
          const insightsResult = await supabase
            .from('insight_entries')
            .select('id')
            .eq('client_id', client.id)
            .gte('created_at', recentJournalsResult.data[0].created_at);

          if (!insightsResult.data || insightsResult.data.length === 0) {
            const daysAgo = Math.floor((Date.now() - new Date(recentJournalsResult.data[0].created_at).getTime()) / (1000 * 60 * 60 * 24));
            actionItems.push({
              id: `new_journal_${client.id}`,
              type: 'new_journal',
              priority: daysAgo > 2 ? 'high' : 'medium',
              clientId: client.id,
              clientName: client.full_name,
              title: 'New journal entry available',
              description: `${client.full_name} has a new journal entry ready for insight generation.`,
              actionLabel: 'Generate Insight',
              daysAgo,
              createdAt: recentJournalsResult.data[0].created_at,
            });
          }
        }

        // Check for quiet clients (no journal entries in 7+ days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentActivityResult = await supabase
          .from('journal_entries')
          .select('created_at')
          .eq('client_id', client.id)
          .gte('created_at', sevenDaysAgo.toISOString())
          .limit(1);

        if (!recentActivityResult.data || recentActivityResult.data.length === 0) {
          // Get their last journal entry to calculate days since
          const lastJournalResult = await supabase
            .from('journal_entries')
            .select('created_at')
            .eq('client_id', client.id)
            .order('created_at', { ascending: false })
            .limit(1);

          const daysSinceLastEntry = lastJournalResult.data && lastJournalResult.data.length > 0 
            ? Math.floor((Date.now() - new Date(lastJournalResult.data[0].created_at).getTime()) / (1000 * 60 * 60 * 24))
            : null;

          if (daysSinceLastEntry && daysSinceLastEntry >= 7) {
            actionItems.push({
              id: `quiet_client_${client.id}`,
              type: 'quiet_client',
              priority: daysSinceLastEntry > 14 ? 'high' : 'medium',
              clientId: client.id,
              clientName: client.full_name,
              title: 'Client has been quiet',
              description: `${client.full_name} hasn't journaled in ${daysSinceLastEntry} days.`,
              actionLabel: 'Send Reminder',
              daysAgo: daysSinceLastEntry,
              createdAt: lastJournalResult.data[0].created_at,
            });
          }
        }
      }

      // Sort by priority and recency
      return actionItems.sort((a, b) => {
        if (a.priority === 'high' && b.priority !== 'high') return -1;
        if (b.priority === 'high' && a.priority !== 'high') return 1;
        if (a.priority === 'medium' && b.priority === 'low') return -1;
        if (b.priority === 'medium' && a.priority === 'low') return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

    } catch (error) {
      console.error('Error fetching action items:', error);
      return [];
    }
  }
};
