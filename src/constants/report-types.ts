
import { ReportTypeOption } from '@/types/public-report';

export const reportTypes: ReportTypeOption[] = [
  { value: 'sync', label: 'Sync Report' },
  { value: 'essence', label: 'Essence Report' },
  { value: 'flow', label: 'Flow Report' },
  { value: 'mindset', label: 'Mindset Report' },
  { value: 'monthly', label: 'Monthly Report' },
  { value: 'focus', label: 'Focus Report' },
];

export const relationshipTypes: ReportTypeOption[] = [
  { value: 'personal', label: 'Personal' },
  { value: 'professional', label: 'Professional' },
];

export const essenceTypes: ReportTypeOption[] = [
  { value: 'personal', label: 'Personal' },
  { value: 'professional', label: 'Professional' },
  { value: 'relational', label: 'Relational' },
];
