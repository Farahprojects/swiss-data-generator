import { useState, useMemo, useCallback } from 'react';
import { useOptimizedClients } from '@/hooks/useOptimizedClients';
import { ClientWithJournal, SortField, SortDirection, FilterType } from '@/types/clients-page';

export const useClientsData = () => {
  const { clients, loading, backgroundRefreshing, invalidateCache } = useOptimizedClients();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterType, setFilterType] = useState<FilterType>('all');

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField, sortDirection]);

  const refreshClientsData = useCallback(async () => {
    console.log('🔄 Silent background refresh of clients data');
    await invalidateCache();
  }, [invalidateCache]);

  const filteredAndSortedClients = useMemo(() => {
    // If searchTerm is empty, just show all clients
    if (!searchTerm.trim()) {
      let sorted = [...clients];
      // Apply sorting
      sorted.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortField) {
          case 'full_name':
            aValue = a.full_name;
            bValue = b.full_name;
            break;
          case 'email':
            aValue = a.email || '';
            bValue = b.email || '';
            break;
          case 'latest_journal':
            aValue = a.latestJournalEntry ? new Date(a.latestJournalEntry.created_at) : new Date(0);
            bValue = b.latestJournalEntry ? new Date(b.latestJournalEntry.created_at) : new Date(0);
            break;
          case 'latest_report':
            aValue = a.latestReport ? new Date(a.latestReport.created_at) : new Date(0);
            bValue = b.latestReport ? new Date(b.latestReport.created_at) : new Date(0);
            break;
          case 'latest_insight':
            aValue = a.latestInsight ? new Date(a.latestInsight.created_at) : new Date(0);
            bValue = b.latestInsight ? new Date(b.latestInsight.created_at) : new Date(0);
            break;
          case 'created_at':
            aValue = new Date(a.created_at);
            bValue = new Date(b.created_at);
            break;
          default:
            return 0;
        }

        if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });

      return sorted;
    }

    // Enhanced search:
    // 1. Matches where searchTerm matches start of first name
    // 2. Matches where searchTerm is substring of first name
    // 3. Matches where searchTerm is substring of full name

    const search = searchTerm.trim().toLowerCase();

    let firstNameStarts: typeof clients = [];
    let firstNameHas: typeof clients = [];
    let fullNameHas: typeof clients = [];

    for (const client of clients) {
      const fullName = client.full_name || '';
      const [firstName = ''] = fullName.split(' ');
      const firstNameLower = firstName.toLowerCase();
      const fullNameLower = fullName.toLowerCase();

      if (firstNameLower.startsWith(search)) {
        firstNameStarts.push(client);
      } else if (firstNameLower.includes(search)) {
        firstNameHas.push(client);
      } else if (fullNameLower.includes(search)) {
        fullNameHas.push(client);
      }
    }
    const filtered = [...firstNameStarts, ...firstNameHas, ...fullNameHas];

    // Now sort as before
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;
      switch (sortField) {
        case 'full_name':
          aValue = a.full_name;
          bValue = b.full_name;
          break;
        case 'email':
          aValue = a.email || '';
          bValue = b.email || '';
          break;
        case 'latest_journal':
          aValue = a.latestJournalEntry ? new Date(a.latestJournalEntry.created_at) : new Date(0);
          bValue = b.latestJournalEntry ? new Date(b.latestJournalEntry.created_at) : new Date(0);
          break;
        case 'latest_report':
          aValue = a.latestReport ? new Date(a.latestReport.created_at) : new Date(0);
          bValue = b.latestReport ? new Date(b.latestReport.created_at) : new Date(0);
          break;
        case 'latest_insight':
          aValue = a.latestInsight ? new Date(a.latestInsight.created_at) : new Date(0);
          bValue = b.latestInsight ? new Date(b.latestInsight.created_at) : new Date(0);
          break;
        case 'created_at':
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [clients, searchTerm, filterType, sortField, sortDirection]);

  return {
    clients: filteredAndSortedClients,
    loading,
    backgroundRefreshing,
    searchTerm,
    setSearchTerm,
    sortField,
    sortDirection,
    filterType,
    setFilterType,
    handleSort,
    refreshClientsData
  };
};
