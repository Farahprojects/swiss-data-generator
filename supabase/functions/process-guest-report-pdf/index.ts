
// ============================================================================
//  process-guest-report-pdf.ts
//  Generates a PDF for a guest report and forwards a full email payload
//  (template name, rendered HTML/text, + attachments) to the send-email
//  edge-function.  No direct SMTP interaction lives here any more.
// ============================================================================

// @deno-types="https://esm.sh/@types/jspdf@2.5.1"
import jsPDF from "https://esm.sh/jspdf@2.5.1";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SharedReportParser } from "../_shared/reportParser.ts";
import { parseAstroData, isSynastryData } from "../_shared/astroFormatter.ts";
import { formatDegDecimal } from "../_shared/astroFormat.ts";


// ─── ENV VARS ────────────────────────────────────────────────────────────────
const SUPABASE_URL           = Deno.env.get("SUPABASE_URL")              ?? "";
const SUPABASE_SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// ─── CORS HEADERS ────────────────────────────────────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─────────────────────────────────────────────────────────────────────────────
//  PDF-generation helpers using shared parser
// ─────────────────────────────────────────────────────────────────────────────
class ServerPdfGenerator {
  static generateReportPdf(reportData: any, logPrefix: string): string {
    console.log(`${logPrefix} Starting PDF generation`);
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margins = { top: 20, right: 20, bottom: 20, left: 20 };

    // ── metadata + header
    doc.setProperties({
      title: "Therai Astro Report",
      subject: "Client Energetic Insight",
      author: "Therai Astro",
      creator: "PDF Generator Service",
    });

    doc.setFontSize(26).setFont("times", "bold").text("Therai.", pageW / 2, 32, { align: "center" });
    
    const reportTitle = this.getReportTitle(reportData.reportType);
    doc.setFontSize(20).setFont("helvetica", "bold")
       .text(reportTitle, pageW / 2, 48, { align: "center" });
    
    if (reportData.customerName) {
        doc.setFontSize(14).setFont("helvetica", "normal");
        doc.text(`For: ${reportData.customerName}`, pageW / 2, 58, { align: 'center' });
    }

    // ── meta
    let y = 75;
    doc.setFontSize(10).setFont("helvetica", "normal").setTextColor(100);
    doc.text("Report ID:", margins.left, y);
    doc.setFont("helvetica", "bold")
       .text(reportData.id.substring(0,8), margins.left+40, y);
    y += 6;
    doc.setFont("helvetica", "normal").text("Generated At:", margins.left, y);
    doc.setFont("helvetica", "bold").text(reportData.generatedAt, margins.left+40, y);
    y += 12;
    
    // ── body using shared parser (AI Content)
    if (reportData.content) {
        doc.setFontSize(13).setFont("helvetica", "bold").setTextColor(75,63,114);
        doc.text("Client Energetic Insight", margins.left, y);

        const blocks = SharedReportParser.parseReport(reportData.content);
        doc.setFontSize(11).setFont("helvetica", "normal").setTextColor(33);
        let lineY = y + 12;
        const lineH = 7.2, headingGap = 10, footerPad = 20;
        const newPage = () => { doc.addPage(); lineY = margins.top; };
        const ensure = (extra=0) => (lineY + extra > pageH - footerPad) && newPage();

        for (const b of blocks) {
          switch (b.type) {
            case "heading":
              lineY += headingGap; ensure(lineH);
              doc.setFont("helvetica", "bold").setTextColor(40,40,60)
                 .text(b.text, margins.left, lineY);
              doc.setFont("helvetica", "normal").setTextColor(33);
              lineY += lineH; break;
            case "action": {
              const wrap = doc.splitTextToSize(b.text, pageW - margins.left - margins.right - 5);
              wrap.forEach(l => { ensure(lineH); doc.text(l, margins.left+5, lineY); lineY+=lineH; });
              lineY += 2; break;
            }
            case "tag":
              ensure(lineH); doc.setTextColor(60).text(b.text, margins.left+5, lineY);
              doc.setTextColor(33); lineY += lineH; break;
            case "spacer": lineY += lineH; break;
            default: {
              const wrap = doc.splitTextToSize(b.text, pageW - margins.left - margins.right);
              wrap.forEach(l => { ensure(lineH); doc.text(l, margins.left, lineY); lineY+=lineH; });
              lineY += 2; break;
            }
          }
        }
    }

    // --- Render Astro Data ---
    if (reportData.astroData) {
        doc.addPage();
        let astroY = margins.top;

        if (isSynastryData(reportData.astroData)) {
            astroY = this.renderSynastryData(reportData.astroData, astroY, doc, margins);
        } else {
            astroY = this.renderEssenceData(reportData.astroData, astroY, doc, margins);
        }
    }

    // ── return base-64
    const dataUri = doc.output("datauristring");
    return dataUri.split(",")[1] ?? "";
  }

