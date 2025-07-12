import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Map report payload function - same as in client
function mapReportPayload(payload: any): any {
  try {
    const guestReport = payload.guest_report || {};
    const reportData = guestReport.report_data || {};
    const personA = reportData.person_a || reportData.persons?.[0] || {};
    const personB = reportData.person_b || reportData.persons?.[1] || {};

    const reportContent = payload.report_content || '';
    const swissData = payload.swiss_data || null;
    const isRelationship = !!(personB && (personB.name || personB.birth_date));
    const reportType = guestReport.report_type || 'unknown';
    const customerName = personA.name || 'Unknown Customer';

    return {
      title: isRelationship ? 'Synastry Report' : 'Natal Report',
      isRelationship,
      people: {
        A: {
          name: personA.name || 'Person A',
          birthDate: personA.birth_date,
          birthTime: personA.birth_time,
          location: personA.birth_location,
          latitude: personA.latitude,
          longitude: personA.longitude,
        },
        B: isRelationship ? {
          name: personB.name || 'Person B',
          birthDate: personB.birth_date,
          birthTime: personB.birth_time,
          location: personB.birth_location,
          latitude: personB.latitude,
          longitude: personB.longitude,
        } : undefined,
      },
      reportContent,
      swissData,
      reportType,
      hasReport: !!reportContent,
      swissBoolean: reportType === 'essence' || reportType === 'sync',
      customerName,
      isPureAstroReport: !reportContent && !!swissData,
    };
  } catch (error) {
    console.error('Error mapping report payload:', error);
    throw error;
  }
}

// Get guest report data
async function getGuestReport(guestReportId: string) {
  const { data: guestReport, error: guestError } = await supabase
    .from('guest_reports')
    .select('*')
    .eq('id', guestReportId)
    .single();

  if (guestError || !guestReport) {
    throw new Error('Guest report not found');
  }

  let reportContent = '';
  let swissData = null;
  let metadata = {};

  // Fetch report content if available
  if (guestReport.report_log_id) {
    const { data: reportLog, error: reportError } = await supabase
      .from('report_logs')
      .select('report_text')
      .eq('id', guestReport.report_log_id)
      .single();

    if (!reportError && reportLog) {
      reportContent = reportLog.report_text || '';
    }
  }

  // Fetch Swiss data if available
  if (guestReport.translator_log_id) {
    const { data: translatorLog, error: translatorError } = await supabase
      .from('translator_logs')
      .select('swiss_data, request_payload')
      .eq('id', guestReport.translator_log_id)
      .single();

    if (!translatorError && translatorLog) {
      swissData = translatorLog.swiss_data;
      metadata = translatorLog.request_payload || {};
    }
  }

  return {
    guest_report: guestReport,
    report_content: reportContent,
    swiss_data: swissData,
    metadata,
  };
}

