// supabase/functions/parse-and-update-report/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/* -------------------------------------------------- *
 * CORS
 * -------------------------------------------------- */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type'
}

/* -------------------------------------------------- *
 * Replicated types (kept local to avoid external deps)
 * -------------------------------------------------- */
interface PersonData {
  name: string
  birthDate?: string
  birthTime?: string
  location?: string
  latitude?: number
  longitude?: number
}
interface MappedReport {
  title: string
  isRelationship: boolean
  people: { A: PersonData; B?: PersonData }
  reportContent: string
  swissData?: any
  reportType: string
  hasReport: boolean
  swissBoolean: boolean
  metadata?: any
  customerName: string
  isPureAstroReport: boolean
  pdfData?: string
}
interface RawReportPayload {
  guest_report?: any
  report_content?: string
  swiss_data?: any
  metadata?: any
}
interface UpdateTarget {
  table: string
  id: string
  field: string
}
interface RequestBody {
  rawData: RawReportPayload
  updateTarget: UpdateTarget
  parseType?: 'full_report' | 'metadata_only' | 'basic_info'
}

/* -------------------------------------------------- *
 * Helper – escape regex special chars in names
 * -------------------------------------------------- */
function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/* -------------------------------------------------- *
 * Helper – deep replace "Person A/B" with real names
 * (stringify + regex replace is fine for JSON‑safe data)
 * -------------------------------------------------- */
function enrichSwissNames(
  swissData: any,
  nameA: string,
  nameB?: string
): any {
  if (!swissData) return swissData
  const json = JSON.stringify(swissData)
  const replaced = json
    .replace(new RegExp(escapeRegExp('Person A'), 'g'), nameA)
    .replace(
      new RegExp(escapeRegExp('Person B'), 'g'),
      nameB ?? 'Person B'
    )

  try {
    return JSON.parse(replaced)
  } catch (err) {
    console.error('Failed to JSON.parse enriched Swiss data:', err)
    throw new Error('Malformed Swiss data after name enrichment')
  }
}

/* -------------------------------------------------- *
 * mapReportPayload (unchanged, UI‑focused)
 * -------------------------------------------------- */
function mapReportPayload({
  guest_report,
  report_content,
  swiss_data,
  metadata
}: RawReportPayload): MappedReport {
  const reportData = guest_report?.report_data
  if (!reportData?.name) {
    throw new Error(
      `Missing person A name in guest_report.report_data. Received: ${JSON.stringify(
        reportData
      )}`
    )
  }

  const personA: PersonData = {
    name: reportData.name,
    birthDate: reportData.birthDate,
    birthTime: reportData.birthTime,
    location: reportData.birthLocation,
    latitude: reportData.birthLatitude,
    longitude: reportData.birthLongitude
  }

  const personB: PersonData | undefined = reportData.secondPersonName
    ? {
        name: reportData.secondPersonName,
        birthDate: reportData.secondPersonBirthDate,
        birthTime: reportData.secondPersonBirthTime,
        location: reportData.secondPersonBirthLocation,
        latitude: reportData.secondPersonLatitude,
        longitude: reportData.secondPersonLongitude
      }
    : undefined

  const isRelationship = !!personB
  const reportType =
    guest_report?.report_type ??
    metadata?.content_type ??
    reportData?.reportType ??
    ''

  const title = isRelationship
    ? `${personA.name} × ${personB!.name}`
    : `${personA.name} – ${
        reportType.charAt(0).toUpperCase() + reportType.slice(1)
      }`

  const mapped: MappedReport = {
    title,
    isRelationship,
    people: { A: personA, ...(personB && { B: personB }) },
    reportContent: report_content ?? '',
    swissData: swiss_data,
    reportType,
    hasReport: guest_report?.is_ai_report ?? false,
    swissBoolean:
      guest_report?.swiss_boolean ?? metadata?.is_astro_report ?? !!swiss_data,
    metadata,
    customerName: personA.name,
    isPureAstroReport:
      (reportType === 'essence' || reportType === 'sync') && !report_content,
    pdfData: guest_report?.report_pdf_base64
  }

  return mapped
}

/* -------------------------------------------------- *
 * Core parser
 * -------------------------------------------------- */
function getParseResult(
  rawData: RawReportPayload,
  parseType: string = 'full_report'
) {
  const fullReport = mapReportPayload(rawData)

  switch (parseType) {
    /* ----------------------- metadata_only ---------------------- */
    case 'metadata_only':
      return {
        title: fullReport.title,
        isRelationship: fullReport.isRelationship,
        reportType: fullReport.reportType,
        customerName: fullReport.customerName,
        isPureAstroReport: fullReport.isPureAstroReport,
        hasReport: fullReport.hasReport,
        swissBoolean: fullReport.swissBoolean
      }

    /* ------------------------- basic_info ----------------------- */
    case 'basic_info':
      return {
        title: fullReport.title,
        people: fullReport.people,
        reportType: fullReport.reportType
      }

    /* ------------------------- full_report ---------------------- */
    case 'full_report':
    default: {
      // Enrich and return *only* Swiss data (no UI payload)
      if (rawData.swiss_data) {
        const personAName = fullReport.people.A.name
        const personBName = fullReport.people.B?.name
        return enrichSwissNames(rawData.swiss_data, personAName, personBName)
      }
      // Fallback – no swiss_data supplied
      return null
    }
  }
}

/* -------------------------------------------------- *
 * Edge function handler
 * -------------------------------------------------- */
Deno.serve(async (req) => {
  // CORS pre‑flight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const {
      rawData,
      updateTarget,
      parseType = 'full_report'
    }: RequestBody = await req.json()

    // Basic validation
    if (
      !rawData ||
      !updateTarget?.table ||
      !updateTarget?.id ||
      !updateTarget?.field
    ) {
      return new Response(
        JSON.stringify({
          error:
            'Missing required fields: rawData, updateTarget.table, updateTarget.id, updateTarget.field'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse/enrich
    const parsedData = getParseResult(rawData, parseType)

    // Persist
    const { data, error } = await supabase
      .from(updateTarget.table)
      .update({ [updateTarget.field]: parsedData })
      .eq('id', updateTarget.id)
      .select()

    if (error) {
      console.error('DB update error:', error)
      return new Response(
        JSON.stringify({ error: `Failed to update ${updateTarget.table}: ${error.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        updatedRecord: data?.[0],
        updateTarget
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Edge function runtime error:', err)
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