  static getReportTitle(reportType?: string): string {
    if (!reportType) return "Intelligence Report";
    
    const reportTitles: Record<string, string> = {
      'essence_personal': 'Essence Report (Personal)',
      'essence_business': 'Essence Report (Business)',
      'sync_personal': 'Synastry Report (Personal)',
      'sync_business': 'Synastry Report (Business)',
      'focus_personal': 'Focus Report (Personal)',
      'focus_business': 'Focus Report (Business)',
      'flow_personal': 'Flow Report (Personal)',
      'flow_business': 'Flow Report (Business)',
      'default': 'Intelligence Report'
    };
    
    return reportTitles[reportType.toLowerCase()] || reportTitles['default'];
  }

  static renderSynastryData(swissData: any, startY: number, doc: any, margins: any): number {
    const data = parseAstroData(swissData);
    let y = startY;

    const { meta, natal_set, synastry_aspects, composite_chart, transits } = data;

    // Header
    doc.setFontSize(16).setFont('helvetica', 'bold').setTextColor(40, 40, 60);
    const personAName = natal_set?.personA?.name || 'Person A';
    const personBName = natal_set?.personB?.name || 'Person B';
    doc.text(`${personAName} & ${personBName} - Compatibility Astro Data`, margins.left, y);
    y += 20;

    if (natal_set?.personA) {
      y = this.renderPersonSection(natal_set.personA, 'Natal Data', y, doc, margins);
      y += 10;
    }
    
    if (natal_set?.personB) {
      const pageWidth = doc.internal.pageSize.getWidth();
      doc.setDrawColor(200).line(margins.left, y, pageWidth - margins.right, y);
      y += 15;
      y = this.renderPersonSection(natal_set.personB, 'Natal Data', y, doc, margins);
    }
    
    if (synastry_aspects?.aspects) {
      y += 15;
      y = this.renderSection(`SYNASTRY ASPECTS (${personAName} ↔ ${personBName})`, synastry_aspects.aspects, y, false, doc, margins);
    }

    if (composite_chart) {
      y += 15;
      y = this.renderSection("COMPOSITE CHART - MIDPOINTS", composite_chart, y, true, doc, margins);
    }

    return y;
  }

  static renderEssenceData(swissData: any, startY: number, doc: any, margins: any): number {
    const parsed = parseAstroData(swissData);
    const natal = parsed?.natal;
    let y = startY;

    // Header
    doc.setFontSize(16).setFont('helvetica', 'bold').setTextColor(40, 40, 60);
    doc.text('Astro Data', margins.left, y);
    y += 20;

    if (natal?.name) {
      doc.setFontSize(14).setFont('helvetica', 'bold').setTextColor(60);
      doc.text(natal.name, margins.left, y);
      y += 15;
    }

    if (natal?.angles && natal.angles.length > 0) {
      y += 10;
      const anglesMap: Record<string, any> = {};
      natal.angles.forEach((a: any) => { anglesMap[a.name] = a; });
      y = this.renderAnglesSection(anglesMap as any, y, doc, margins);
    }

    if (natal?.houses && (Array.isArray(natal.houses) ? natal.houses.length > 0 : Object.keys(natal.houses || {}).length > 0)) {
      y += 15;
      const housesMap: Record<string, any> = Array.isArray(natal.houses)
        ? natal.houses.reduce((acc: any, h: any) => { acc[String(h.number ?? '')] = h; return acc; }, {})
        : natal.houses;
      y = this.renderHousesSection(housesMap as any, y, doc, margins);
    }

    y += 10;
    y = this.renderSection("NATAL PLANETARY POSITIONS", natal?.planets || [], y, true, doc, margins);

    y += 15;
    y = this.renderSection("NATAL ASPECTS", natal?.aspects || [], y, false, doc, margins);

    return y;
  }

  static renderPersonSection(person: any, title: string, startY: number, doc: any, margins: any): number {
    let y = startY;
    y = this.renderSection(`${person.name} - Planets`, person.planets, y, true, doc, margins);
    y += 10;
    y = this.renderSection(`${person.name} - Natal Aspects`, person.aspects, y, false, doc, margins);
    return y;
  }

