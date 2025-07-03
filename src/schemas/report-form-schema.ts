import * as z from 'zod';

export const reportSchema = z.object({
  reportType: z.string().optional(),
  relationshipType: z.string().optional(),
  essenceType: z.string().optional(),
  // Mobile-specific fields that help populate the above
  reportCategory: z.string().optional(),
  reportSubCategory: z.string().optional(),
  astroDataType: z.string().optional(),
  // Astro data request field
  request: z.string().optional(),
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
  // Either reportType OR request must be provided
  if ((!data.reportType || data.reportType === '') && (!data.request || data.request === '')) {
    return false;
  }
  return true;
}, {
  message: "Please select a report type or specify a request",
  path: ["reportType"]
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
  if (data.reportType === 'sync' && (!data.secondPersonName || data.secondPersonName.trim() === '')) {
    return false;
  }
  return true;
}, {
  message: "Second person's name is required for sync reports",
  path: ["secondPersonName"]
}).refine((data) => {
  if (data.reportType === 'sync' && (!data.secondPersonBirthDate || data.secondPersonBirthDate === '')) {
    return false;
  }
  return true;
}, {
  message: "Second person's birth date is required for sync reports",
  path: ["secondPersonBirthDate"]
}).refine((data) => {
  if (data.reportType === 'sync' && (!data.secondPersonBirthTime || data.secondPersonBirthTime === '')) {
    return false;
  }
  return true;
}, {
  message: "Second person's birth time is required for sync reports",
  path: ["secondPersonBirthTime"]
}).refine((data) => {
  if (data.reportType === 'sync' && (!data.secondPersonBirthLocation || data.secondPersonBirthLocation.trim() === '')) {
    return false;
  }
  return true;
}, {
  message: "Second person's birth location is required for sync reports",
  path: ["secondPersonBirthLocation"]
});

export type ReportFormData = z.infer<typeof reportSchema>;