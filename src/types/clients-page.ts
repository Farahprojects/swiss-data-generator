
import { Client, JournalEntry } from '@/types/database';
import { ClientReport } from '@/utils/clientsFormatters';

export type ViewMode = 'grid' | 'list';
export type SortField = 'full_name' | 'email' | 'latest_journal' | 'latest_report' | 'latest_insight' | 'created_at';
export type SortDirection = 'asc' | 'desc';
export type FilterType = 'all' | 'most_active' | 'report_ready' | 'has_journal_no_report';

export interface ClientWithJournal extends Client {
  latestJournalEntry?: JournalEntry;
  latestReport?: ClientReport;
}
