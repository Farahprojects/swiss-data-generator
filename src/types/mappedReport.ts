import { z } from 'zod';

export const PersonDataSchema = z.object({
  name: z.string(),
  birthDate: z.string().optional(),
  birthTime: z.string().optional(),
  location: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export const MappedReportSchema = z.object({
  title: z.string(),
  isRelationship: z.boolean(),
  people: z.object({
    A: PersonDataSchema,
    B: PersonDataSchema.optional(),
  }),
  reportContent: z.string(),
  swissData: z.any().optional(),
  reportType: z.string(),
  hasReport: z.boolean(),
  swissBoolean: z.boolean(),
  // metadata removed to prevent recursive bloat - only used as input for parsing
  // Additional fields for rendering
  customerName: z.string(),
  isPureAstroReport: z.boolean(),
  pdfData: z.string().optional(),
});

export type PersonData = z.infer<typeof PersonDataSchema>;
export type MappedReport = z.infer<typeof MappedReportSchema>;

export interface RawReportPayload {
  guest_report?: any;
  report_content?: string;
  swiss_data?: any;
  metadata?: any;
}