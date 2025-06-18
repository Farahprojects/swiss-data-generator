
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
  if (data.reportType === 'essence' && (!data.essenceType || data.essenceType === '')) {
    return false;
  }
  return true;
}, {
  message: "Please select an essence focus type",
  path: ["essenceType"]
}).refine((data) => {
  if (data.reportType === 'sync' && (!data.relationshipType || data.relationshipType === '')) {
    return false;
  }
  return true;
}, {
  message: "Please select a relationship type",
  path: ["relationshipType"]
}).refine((data) => {
  if (data.reportType === 'sync') {
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
