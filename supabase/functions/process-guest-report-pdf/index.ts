
// ============================================================================
//  process-guest-report-pdf.ts
//  Generates a PDF for a guest report and forwards a full email payload
//  (template name, rendered HTML/text, + attachments) to the send-email
//  edge-function.  No direct SMTP interaction lives here any more.
// ============================================================================

// @deno-types="https://esm.sh/@types/jspdf@2.5.1"
import jsPDF from "https://esm.sh/jspdf@2.5.1";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SharedReportParser } from "../_shared/reportParser.ts";

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

    // ── metadata + header
    doc.setProperties({
      title: "Essence Professional",
      subject: "Client Energetic Insight",
      author: "Theria Astro",
      creator: "PDF Generator Service",
    });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const m = { top: 20, right: 20, bottom: 20, left: 20 };

    doc.setFontSize(26).setFont("times", "bold").text("Therai.", pageW/2, 32, { align: "center" });
    
    // Use report type for title if available
    const reportTitle = ServerPdfGenerator.getReportTitle(reportData.reportType);
    doc.setFontSize(20).setFont("helvetica", "bold")
       .text(reportTitle, pageW/2, 48, { align: "center" });

    // ── meta
    let y = 60;
    doc.setFontSize(10).setFont("helvetica", "normal").setTextColor(100);
    doc.text("Report ID:", m.left, y);
    doc.setFont("helvetica", "bold")
       .text(reportData.id.substring(0,8), m.left+40, y);
    y += 6;
    doc.setFont("helvetica", "normal").text("Generated At:", m.left, y);
    doc.setFont("helvetica", "bold").text(reportData.generatedAt, m.left+40, y);
    y += 18;
    doc.setFontSize(13).setFont("helvetica", "bold").setTextColor(75,63,114);
    doc.text("Client Energetic Insight", m.left, y);

    // ── body using shared parser
    const blocks = SharedReportParser.parseReport(reportData.content);
    doc.setFontSize(11).setFont("helvetica", "normal").setTextColor(33);
    let lineY = y + 12;
    const lineH = 7.2, headingGap = 10, footerPad = 20;
    const newPage = () => { doc.addPage(); lineY = m.top; };
    const ensure = (extra=0) => (lineY + extra > pageH - footerPad) && newPage();

    for (const b of blocks) {
      switch (b.type) {
        case "heading":
          lineY += headingGap; ensure(lineH);
          doc.setFont("helvetica", "bold").setTextColor(40,40,60)
             .text(b.text, m.left, lineY);
          doc.setFont("helvetica", "normal").setTextColor(33);
          lineY += lineH; break;
        case "action": {
          const wrap = doc.splitTextToSize(b.text, pageW - m.left - m.right - 5);
          wrap.forEach(l => { ensure(lineH); doc.text(l, m.left+5, lineY); lineY+=lineH; });
          lineY += 2; break;
        }
        case "tag":
          ensure(lineH); doc.setTextColor(60).text(b.text, m.left+5, lineY);
          doc.setTextColor(33); lineY += lineH; break;
        case "spacer": lineY += lineH; break;
        default: {
          const wrap = doc.splitTextToSize(b.text, pageW - m.left - m.right);
          wrap.forEach(l => { ensure(lineH); doc.text(l, m.left, lineY); lineY+=lineH; });
          lineY += 2; break;
        }
      }
    }
    // footer
    if (lineY + 15 < pageH) {
      doc.setFontSize(9).setFont("helvetica","italic").setTextColor(120)
         .text("www.theraiastro.com", pageW/2, pageH-15, { align:"center" });
    }

    // ── return base-64
    const dataUri = doc.output("datauristring");
    return dataUri.split(",")[1] ?? "";
  }

  static getReportTitle(reportType?: string): string {
    if (!reportType) return "Intelligence Report";
    
    const reportTitles: Record<string, string> = {
      'essence': 'Astro Data',
      'sync': 'Compatibility', 
      'focus': 'Focus',
      'flow': 'Professional',
      'mindset': 'The Self Personal',
      'monthly': 'Relational'
    };
    
    return reportTitles[reportType.toLowerCase()] || "Intelligence Report";
  }
}

// ─── SUPABASE CLIENT ──────────────────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ─── MAIN WORK ────────────────────────────────────────────────────────────────
async function processGuestReportPdf(guestReportId: string, requestId: string) {
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

  // 1. fetch report with joins to get content from report_logs
  const { data: gr, error } = await supabase
    .from("guest_reports")
    .select(`
      id, email, report_type, created_at, email_sent,
      report_logs!report_log_id(report_text)
    `)
    .eq("id", guestReportId)
    .single();
  if (error || !gr) throw new Error(`Guest report not found: ${error?.message}`);

  const reportContent = gr.report_logs?.report_text;
  if (!reportContent) throw new Error("Report content empty - no linked report_logs entry");
  if (gr.email_sent) { log("Email already sent – skipping"); return { skipped:true }; }

  // 2. generate PDF
  const pdfBase64 = ServerPdfGenerator.generateReportPdf({
    id: gr.id,
    content: reportContent,
    generatedAt: new Date(gr.created_at).toLocaleDateString(),
    reportType: gr.report_type,
  }, requestId);
  if (!pdfBase64) throw new Error("PDF generation failed");
  
  log(`PDF generated successfully, size: ${pdfBase64.length} chars`);

  // 3. Save PDF to database
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
    to: gr.email,
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
    .update({ email_sent: true })
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
    const { guest_report_id } = await req.json();
    if (!guest_report_id) return new Response(
      JSON.stringify({ error: "guest_report_id required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

    const result = await processGuestReportPdf(guest_report_id, requestId);
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