  static renderSection(title: string, data: any[], startY: number, isPlanetTable: boolean, doc: any, margins: any): number {
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = startY;
    
    doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(120);
    doc.text(title, margins.left, y);
    y += 8;

    if (!data || data.length === 0) {
      doc.setFontSize(9).setFont('helvetica', 'italic').setTextColor(150);
      doc.text(isPlanetTable ? 'No planetary data available.' : 'No significant aspects detected.', margins.left, y);
      return y + 7;
    }

    doc.setFontSize(9).setFont('helvetica', 'bold').setTextColor(120);
    if (isPlanetTable) {
      doc.text('Planet', margins.left, y);
      doc.text('Position', margins.left + 80, y);
    } else {
      doc.text('Planet', margins.left, y);
      doc.text('Aspect', margins.left + 60, y);
      doc.text('To', margins.left + 100, y);
      doc.text('Orb', margins.left + 130, y);
    }
    y += 7;

    doc.setFontSize(9).setFont('helvetica', 'normal').setTextColor(40);
    data.forEach((item: any) => {
      if (y > pageHeight - 25) {
        doc.addPage();
        y = margins.top;
      }

      if (isPlanetTable) {
        const sign = (item.sign || '').padEnd(12);
        const degDecimal = formatDegDecimal(item.deg);
        const house = item.house ? `(H${item.house})` : '';
        const position = `${degDecimal} ${sign} ${house}`;

        doc.text(item.name || 'Unknown', margins.left, y);
        doc.text(position, margins.left + 80, y);
        
        if (item.retrograde) {
          doc.setFont('helvetica', 'italic');
          doc.text('R', margins.left + 170, y);
          doc.setFont('helvetica', 'normal');
        }
      } else {
        doc.text(item.a || 'Unknown', margins.left, y);
        doc.text(item.type || 'Unknown', margins.left + 60, y);
        doc.text(item.b || 'Unknown', margins.left + 100, y);
        doc.text(`${item.orb?.toFixed(2) ?? '0.00'}°`, margins.left + 130, y);
      }
      y += 7;
    });

    return y;
  }

  static renderAnglesSection(angles: any[], startY: number, doc: any, margins: any): number {
    let y = startY;
    
    doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(120);
    doc.text('CHART ANGLES', margins.left, y);
    y += 8;

    if (!angles || angles.length === 0) {
      doc.setFontSize(9).setFont('helvetica', 'italic').setTextColor(150);
      doc.text('No angle data available.', margins.left, y);
      return y + 7;
    }

    doc.setFontSize(9).setFont('helvetica', 'bold').setTextColor(120);
    doc.text('Angle', margins.left, y);
    doc.text('Position', margins.left + 80, y);
    y += 7;

    doc.setFontSize(9).setFont('helvetica', 'normal').setTextColor(40);
    Object.entries(angles).forEach(([name, data]: [string, any]) => {
      const position = `${data.deg.toFixed(2)}° in ${data.sign}`;
      doc.text(name, margins.left, y);
      doc.text(position, margins.left + 80, y);
      y += 7;
    });

    return y;
  }

  static renderHousesSection(houses: any[], startY: number, doc: any, margins: any): number {
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = startY;
    
    doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(120);
    doc.text('HOUSE CUSPS', margins.left, y);
    y += 8;

    if (!houses || houses.length === 0) {
      doc.setFontSize(9).setFont('helvetica', 'italic').setTextColor(150);
      doc.text('No house data available.', margins.left, y);
      return y + 7;
    }

    doc.setFontSize(9).setFont('helvetica', 'bold').setTextColor(120);
    doc.text('House', margins.left, y);
    doc.text('Cusp Position', margins.left + 80, y);
    y += 7;

    doc.setFontSize(9).setFont('helvetica', 'normal').setTextColor(40);
    Object.entries(houses).forEach(([number, data]: [string, any]) => {
      if (y > pageHeight - 25) {
        doc.addPage();
        y = margins.top;
      }
      
      doc.text(`House ${number}`, margins.left, y);
      const position = `${data.deg.toFixed(2)}° in ${data.sign}`;
      doc.text(position, margins.left + 80, y);
      y += 7;
    });

    return y;
  }
}


