
import { ReportTypeOption } from '@/types/public-report';

export const reportTypes: ReportTypeOption[] = [
  // Essence Report group
  { value: 'essence-relational', label: 'Essence - Relational' },
  { value: 'essence-personal', label: 'Essence - Personal' },
  { value: 'essence-professional', label: 'Essence - Professional' },
  
  // Sync Report group
  { value: 'sync-professional', label: 'Sync - Professional' },
  { value: 'sync-personal', label: 'Sync - Personal' },
];

// Helper functions to parse combined values
export const parseReportType = (combinedValue: string) => {
  if (combinedValue.startsWith('essence-')) {
    return {
      mainType: 'essence',
      subType: combinedValue.replace('essence-', '')
    };
  }
  
  if (combinedValue.startsWith('sync-')) {
    return {
      mainType: 'sync',
      subType: combinedValue.replace('sync-', '')
    };
  }
  
  return {
    mainType: combinedValue,
    subType: null
  };
};

export const getReportTypeLabel = (value: string) => {
  const option = reportTypes.find(type => type.value === value);
  return option?.label || value;
};

// Legacy exports for backward compatibility (no longer used)
export const relationshipTypes: ReportTypeOption[] = [
  { value: 'personal', label: 'Personal' },
  { value: 'professional', label: 'Professional' },
];

export const essenceTypes: ReportTypeOption[] = [
  { value: 'personal', label: 'Personal' },
  { value: 'professional', label: 'Professional' },
  { value: 'relational', label: 'Relational' },
];
