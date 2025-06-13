
import * as z from 'zod';

export const reportSchema = z.object({
  reportType: z.string().min(1, 'Please select a report type'),
  relationshipType: z.string().optional(),
  essenceType: z.string().optional(),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  birthDate: z.string().min(1, 'Birth date is required'),
  birthTime: z.string().min(1, 'Birth time is required'),
  birthLocation: z.string().min(1, 'Birth location is required'),
  birthLatitude: z.number().optional(),
  birthLongitude: z.number().optional(),
  birthPlaceId: z.string().optional(),
  // For compatibility/sync reports
  secondPersonName: z.string().optional(),
  secondPersonBirthDate: z.string().optional(),
  secondPersonBirthTime: z.string().optional(),
  secondPersonBirthLocation: z.string().optional(),
  secondPersonLatitude: z.number().optional(),
  secondPersonLongitude: z.number().optional(),
  secondPersonPlaceId: z.string().optional(),
  // For return reports
  returnYear: z.string().optional(),
  notes: z.string().optional(),
  promoCode: z.string().optional(),
});

export type ReportFormData = z.infer<typeof reportSchema>;

export const reportTypes = [
  { value: 'sync', label: 'Sync Report' },
  { value: 'essence', label: 'Essence Report' },
  { value: 'flow', label: 'Flow Report' },
  { value: 'mindset', label: 'Mindset Report' },
  { value: 'monthly', label: 'Monthly Report' },
  { value: 'focus', label: 'Focus Report' },
];

export const relationshipTypes = [
  { value: 'personal', label: 'Personal' },
  { value: 'professional', label: 'Professional' },
];

export const essenceTypes = [
  { value: 'personal', label: 'Personal' },
  { value: 'professional', label: 'Professional' },
  { value: 'relational', label: 'Relational' },
];