// ─── SUPABASE CLIENT ──────────────────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ─── MAIN WORK ────────────────────────────────────────────────────────────────
async function processGuestReportPdf(guestReportId: string, requestId: string, recipientEmail?: string) {
  const log = (msg: string) => console.log(`[process-guest-report-pdf][${requestId}] ${msg}`);

  // FIRST THING: Mark that the edge function was called
  try {
    await supabase
      .from("guest_reports")
      .update({ edge_function_confirmed: true })
      .eq("id", guestReportId);
    log("Edge function confirmed in database");
  } catch (error) {
    log(`Failed to confirm edge function call: ${error}`);
  }

  // 1. fetch report data
  const { data: gr, error } = await supabase
    .from("guest_reports")
    .select("id, email, report_type, created_at, email_sent, email_sent_at, report_data")
    .eq("id", guestReportId)
    .single();
  if (error || !gr) throw new Error(`Guest report not found: ${error?.message}`);

  // 2. fetch report content from report_logs where user_id = guestReportId
  const { data: reportLog, error: reportLogError } = await supabase
    .from("report_logs")
    .select("report_text")
    .eq("user_id", guestReportId)
    .single();
  
  if (reportLogError) {
    log(`Report content not found for ${guestReportId}, proceeding with astro-only PDF.`);
  }

  // 3. fetch astro data from translator_logs
  const { data: astroLog, error: astroLogError } = await supabase
    .from("translator_logs")
    .select("swiss_data")
    .eq("user_id", guestReportId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (astroLogError) {
    log(`Astro data not found for ${guestReportId}, proceeding with text-only PDF.`);
  }
  
  const reportContent = reportLog?.report_text;
  const astroData = astroLog?.swiss_data;

  if (!reportContent && !astroData) {
      throw new Error("No content available to generate PDF (neither AI text nor Astro data found).");
  }
  if (gr.email_sent) { log("Email already sent – skipping"); return { skipped:true, sentAt: gr.email_sent_at }; }

  // 4. generate PDF
  const pdfBase64 = ServerPdfGenerator.generateReportPdf({
    id: gr.id,
    content: reportContent,
    astroData: astroData,
    generatedAt: new Date(gr.created_at).toLocaleDateString(),
    reportType: gr.report_type,
    customerName: gr.report_data?.name || gr.report_data?.person_a?.name || gr.email,
  }, requestId);
  if (!pdfBase64) throw new Error("PDF generation failed");
  
  log(`PDF generated successfully, size: ${pdfBase64.length} chars`);

  // 5. Save PDF to database
  try {
    await supabase
      .from("guest_reports")
      .update({ report_pdf_data: pdfBase64 })
      .eq("id", guestReportId);
    log("PDF data saved to database");
  } catch (error) {
    log(`Failed to save PDF to database: ${error}`);
    throw new Error(`Failed to save PDF: ${error}`);
  }

  const filename = `energetic-report-${gr.report_type}-${gr.id.substring(0,8)}.pdf`;

  // 4. fetch email template
  const { data: tmpl, error: tmplErr } = await supabase
    .from("email_notification_templates")
    .select("subject, body_html, body_text")
    .eq("template_type", "report_delivery")
    .single();
  if (tmplErr || !tmpl) throw new Error(`Template fetch failed: ${tmplErr?.message}`);

  // 5. build payload for send-email edge-function
  const emailPayload = {
    template_type: "report_delivery",      // easier debugging / future use
    to: recipientEmail || gr.email,
    subject: tmpl.subject,
    html: tmpl.body_html,
    text: tmpl.body_text ?? "",
    from: "Theria Astro <no-reply@theraiastro.com>",
    attachments: [{
      filename,
      content: pdfBase64,
      mimetype: "application/pdf",
      encoding: "base64",
    }],
  };

  // 6. Call send-email edge-function directly
  const sendEmailUrl = `${SUPABASE_URL}/functions/v1/send-email`;
  log(`Calling send-email function at: ${sendEmailUrl}`);
  
  const res = await fetch(sendEmailUrl, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`
    },
    body: JSON.stringify(emailPayload),
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    log(`send-email failed: ${res.status} ${errorText}`);
    throw new Error(`send-email failed: ${res.status} ${errorText}`);
  }

  log("Email sent successfully via send-email function");

  // 7. mark as sent
  await supabase.from("guest_reports")
    .update({ email_sent: true, email_sent_at: new Date().toISOString() })
    .eq("id", guestReportId);

  log("PDF created and email sent successfully");
  return { success: true, filename, pdfSize: pdfBase64.length };
}

// ─── HTTP HANDLER ─────────────────────────────────────────────────────────────
serve(async (req) => {
  // CORS
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST")    return new Response(
    JSON.stringify({ error: "Method not allowed" }),
    { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );

  const requestId = crypto.randomUUID().substring(0,8);

  try {
    const { guest_report_id, email } = await req.json();
    if (!guest_report_id) return new Response(
      JSON.stringify({ error: "guest_report_id required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

    const result = await processGuestReportPdf(guest_report_id, requestId, email);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      requestId,
      error: err instanceof Error ? err.message : String(err),
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

console.log("[process-guest-report-pdf] Ready");
