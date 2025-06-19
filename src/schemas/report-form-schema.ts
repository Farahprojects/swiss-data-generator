
import * as z from 'zod';
import { parseReportType } from '@/constants/report-types';

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
  secondPersonName: z.string().optional(),
  secondPersonBirthDate: z.string().optional(),
  secondPersonBirthTime: z.string().optional(),
  secondPersonBirthLocation: z.string().optional(),
  secondPersonLatitude: z.number().optional(),
  secondPersonLongitude: z.number().optional(),
  secondPersonPlaceId: z.string().optional(),
  returnYear: z.string().optional(),
  notes: z.string().optional(),
  promoCode: z.string().optional(),
}).refine((data) => {
  const { mainType } = parseReportType(data.reportType);
  
  // For sync reports, require second person details
  if (mainType === 'sync') {
    if (!data.secondPersonName || data.secondPersonName.trim() === '') {
      return false;
    }
    if (!data.secondPersonBirthDate || data.secondPersonBirthDate === '') {
      return false;
    }
    if (!data.secondPersonBirthTime || data.secondPersonBirthTime === '') {
      return false;
    }
    if (!data.secondPersonBirthLocation || data.secondPersonBirthLocation.trim() === '') {
      return false;
    }
  }
  return true;
}, {
  message: "All second person details are required for sync reports",
  path: ["secondPersonName"]
});

export type ReportFormData = z.infer<typeof reportSchema>;