// React SSR function to render HTML
function renderReportToHTML(mappedReport: any): string {
  // Generate minimal HTML structure that will work with Puppeteer
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Report PDF</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #374151;
      background: white;
    }
    .container { 
      max-width: 800px; 
      margin: 0 auto; 
      padding: 2rem;
    }
    .header { 
      margin-bottom: 2rem; 
      padding-bottom: 1.5rem; 
      border-bottom: 1px solid #e5e7eb;
    }
    .title { 
      font-size: 1.75rem; 
      font-weight: 300; 
      color: #111827; 
      margin-bottom: 0.5rem;
    }
    .subtitle { 
      font-size: 1.125rem; 
      font-weight: 300; 
      color: #6b7280;
    }
    .section { 
      margin-bottom: 3rem;
    }
    .section-title { 
      font-size: 1.25rem; 
      font-weight: 300; 
      color: #111827; 
      margin-bottom: 1.5rem;
    }
    .content { 
      font-weight: 300; 
      line-height: 1.75;
    }
    .content h3 { 
      font-size: 1.125rem; 
      font-weight: 300; 
      margin: 2rem 0 1rem 0; 
      color: #111827;
    }
    .content p { 
      margin-bottom: 1rem; 
      color: #374151;
    }
    .astro-section { 
      margin-top: 1rem;
    }
    .planet-table { 
      width: 100%; 
      border-collapse: collapse; 
      margin: 1rem 0;
    }
    .planet-table th, .planet-table td { 
      padding: 0.5rem; 
      border: 1px solid #e5e7eb; 
      text-align: left;
    }
    .planet-table th { 
      background: #f9fafb; 
      font-weight: 500;
    }
    .footer { 
      margin-top: 4rem; 
      padding-top: 2rem; 
      border-top: 1px solid #e5e7eb; 
      text-align: center; 
      color: #6b7280; 
      font-size: 0.875rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="title">${mappedReport.title}</h1>
      <p class="subtitle">Generated for ${mappedReport.customerName}</p>
    </div>
    
    ${mappedReport.reportContent ? `
    <div class="section">
      <h2 class="section-title">Report Analysis</h2>
      <div class="content">
        ${formatReportContent(mappedReport.reportContent)}
      </div>
    </div>
    ` : ''}
    
    ${mappedReport.swissData ? `
    <div class="section">
      <h2 class="section-title">Astrological Data</h2>
      <div class="astro-section">
        ${renderAstroData(mappedReport.swissData, mappedReport)}
      </div>
    </div>
    ` : ''}
    
    <div class="footer">
      <p>Generated on ${new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}</p>
    </div>
  </div>
</body>
</html>`;
}

// Format report content similar to ReportRenderer
function formatReportContent(content: string): string {
  const lines = content.split('\n');
  let html = '';
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      html += '<br>';
      continue;
    }
    
    // Detect headings (lines ending with ':' or starting with '##')
    if (trimmed.endsWith(':') || trimmed.startsWith('##')) {
      html += `<h3>${trimmed.replace(/^#+\s*/, '').replace(/:$/, '')}</h3>`;
    } else {
      html += `<p>${trimmed}</p>`;
    }
  }
  
  return html;
}

// Render astrological data
function renderAstroData(swissData: any, mappedReport: any): string {
  if (!swissData) return '';
  
  let html = '';
  const personA = mappedReport.people.A;
  const personB = mappedReport.people.B;
  
  // Render planets for Person A
  if (swissData.planets && swissData.planets.A) {
    html += `<h3>${personA.name} - Planetary Positions</h3>`;
    html += '<table class="planet-table">';
    html += '<tr><th>Planet</th><th>Sign</th><th>Position</th></tr>';
    
    const planets = swissData.planets.A;
    for (const [planet, data] of Object.entries(planets)) {
      if (typeof data === 'object' && data !== null) {
        const planetData = data as any;
        html += `<tr>
          <td>${planet}</td>
          <td>${planetData.sign || ''}</td>
          <td>${planetData.position || ''}</td>
        </tr>`;
      }
    }
    html += '</table>';
  }
  
  // Render planets for Person B if synastry
  if (personB && swissData.planets && swissData.planets.B) {
    html += `<h3>${personB.name} - Planetary Positions</h3>`;
    html += '<table class="planet-table">';
    html += '<tr><th>Planet</th><th>Sign</th><th>Position</th></tr>';
    
    const planets = swissData.planets.B;
    for (const [planet, data] of Object.entries(planets)) {
      if (typeof data === 'object' && data !== null) {
        const planetData = data as any;
        html += `<tr>
          <td>${planet}</td>
          <td>${planetData.sign || ''}</td>
          <td>${planetData.position || ''}</td>
        </tr>`;
      }
    }
    html += '</table>';
  }
  
  return html;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { guest_report_id } = await req.json();

    if (!guest_report_id) {
      return new Response(
        JSON.stringify({ error: 'Missing guest_report_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating PDF for guest report: ${guest_report_id}`);

    // 1. Fetch report data exactly as the modal does
    const rawData = await getGuestReport(guest_report_id);
    const mappedReport = mapReportPayload(rawData);

    console.log(`Mapped report for: ${mappedReport.customerName}`);

    // 2. Render HTML
    const html = renderReportToHTML(mappedReport);

    // 3. Convert to PDF using Puppeteer
    const browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: { top: 36, bottom: 36, left: 36, right: 36 },
      printBackground: true
    });
    
    await browser.close();

    console.log(`PDF generated successfully, size: ${pdfBuffer.length} bytes`);

    // 4. Return PDF buffer
    const filename = `${mappedReport.customerName.replace(/\s+/g, '_')}_Report.pdf`;
    
    return new Response(pdfBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate PDF', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});