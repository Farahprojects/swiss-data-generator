import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Replicated types from the main app
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
  people: {
    A: PersonData
    B?: PersonData
  }
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

// Replicated mapReportPayload function
function mapReportPayload({
  guest_report,
  report_content,
  swiss_data,
  metadata
}: RawReportPayload): MappedReport {
  console.log('mapReportPayload received payload:', {
    guest_report,
    has_report_data: !!guest_report?.report_data,
    report_data_keys: guest_report?.report_data ? Object.keys(guest_report.report_data) : [],
    report_data_name: guest_report?.report_data?.name
  })
  
  const reportData = guest_report?.report_data
  if (!reportData?.name) {
    console.error('Missing person A name - detailed debug:', {
      reportData,
      guest_report,
      metadata
    })
    throw new Error(`Missing person A name in guest_report.report_data. Received: ${JSON.stringify(reportData)}`)
  }

  const personA = {
    name: reportData.name,
    birthDate: reportData.birthDate,
    birthTime: reportData.birthTime,
    location: reportData.birthLocation,
    latitude: reportData.birthLatitude,
    longitude: reportData.birthLongitude,
  }

  const personB = reportData.secondPersonName
    ? {
        name: reportData.secondPersonName,
        birthDate: reportData.secondPersonBirthDate,
        birthTime: reportData.secondPersonBirthTime,
        location: reportData.secondPersonBirthLocation,
        latitude: reportData.secondPersonLatitude,
        longitude: reportData.secondPersonLongitude,
      }
    : undefined

  const isRelationship = !!personB
  const reportType = guest_report?.report_type ?? metadata?.content_type ?? reportData?.reportType ?? ''

  const title = isRelationship 
    ? `${personA.name} × ${personB.name}`
    : `${personA.name} – ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}`

  const customerName = personA.name

  // Strictly use AI report content only (text with markdown), no fallbacks
  const extractedReportContent = report_content ?? ''

  // Do not fallback — trust DB flags as single source of truth
  const isPureAstroReport = (reportType === 'essence' || reportType === 'sync') && !report_content
  const hasReport = guest_report?.is_ai_report ?? false
  const swissBoolean = guest_report?.swiss_boolean ?? metadata?.is_astro_report ?? !!swiss_data

  const mappedReport: MappedReport = {
    title,
    isRelationship,
    people: { 
      A: personA, 
      ...(personB && { B: personB }) 
    },
    reportContent: extractedReportContent,
    swissData: swiss_data,
    reportType,
    hasReport,
    swissBoolean,
    metadata,
    customerName,
    isPureAstroReport,
    pdfData: guest_report?.report_pdf_base64,
  }

  return mappedReport
}

function getParseResult(rawData: RawReportPayload, parseType: string = 'full_report') {
  const fullReport = mapReportPayload(rawData)
  
  switch (parseType) {
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
    
    case 'basic_info':
      return {
        title: fullReport.title,
        people: fullReport.people,
        reportType: fullReport.reportType
      }
    
    case 'full_report':
    default:
      // For full_report, enrich the original swiss_data directly
      // instead of wrapping it to prevent infinite recursion
      if (rawData.swiss_data) {
        return {
          ...rawData.swiss_data,
          title: fullReport.title,
          people: fullReport.people,
          metadata: {
            coach_name: rawData.metadata?.coach_name || rawData.guest_report?.coach_name,
            coach_slug: rawData.metadata?.coach_slug || rawData.guest_report?.coach_slug,
            has_report: fullReport.hasReport,
            report_type: fullReport.reportType,
            customer_email: rawData.guest_report?.email
          },
          hasReport: fullReport.hasReport,
          reportType: fullReport.reportType,
          customerName: fullReport.customerName,
          swissBoolean: fullReport.swissBoolean,
          reportContent: fullReport.reportContent,
          isRelationship: fullReport.isRelationship,
          isPureAstroReport: fullReport.isPureAstroReport
        }
      }
      
      // Fallback if no swiss_data
      return fullReport
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { rawData, updateTarget, parseType = 'full_report' }: RequestBody = await req.json()

    console.log('Parse and update request:', {
      updateTarget,
      parseType,
      hasRawData: !!rawData
    })

    // Validate required fields
    if (!rawData || !updateTarget?.table || !updateTarget?.id || !updateTarget?.field) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: rawData, updateTarget.table, updateTarget.id, updateTarget.field' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse the data
    const parsedData = getParseResult(rawData, parseType)
    console.log('Parsed data result:', { parsedData })

    // Update the target table/field
    const { data, error } = await supabase
      .from(updateTarget.table)
      .update({ [updateTarget.field]: parsedData })
      .eq('id', updateTarget.id)
      .select()

    if (error) {
      console.error('Database update error:', error)
      return new Response(
        JSON.stringify({ error: `Failed to update ${updateTarget.table}: ${error.message}` }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Successfully updated:', {
      table: updateTarget.table,
      id: updateTarget.id,
      field: updateTarget.field,
      updated: !!data?.[0]
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        parsedData, 
        updatedRecord: data?.[0],
        updateTarget 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})