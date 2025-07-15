import { z } from 'zod';

// Person A and B schema definition
export const PersonDataSchema = z.object({
  name: z.string(),
  birthDate: z.string().optional(),
  birthTime: z.string().optional(),
  location: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

// Final mapped report schema (used for AI output or storage)
export const MappedReportSchema = z.object({
  title: z.string(),
  isRelationship: z.boolean(),
  people: z.object({
    A: PersonDataSchema,
    B: PersonDataSchema.optional(),
  }),
  reportContent: z.string(),
  swissData: z.any().optional(), // Swiss ephemeris JSON output
  reportType: z.string(),
  hasReport: z.boolean(), // Indicates if there's valid AI report content
  swissBoolean: z.boolean(), // True if swissData is used to drive the report
  metadata: z.any().optional(), // Used strictly for context, should never nest recursively
  customerName: z.string(),
  isPureAstroReport: z.boolean(), // True if this is an astrology-only report
  pdfData: z.string().optional(), // Optional base64 encoded PDF content
});

// Types for TS inference
export type PersonData = z.infer<typeof PersonDataSchema>;
export type MappedReport = z.infer<typeof MappedReportSchema>;

// Raw payload that gets passed into the parser function
export interface RawReportPayload {
  guest_report?: any;        // Core guest_report object
  report_content?: string;   // Markdown or text report (AI-generated)
  swiss_data?: any;          // Raw ephemeris data (astro engine)
  metadata?: any;            // Used internally for reference, not for output
}
